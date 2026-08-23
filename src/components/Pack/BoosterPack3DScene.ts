import * as THREE from 'three';
import { BoosterPackConfig } from '../../config/gameConfig';

/**
 * Generates ultra-realistic 3D booster pack geometry:
 * - Crisp physical sawteeth on top & bottom seals
 * - Compact realistic punch hole
 * - Authentic 3D physical puff volume with realistic foil pouch curvature
 */
export function createBoosterPackGeometry(
  width = 3.2,
  height = 4.8,
  toothCount = 38,
  isBack = false
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfH = height / 2;
  const toothWidth = width / toothCount;
  const toothDepth = 0.04; // Sleek, authentic sawtooth height

  // Start at bottom-left inner corner
  shape.moveTo(-halfW, -halfH + toothDepth);

  // Left vertical edge
  shape.lineTo(-halfW, halfH - toothDepth);

  // Top zigzag teeth (slim, compact)
  for (let i = 0; i < toothCount; i++) {
    const x1 = -halfW + i * toothWidth + toothWidth / 2;
    const y1 = halfH;
    const x2 = -halfW + (i + 1) * toothWidth;
    const y2 = halfH - toothDepth;
    shape.lineTo(x1, y1);
    shape.lineTo(x2, y2);
  }

  // Right vertical edge
  shape.lineTo(halfW, -halfH + toothDepth);

  // Bottom zigzag teeth
  for (let i = toothCount - 1; i >= 0; i--) {
    const x1 = -halfW + i * toothWidth + toothWidth / 2;
    const y1 = -halfH;
    const x2 = -halfW + i * toothWidth;
    const y2 = -halfH + toothDepth;
    shape.lineTo(x1, y1);
    shape.lineTo(x2, y2);
  }

  // Realistic small circular punch hole in top header
  const holePath = new THREE.Path();
  const holeRadius = 0.085;
  const holeY = halfH - 0.32;
  holePath.absarc(0, holeY, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  // High tessellation shape geometry
  const geometry = new THREE.ShapeGeometry(shape, 32);
  const pos = geometry.attributes.position;
  const uvs: number[] = [];

  const topCrimpBound = halfH - 0.44;
  const bottomCrimpBound = -halfH + 0.38;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    const u = (x + halfW) / width;
    const v = (y + halfH) / height;
    uvs.push(u, v);

    const normX = x / halfW; // [-1, 1]
    const isTopCrimp = y > topCrimpBound;
    const isBottomCrimp = y < bottomCrimpBound;

    let z = 0;
    if (!isTopCrimp && !isBottomCrimp) {
      // Natural 3D foil pouch puff (cards stuffed inside)
      const domeX = Math.cos(normX * (Math.PI / 2));
      const domeY = Math.sin(((y - bottomCrimpBound) / (topCrimpBound - bottomCrimpBound)) * Math.PI);
      const puff = domeX * domeY * 0.28;

      // Subtle organic surface curvature
      const microCurve = Math.sin(normX * 6.0 + y * 4.0) * 0.012 * (1 - Math.abs(normX) * 0.5);
      z = isBack ? -(puff * 0.85) : (puff + microCurve);
    } else {
      z = isBack ? -0.004 : 0.004;
    }

    pos.setZ(i, z);
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Generates natural physical foil wrinkles & vertical crimp normal maps (realistic foil pouch creases)
 */
export function generateFoilNormalMap(packCode = 'NX-01'): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Realistic foil wrinkle parameters per pack
  const params: Record<string, { crimpFreq: number; w1: number; w2: number }> = {
    'NX-01': { crimpFreq: 76, w1: 5.4, w2: 8.2 },
    'NX-02': { crimpFreq: 68, w1: 4.2, w2: 6.5 },
    'NX-03': { crimpFreq: 82, w1: 6.8, w2: 9.6 },
    'NX-04': { crimpFreq: 74, w1: 5.8, w2: 7.8 },
  };

  const { crimpFreq, w1, w2 } = params[packCode] || params['NX-01'];

  for (let y = 0; y < size; y++) {
    const ny = y / size;
    const isTop = ny < 0.09;
    const isBottom = ny > 0.92;

    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const idx = (y * size + x) * 4;

      let height = 0.5;

      if (isTop || isBottom) {
        // Crisp vertical mechanical crimp lines
        height += Math.sin(nx * Math.PI * crimpFreq) * 0.28;
      } else {
        // Natural foil packaging tension creases (criss-cross fine folds)
        const c1 = Math.sin((nx * w1 + ny * w2) * Math.PI) * 0.048;
        const c2 = Math.cos((nx * w2 - ny * w1) * Math.PI) * 0.038;
        const c3 = Math.sin((nx * 14.0 + ny * 11.0) * Math.PI) * 0.018;
        
        // Edge pull wrinkles
        const edgeDist = Math.min(nx, 1 - nx);
        const edgeCrease = Math.sin(ny * 24.0 * Math.PI) * Math.exp(-edgeDist * 6.5) * 0.045;

        height += c1 + c2 + c3 + edgeCrease;
      }

      const nxVal = Math.floor(128 + (height - 0.5) * 80);
      const nyVal = Math.floor(128 + (height - 0.5) * 80);

      data[idx] = Math.max(0, Math.min(255, nxVal));
      data[idx + 1] = Math.max(0, Math.min(255, nyVal));
      data[idx + 2] = 255;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates high-resolution, crystal-clear 100% authentic booster pack texture:
 * - Smart aspect ratio handling with seamless gradient fade blending
 * - Border boxes completely removed; typography is clean and harmoniously proportioned
 * - Diagonal metallic sheen and vinyl foil texture overlay
 */
export function createPackColorTexture(pack: BoosterPackConfig): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const width = 1536;
    const height = 2304;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Solid Clean Studio Foil Base
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(0, 0, width, height);

    // 2. Load original image and render with ZERO cropping & aspect preservation
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const topCrimpHeight = height * 0.08; // ~184px
      const bottomCrimpHeight = height * 0.075; // ~172px
      const usableY = topCrimpHeight;
      const usableHeight = height - topCrimpHeight - bottomCrimpHeight;

      const imgAspect = img.width / img.height;

      // Draw background ambient color bleed from image
      ctx.save();
      if (pack.code === 'NX-01') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0a0d18');
        bgGrad.addColorStop(0.3, '#10172e');
        bgGrad.addColorStop(0.7, '#151c38');
        bgGrad.addColorStop(1, '#090b14');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (pack.code === 'NX-03') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#04101e');
        bgGrad.addColorStop(0.3, '#0c2340');
        bgGrad.addColorStop(0.7, '#172554');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#180e04');
        bgGrad.addColorStop(0.5, '#2e1208');
        bgGrad.addColorStop(1, '#0a0704');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();

      if (imgAspect >= 0.85) {
        // Square or landscape artwork (e.g. NX-01 640x640 or NX-03 3000x3000)
        // 1. Position directly below top crimp seal with ZERO top background gap
        const drawWidth = width;
        const drawHeight = width / imgAspect; // 1536px for 1:1
        const drawY = topCrimpHeight; // Flush directly against the top crimp seal

        // Draw main artwork with 100% clarity & NO cropping
        ctx.drawImage(img, 0, drawY, drawWidth, drawHeight);

        // 🌟 2. Seamless Gradient Fade Mask at Bottom Edge of Artwork
        // Blends image smoothly into deep background without a harsh cut line
        const fadeHeight = 180;
        const fadeStartY = drawY + drawHeight - fadeHeight;
        const fadeGrad = ctx.createLinearGradient(0, fadeStartY, 0, drawY + drawHeight + 10);
        if (pack.code === 'NX-01') {
          fadeGrad.addColorStop(0, 'rgba(16, 23, 46, 0)');
          fadeGrad.addColorStop(0.4, 'rgba(16, 23, 46, 0.45)');
          fadeGrad.addColorStop(0.75, 'rgba(16, 23, 46, 0.85)');
          fadeGrad.addColorStop(1, 'rgba(16, 23, 46, 1.0)');
        } else {
          fadeGrad.addColorStop(0, 'rgba(12, 35, 64, 0)');
          fadeGrad.addColorStop(0.4, 'rgba(12, 35, 64, 0.45)');
          fadeGrad.addColorStop(0.75, 'rgba(12, 35, 64, 0.85)');
          fadeGrad.addColorStop(1, 'rgba(12, 35, 64, 1.0)');
        }
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, fadeStartY, width, fadeHeight + 20);

        // 🌟 3. Clean, Harmonious Bottom Typography (NO BOXES!)
        const bottomAreaY = drawY + drawHeight - 40; // ~1680px

        // Metallic Divider Accent Line
        const lineGrad = ctx.createLinearGradient(width * 0.12, 0, width * 0.88, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.3, pack.code === 'NX-01' ? '#fde047' : '#38bdf8');
        lineGrad.addColorStop(0.7, pack.code === 'NX-01' ? '#38bdf8' : '#e0e7ff');
        lineGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width * 0.12, bottomAreaY + 10);
        ctx.lineTo(width * 0.88, bottomAreaY + 10);
        ctx.stroke();

        // High-end Large Metallic Album Title
        const albumTitle = pack.name.includes(' - ') ? pack.name.split(' - ')[1] : pack.name;
        ctx.font = '900 78px "Cinzel", "Times New Roman", serif';
        
        // Metallic Gradient for Text
        const titleGrad = ctx.createLinearGradient(0, bottomAreaY + 35, 0, bottomAreaY + 115);
        if (pack.code === 'NX-01') {
          titleGrad.addColorStop(0, '#ffffff');
          titleGrad.addColorStop(0.45, '#fef08a');
          titleGrad.addColorStop(1, '#f59e0b');
        } else {
          titleGrad.addColorStop(0, '#ffffff');
          titleGrad.addColorStop(0.45, '#bae6fd');
          titleGrad.addColorStop(1, '#38bdf8');
        }
        ctx.fillStyle = titleGrad;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
        ctx.shadowBlur = 20;
        ctx.fillText(albumTitle, width / 2, bottomAreaY + 88);

        // Subtitle Slogan (Refined Tracking & Proportion)
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = pack.code === 'NX-01' ? '#38bdf8' : '#93c5fd';
        ctx.shadowBlur = 12;
        const subText = pack.code === 'NX-01'
          ? 'NMIXX 2ND EP  •  BREAK THE BOUNDARIES'
          : 'NMIXX SPECIAL COLLECTION  •  SWEET MELODY';
        ctx.fillText(subText, width / 2, bottomAreaY + 140);

        // 🌟 TCG Official Spec Text (Cleanly exposed with NO border box)
        ctx.font = 'bold 26px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.fillText(`전 ${pack.totalCards}종 + 특수 레어  •  1팩 5장입  •  BOOSTER PACK`, width / 2, bottomAreaY + 195);
      } else {
        // Portrait artwork (e.g. NX-02 or NX-04)
        ctx.drawImage(img, 0, usableY, width, usableHeight);
      }

      // 4. Subtle Metallic Sheen & Foil Wrinkle Overlay across the whole pack
      const foilSheen = ctx.createLinearGradient(0, 0, width, height);
      foilSheen.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      foilSheen.addColorStop(0.25, 'rgba(255, 255, 255, 0.14)');
      foilSheen.addColorStop(0.45, 'rgba(0, 0, 0, 0.06)');
      foilSheen.addColorStop(0.65, 'rgba(255, 255, 255, 0.12)');
      foilSheen.addColorStop(0.85, 'rgba(255, 255, 255, 0.06)');
      foilSheen.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
      ctx.fillStyle = foilSheen;
      ctx.fillRect(0, 0, width, height);

      // 5. Realistic Aluminum Foil Crimp Seals on Top & Bottom
      // Top Silver Foil Crimp Bar
      const topGrad = ctx.createLinearGradient(0, 0, 0, topCrimpHeight);
      topGrad.addColorStop(0, '#64748b');
      topGrad.addColorStop(0.3, '#cbd5e1');
      topGrad.addColorStop(0.6, '#94a3b8');
      topGrad.addColorStop(1, '#334155');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, topCrimpHeight);

      // Bottom Silver Foil Crimp Bar
      const bottomGrad = ctx.createLinearGradient(0, height - bottomCrimpHeight, 0, height);
      bottomGrad.addColorStop(0, '#334155');
      bottomGrad.addColorStop(0.4, '#94a3b8');
      bottomGrad.addColorStop(0.7, '#cbd5e1');
      bottomGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, height - bottomCrimpHeight, width, bottomCrimpHeight);

      // Subtle Metallic Rim Lighting along borders
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, topCrimpHeight, width - 8, height - topCrimpHeight - bottomCrimpHeight);

      // 6. Minimal, Ultra-Clean Top Branding with High-Contrast Glassmorphic Capsules
      const badgeY = topCrimpHeight + 16;
      const textY = badgeY + 44;

      const packThemeMap: Record<string, { codeColor: string; brandColor: string }> = {
        'NX-01': {
          codeColor: '#fde047', // Bold Electric Gold
          brandColor: '#38bdf8', // Neon Sky Cyan
        },
        'NX-02': {
          codeColor: '#fbbf24', // Warm Amber Gold
          brandColor: '#fb7185', // Rose Coral
        },
        'NX-03': {
          codeColor: '#67e8f9', // Ice Aqua
          brandColor: '#ffffff', // Crisp Silver White
        },
        'NX-04': {
          codeColor: '#f43f5e', // Hot Cyber Magenta
          brandColor: '#c084fc', // Electric Violet
        },
      };

      const theme = packThemeMap[pack.code] || packThemeMap['NX-01'];

      // Left: Pack Code Badge [NX-01]
      const leftBadgeText = `[${pack.code}]`;
      ctx.font = '900 46px monospace';
      const leftW = ctx.measureText(leftBadgeText).width + 36;
      ctx.fillStyle = 'rgba(10, 13, 24, 0.85)';
      ctx.strokeStyle = theme.codeColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(40, badgeY, leftW, 60, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.codeColor;
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 12;
      ctx.fillText(leftBadgeText, 58, textY);

      // Right: Brand Badge NMIXX TCG
      const rightBadgeText = 'NMIXX TCG';
      ctx.font = '900 38px sans-serif';
      const rightW = ctx.measureText(rightBadgeText).width + 36;
      ctx.fillStyle = 'rgba(10, 13, 24, 0.85)';
      ctx.strokeStyle = theme.brandColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(width - 40 - rightW, badgeY, rightW, 60, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.brandColor;
      ctx.textAlign = 'right';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 12;
      ctx.fillText(rightBadgeText, width - 58, textY);

      // 7. Minimal Copyright on bottom crimp
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 6;
      ctx.fillText('© JYP ENTERTAINMENT. ALL RIGHTS RESERVED', width / 2, height - 42);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = 16;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      resolve(texture);
    };

    img.onerror = () => {
      const texture = new THREE.CanvasTexture(canvas);
      resolve(texture);
    };

    img.src = pack.image;
  });
}
