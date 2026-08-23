import * as THREE from 'three';
import { BoosterPackConfig } from '../../config/gameConfig';

/**
 * Generates a high-precision 3D booster pack geometry with:
 * 1. Physical zigzag crimped top & bottom edges (sawteeth)
 * 2. Punch hole (hanger hole) cut in top area
 * 3. 3D pillowing/puffing displacement in the pack center
 */
export function createBoosterPackGeometry(width = 3.2, height = 4.8, toothCount = 28): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfH = height / 2;
  const toothWidth = width / toothCount;
  const toothDepth = 0.09; // height of each sawtooth

  // Start at bottom-left inner corner
  shape.moveTo(-halfW, -halfH + toothDepth);

  // Left vertical edge
  shape.lineTo(-halfW, halfH - toothDepth);

  // Top zigzag teeth
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

  // Add Hanger Hole in top center
  const holePath = new THREE.Path();
  const holeRadius = 0.18;
  const holeY = halfH - 0.72;
  holePath.absarc(0, holeY, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  // Generate Shape Geometry with fine curve segments
  const geometry = new THREE.ShapeGeometry(shape, 24);

  // Add UVs & Vertex Displacement for realistic foil volume (pillow puff in center + flat seals)
  const pos = geometry.attributes.position;
  const uvs: number[] = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    // Compute normalized UV [0, 1]
    const u = (x + halfW) / width;
    const v = (y + halfH) / height;
    uvs.push(u, v);

    // Pillowing displacement: puffy center, flat crimped top and bottom
    const normX = x / halfW; // [-1, 1]
    
    // Crimped band masks
    const isTopCrimp = y > halfH - 0.95;
    const isBottomCrimp = y < -halfH + 0.85;

    let z = 0;
    if (!isTopCrimp && !isBottomCrimp) {
      // Smooth dome curve for pack body fullness
      const domeX = Math.cos(normX * (Math.PI / 2));
      const domeY = Math.sin(((y - (-halfH + 0.85)) / (height - 1.8)) * Math.PI);
      z = domeX * domeY * 0.18; // 3D thickness puff
    } else {
      // Fine vertical crimp ripple
      z = Math.sin(x * 60) * 0.008;
    }

    pos.setZ(i, z);
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Generates procedural normal map for micro-creases, wrinkles and vertical crimp bands
 */
export function generateFoilNormalMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Neutral Normal (128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Generate height map with crimp ridges, organic diagonal wrinkles, and micro-noise
  for (let y = 0; y < size; y++) {
    const ny = y / size; // [0, 1]
    const isTop = ny < 0.20;
    const isBottom = ny > 0.82;

    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const idx = (y * size + x) * 4;

      let height = 0.5;

      if (isTop || isBottom) {
        // High frequency vertical crimp ridges
        const ridge = Math.sin(nx * Math.PI * 56);
        height += ridge * 0.35;
      } else {
        // Organic foil tension wrinkles (criss-crossing diagonals)
        const d1 = Math.sin((nx * 6 + ny * 8) * Math.PI) * 0.08;
        const d2 = Math.sin((nx * 8 - ny * 6) * Math.PI) * 0.06;
        const d3 = Math.sin((nx * 14 + ny * 14) * Math.PI) * 0.04;
        
        // Edge tension creases stretching from sides
        const sideTension = (Math.pow(Math.abs(nx - 0.5) * 2, 3)) * Math.sin(ny * 24 * Math.PI) * 0.12;

        height += d1 + d2 + d3 + sideTension;
      }

      // Convert height gradient to normal
      const nxVal = Math.floor(128 + (Math.sin(nx * 80) * 15) + (height - 0.5) * 120);
      const nyVal = Math.floor(128 + (Math.cos(ny * 80) * 15) + (height - 0.5) * 120);

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
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates high-resolution pack graphic texture using 2D Canvas with iridescent gradient and official typography
 */
export function createPackColorTexture(pack: BoosterPackConfig): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const width = 1024;
    const height = 1536;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw Iridescent Holographic Background Gradient matching reference
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (pack.code === 'NX-01') {
      bgGrad.addColorStop(0, '#2b1b54');
      bgGrad.addColorStop(0.25, '#38bdf8');
      bgGrad.addColorStop(0.5, '#ec4899');
      bgGrad.addColorStop(0.75, '#8b5cf6');
      bgGrad.addColorStop(1, '#1e1b4b');
    } else if (pack.code === 'NX-02') {
      bgGrad.addColorStop(0, '#451a03');
      bgGrad.addColorStop(0.25, '#f59e0b');
      bgGrad.addColorStop(0.5, '#ec4899');
      bgGrad.addColorStop(0.75, '#8b5cf6');
      bgGrad.addColorStop(1, '#1e1b4b');
    } else if (pack.code === 'NX-03') {
      bgGrad.addColorStop(0, '#0c4a6e');
      bgGrad.addColorStop(0.25, '#38bdf8');
      bgGrad.addColorStop(0.5, '#6366f1');
      bgGrad.addColorStop(0.75, '#a855f7');
      bgGrad.addColorStop(1, '#0f172a');
    } else {
      bgGrad.addColorStop(0, '#4c0519');
      bgGrad.addColorStop(0.25, '#a855f7');
      bgGrad.addColorStop(0.5, '#ec4899');
      bgGrad.addColorStop(0.75, '#3b82f6');
      bgGrad.addColorStop(1, '#18181b');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Load and draw Cover Image in the center with blending
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.drawImage(img, 0, height * 0.16, width, height * 0.62);
      ctx.restore();

      // Metallic sheen overlay
      const sheenGrad = ctx.createLinearGradient(0, 0, width, height);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      sheenGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.25)');
      sheenGrad.addColorStop(0.6, 'rgba(236, 72, 153, 0.3)');
      sheenGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.4)');
      sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(0, 0, width, height);

      // Top/Bottom crimp shading
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, width, height * 0.16);
      ctx.fillRect(0, height * 0.84, width, height * 0.16);

      // 3. Render Top Metadata
      ctx.font = '900 38px monospace';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'left';
      ctx.fillText(`[${pack.code}]`, 60, 130);

      ctx.font = '900 28px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText('JYP / MIXX', width - 60, 115);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('ENTERTAINMENT', width - 60, 148);

      // 4. Render Main Title (2-Line Format)
      ctx.textAlign = 'center';
      
      // Top pack number
      ctx.font = '900 46px monospace';
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 18;
      ctx.fillText(pack.code.replace('-', ' '), width / 2, height * 0.52);

      // Main album title (Large Metallic Embossed)
      const albumTitle = pack.name.includes(' - ') ? pack.name.split(' - ')[1] : pack.name;
      ctx.font = '900 70px "Cinzel", "Times New Roman", serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 24;
      ctx.fillText(albumTitle, width / 2, height * 0.60);

      // Subtitle
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowBlur = 12;
      ctx.fillText('NMIXX TRADING CARD GAME', width / 2, height * 0.65);

      // 5. Spec Box (Matching Reference Layout)
      const boxW = width * 0.84;
      const boxH = 92;
      const boxX = (width - boxW) / 2;
      const boxY = height * 0.74;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 30px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(`전 ${pack.totalCards}종 + 특수 레어  |  1팩 5장입  |  부스터 팩`, width / 2, boxY + 58);

      // 6. Copyright
      ctx.font = '22px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('© JYP ENTERTAINMENT. MADE IN MIXXTOPIA', width / 2, height * 0.82);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
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
