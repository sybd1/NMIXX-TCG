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
        // Natural foil packaging tension creases
        const c1 = Math.sin((nx * w1 + ny * w2) * Math.PI) * 0.045;
        const c2 = Math.cos((nx * w2 - ny * w1) * Math.PI) * 0.035;
        
        // Edge pull wrinkles
        const edgeDist = Math.min(nx, 1 - nx);
        const edgeCrease = Math.sin(ny * 22.0 * Math.PI) * Math.exp(-edgeDist * 6.0) * 0.04;

        height += c1 + c2 + edgeCrease;
      }

      const nxVal = Math.floor(128 + (height - 0.5) * 75);
      const nyVal = Math.floor(128 + (height - 0.5) * 75);

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
 * - NO fake messy boxes or cluttered text overlays!
 * - 100% crisp, vibrant original artwork fully covering the pack.
 * - Premium authentic aluminum foil top/bottom crimp finish.
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
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, width, height);

    // 2. Load original image and render with 100% FULL SHARPNESS & VIBRANCY
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      // Draw cover image cleanly across the whole front face
      ctx.drawImage(img, 0, height * 0.065, width, height * 0.87);
      ctx.restore();

      // 3. Realistic Aluminum Foil Crimp Seals on Top & Bottom (Pure Silver Metal Shimmer)
      const topCrimpHeight = height * 0.08;
      const bottomCrimpHeight = height * 0.075;

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

      // 4. Subtle Metallic Rim Lighting along borders
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, topCrimpHeight, width - 8, height - topCrimpHeight - bottomCrimpHeight);

      // 5. Minimal, Ultra-Clean Top Branding (Authentic TCG Style)
      ctx.font = '900 42px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(`[${pack.code}]`, 55, 115);

      ctx.font = '900 32px sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'right';
      ctx.fillText('NMIXX TCG', width - 55, 115);

      // 6. Minimal Copyright on bottom crimp
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
