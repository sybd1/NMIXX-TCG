import os
import shutil
import glob
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from tqdm import tqdm

def main():
    base_dir = Path("card-pack-image")
    if not base_dir.exists():
        print(f"Error: Base directory '{base_dir}' does not exist.")
        return

    # 1. Reference 폴더 찾기 (refernce or reference)
    ref_dirs = list(base_dir.glob("*refer*"))
    if not ref_dirs:
        print("Error: Reference directory not found in card-pack-image")
        return
    ref_dir = ref_dirs[0]
    print(f"[*] Reference directory: {ref_dir.resolve()}")

    device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
    print(f"[*] Running Face Recognition on device: {device}")

    # MTCNN 얼굴 검출기 & InceptionResnetV1 특징 추출기
    mtcnn = MTCNN(keep_all=True, min_face_size=25, thresholds=[0.6, 0.7, 0.7], device=device)
    resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

    members = ['bae', 'haewon', 'jiwoo', 'kyujin', 'lilly', 'sullyoon']
    ref_embeddings = {m: [] for m in members}

    print("\n[*] Step 1: Extracting Face Embeddings from Reference Images...")
    valid_exts = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}

    for img_path in ref_dir.glob("*"):
        if img_path.suffix.lower() not in valid_exts:
            continue
        
        stem = img_path.stem.lower()
        matched_member = None
        for m in members:
            if stem.startswith(m):
                matched_member = m
                break
        
        if not matched_member:
            continue

        try:
            img = Image.open(img_path).convert('RGB')
            faces = mtcnn(img)
            if faces is not None and len(faces) > 0:
                face = faces[0].unsqueeze(0).to(device)
                with torch.no_grad():
                    emb = resnet(face).cpu().numpy()[0]
                    emb = emb / np.linalg.norm(emb)
                    ref_embeddings[matched_member].append(emb)
                    print(f"  [+] Enrolled {matched_member.upper():<8} from {img_path.name}")
            else:
                print(f"  [!] No face detected in reference: {img_path.name}")
        except Exception as e:
            print(f"  [!] Error processing reference {img_path.name}: {e}")

    member_avg_emb = {}
    for m in members:
        if ref_embeddings[m]:
            member_avg_emb[m] = np.mean(ref_embeddings[m], axis=0)
            member_avg_emb[m] = member_avg_emb[m] / np.linalg.norm(member_avg_emb[m])
            print(f"[*] Member '{m.upper()}': {len(ref_embeddings[m])} reference vectors enrolled.")
        else:
            print(f"[!] Warning: No references found for '{m}'")

    # 2. 분류 대상 컨셉 폴더 탐색
    print("\n[*] Step 2: Discovering target concept directories...")
    concept_dirs = []
    for root, dirs, files in os.walk(base_dir):
        root_path = Path(root)
        if 'refer' in root_path.name.lower():
            continue
        sub_dir_names = set(dirs)
        if 'bae' in sub_dir_names and 'group-members' in sub_dir_names:
            concept_dirs.append(root_path)

    print(f"[*] Total target concept directories found: {len(concept_dirs)}")

    # 3. 얼굴 인식 및 이미지 분류 실행
    print("\n[*] Step 3: Classifying images by member face recognition...")
    
    classification_stats = {}

    for cdir in concept_dirs:
        rel_concept = str(cdir.relative_to(base_dir))
        stats = {m: 0 for m in members}
        stats['group-members'] = 0
        stats['unclassified'] = 0

        target_files = [f for f in cdir.glob("*") if f.is_file() and f.suffix.lower() in valid_exts]
        
        if not target_files:
            classification_stats[rel_concept] = stats
            continue

        print(f"\nProcessing [{rel_concept}] ({len(target_files)} target images)...")

        for img_file in tqdm(target_files, desc=f"{cdir.name}"):
            try:
                img = Image.open(img_file).convert('RGB')
                
                boxes, probs = mtcnn.detect(img)
                num_faces = 0
                if boxes is not None:
                    valid_boxes = [b for b, p in zip(boxes, probs) if p is not None and p >= 0.75]
                    num_faces = len(valid_boxes)

                if num_faces >= 2:
                    dest = cdir / 'group-members' / img_file.name
                    shutil.move(str(img_file), str(dest))
                    stats['group-members'] += 1
                elif num_faces == 1:
                    faces = mtcnn(img)
                    if faces is not None and len(faces) > 0:
                        face_tensor = faces[0].unsqueeze(0).to(device)
                        with torch.no_grad():
                            emb = resnet(face_tensor).cpu().numpy()[0]
                            emb = emb / np.linalg.norm(emb)

                        best_member = None
                        best_sim = -1.0

                        for m in members:
                            if m not in member_avg_emb:
                                continue
                            sims = [float(np.dot(emb, ref_e)) for ref_e in ref_embeddings[m]]
                            avg_sim = float(np.dot(emb, member_avg_emb[m]))
                            max_sim = max(sims) if sims else avg_sim
                            score = 0.65 * max_sim + 0.35 * avg_sim

                            if score > best_sim:
                                best_sim = score
                                best_member = m

                        if best_member:
                            dest = cdir / best_member / img_file.name
                            shutil.move(str(img_file), str(dest))
                            stats[best_member] += 1
                        else:
                            stats['unclassified'] += 1
                    else:
                        stats['unclassified'] += 1
                else:
                    # 얼굴 미검출 (단독/옆모습 등 추가 완화 감지 시도)
                    mtcnn_loose = MTCNN(keep_all=True, min_face_size=20, thresholds=[0.5, 0.6, 0.6], device=device)
                    loose_faces = mtcnn_loose(img)
                    if loose_faces is not None and len(loose_faces) == 1:
                        face_tensor = loose_faces[0].unsqueeze(0).to(device)
                        with torch.no_grad():
                            emb = resnet(face_tensor).cpu().numpy()[0]
                            emb = emb / np.linalg.norm(emb)
                        
                        best_member = None
                        best_sim = -1.0
                        for m in members:
                            if m not in member_avg_emb: continue
                            sims = [float(np.dot(emb, ref_e)) for ref_e in ref_embeddings[m]]
                            avg_sim = float(np.dot(emb, member_avg_emb[m]))
                            max_sim = max(sims) if sims else avg_sim
                            score = 0.65 * max_sim + 0.35 * avg_sim
                            if score > best_sim:
                                best_sim = score
                                best_member = m
                        if best_member and best_sim >= 0.35:
                            dest = cdir / best_member / img_file.name
                            shutil.move(str(img_file), str(dest))
                            stats[best_member] += 1
                        else:
                            stats['unclassified'] += 1
                    elif loose_faces is not None and len(loose_faces) >= 2:
                        dest = cdir / 'group-members' / img_file.name
                        shutil.move(str(img_file), str(dest))
                        stats['group-members'] += 1
                    else:
                        stats['unclassified'] += 1
            except Exception as e:
                print(f"[!] Error processing {img_file.name}: {e}")
                stats['unclassified'] += 1

        classification_stats[rel_concept] = stats

    # 4. 최종 결과 리포트 출력
    print("\n" + "="*95)
    print(" 🎯 NMIXX Card Pack Image AI Face Classification Summary Report")
    print("="*95)
    
    header = f"{'Concept Directory':<38} | {'Bae':<4} | {'Haewon':<6} | {'Jiwoo':<5} | {'Kyujin':<6} | {'Lilly':<5} | {'Sullyoon':<8} | {'Group':<5} | {'Unclass':<7}"
    print(header)
    print("-" * len(header))

    total_stats = {m: 0 for m in members}
    total_stats['group-members'] = 0
    total_stats['unclassified'] = 0

    for cdir_name, s in classification_stats.items():
        row = f"{cdir_name:<38} | {s['bae']:<4} | {s['haewon']:<6} | {s['jiwoo']:<5} | {s['kyujin']:<6} | {s['lilly']:<5} | {s['sullyoon']:<8} | {s['group-members']:<5} | {s['unclassified']:<7}"
        print(row)
        for k in total_stats:
            total_stats[k] += s[k]

    print("-" * len(header))
    total_row = f"{'TOTAL CLASSIFIED':<38} | {total_stats['bae']:<4} | {total_stats['haewon']:<6} | {total_stats['jiwoo']:<5} | {total_stats['kyujin']:<6} | {total_stats['lilly']:<5} | {total_stats['sullyoon']:<8} | {total_stats['group-members']:<5} | {total_stats['unclassified']:<7}"
    print(total_row)
    print("="*95)

if __name__ == '__main__':
    main()
