import * as THREE from 'three';
import { BoosterPackConfig } from '../../config/gameConfig';

export interface PackMaterialProfile {
  thickness: number; // 3D z-depth puff
  normalScale: number; // wrinkle bump strength
  metalness: number;
  roughness: number;
  iridescence: number;
  iridescenceIOR: number;
  sparkleColor: number;
  rimColor: number;
}

export function getPackProfile(packCode: string): PackMaterialProfile {
  switch (packCode) {
    case 'NX-01':
      return {
        thickness: 0.32,
        normalScale: 0.72,
        metalness: 0.76,
        roughness: 0.24,
        iridescence: 0.55,
        iridescenceIOR: 1.38,
        sparkleColor: 0x38bdf8,
        rimColor: 0xec4899,
      };
    case 'NX-02':
      return {
        thickness: 0.27,
        normalScale: 0.48,
        metalness: 0.70,
        roughness: 0.28,
        iridescence: 0.35,
        iridescenceIOR: 1.25,
        sparkleColor: 0xfacc15,
        rimColor: 0xf59e0b,
      };
    case 'NX-03':
      return {
        thickness: 0.30,
        normalScale: 0.65,
        metalness: 0.78,
        roughness: 0.22,
        iridescence: 0.62,
        iridescenceIOR: 1.42,
        sparkleColor: 0x60a5fa,
        rimColor: 0x38bdf8,
      };
    case 'NX-04':
    default:
      return {
        thickness: 0.34,
        normalScale: 0.80,
        metalness: 0.75,
        roughness: 0.25,
        iridescence: 0.48,
        iridescenceIOR: 1.32,
        sparkleColor: 0xe879f9,
        rimColor: 0xa855f7,
      };
  }
}

/**
 * Generates a high-precision 3D booster pack geometry with substantial thickness & asymmetric pillow volume
 */
export function createBoosterPackGeometry(
  packCode = 'NX-01',
  width = 3.2,
  height = 4.8,
  toothCount = 36,
  isBack = false
): THREE.BufferGeometry {
  const profile = getPackProfile(packCode);
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfH = height / 2;
  const toothWidth = width / toothCount;
  const toothDepth = 0.045; // Compact realistic sawteeth

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

  // Punch Hole in top center
  const holePath = new THREE.Path();
  const holeRadius = 0.095;
  const holeY = halfH - 0.36;
  holePath.absarc(0, holeY, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  // Generate Shape Geometry
  const geometry = new THREE.ShapeGeometry(shape, 32);
  const pos = geometry.attributes.position;
  const uvs: number[] = [];

  const topCrimpBound = halfH - 0.48;
  const bottomCrimpBound = -halfH + 0.42;

  // Randomized seed based on pack
  const seed = packCode === 'NX-01' ? 1.1 : packCode === 'NX-02' ? 2.3 : packCode === 'NX-03' ? 3.7 : 4.9;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    const u = (x + halfW) / width;
    const v = (y + halfH) / height;
    uvs.push(u, v);

    const normX = x / halfW; // [-1, 1]
    const normY = y / halfH; // [-1, 1]

    const isTopCrimp = y > topCrimpBound;
    const isBottomCrimp = y < bottomCrimpBound;

    let z = 0;
    if (!isTopCrimp && !isBottomCrimp) {
      // Substantial 3D thickness puff with asymmetric organic curvature
      const asymX = normX * 0.92 + 0.08 * Math.sin(seed);
      const domeX = Math.cos(Math.min(Math.max(asymX, -1), 1) * (Math.PI / 2));
      const domeY = Math.sin(((y - bottomCrimpBound) / (topCrimpBound - bottomCrimpBound)) * Math.PI);
      
      const basePuff = domeX * domeY * profile.thickness;

      // Pack-specific unique organic wave folds
      const organicWave = (
        Math.sin(normX * (7.0 + seed) + normY * (5.0 + seed)) * 0.022 +
        Math.cos(normX * (11.0 - seed) - normY * (8.0 + seed)) * 0.015
      ) * (1 - Math.abs(normX) * 0.4);

      z = isBack ? -(basePuff * 0.85 + organicWave * 0.5) : (basePuff + organicWave);
    } else {
      z = isBack ? -0.005 : 0.005;
    }

    pos.setZ(i, z);
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Generates pack-specific randomized procedural normal map for distinct wrinkle patterns
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

  // Pack-specific frequency parameters
  const freqMap: Record<string, { f1: number; f2: number; f3: number; crimp: number; tensionPow: number }> = {
    'NX-01': { f1: 6.2, f2: 10.4, f3: 18.0, crimp: 72, tensionPow: 2.2 },
    'NX-02': { f1: 4.0, f2: 6.8, f3: 12.0, crimp: 64, tensionPow: 1.8 },
    'NX-03': { f1: 8.5, f2: 14.2, f3: 24.0, crimp: 80, tensionPow: 2.8 },
    'NX-04': { f1: 5.5, f2: 12.0, f3: 16.5, crimp: 76, tensionPow: 2.5 },
  };

  const { f1, f2, f3, crimp, tensionPow } = freqMap[packCode] || freqMap['NX-01'];

  for (let y = 0; y < size; y++) {
    const ny = y / size;
    const isTop = ny < 0.10;
    const isBottom = ny > 0.91;

    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const idx = (y * size + x) * 4;

      let height = 0.5;

      if (isTop || isBottom) {
        const ridge = Math.sin(nx * Math.PI * crimp);
        height += ridge * 0.32;
      } else {
        const d1 = Math.sin((nx * f1 + ny * f2) * Math.PI + Math.cos(nx * f3 * 0.5)) * 0.07;
        const d2 = Math.cos((nx * f2 - ny * f1) * Math.PI) * 0.05;
        const d3 = Math.sin((nx * f3 + ny * f3 * 0.8) * Math.PI) * 0.03;
        
        const cornerDist = Math.hypot(nx - 0.5, ny - 0.5);
        const tension = Math.sin(cornerDist * (f2 * 2.0) * Math.PI) * Math.pow(1 - cornerDist, tensionPow) * 0.05;
        const micro = (Math.sin(nx * 140) * Math.cos(ny * 140)) * 0.015;

        height += d1 + d2 + d3 + tension + micro;
      }

      const nxVal = Math.floor(128 + (height - 0.5) * 95);
      const nyVal = Math.floor(128 + (height - 0.5) * 95);

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
 * Creates high-resolution pack graphic texture with 100% crystal-clear cover artwork
 */
export function createPackColorTexture(pack: BoosterPackConfig): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const width = 1536;
    const height = 2304;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw Iridescent Holographic Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (pack.code === 'NX-01') {
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(0.20, '#0284c7');
      bgGrad.addColorStop(0.50, '#db2777');
      bgGrad.addColorStop(0.80, '#7c3aed');
      bgGrad.addColorStop(1, '#0f172a');
    } else if (pack.code === 'NX-02') {
      bgGrad.addColorStop(0, '#451a03');
      bgGrad.addColorStop(0.20, '#d97706');
      bgGrad.addColorStop(0.50, '#e11d48');
      bgGrad.addColorStop(0.80, '#9333ea');
      bgGrad.addColorStop(1, '#1e1b4b');
    } else if (pack.code === 'NX-03') {
      bgGrad.addColorStop(0, '#082f49');
      bgGrad.addColorStop(0.20, '#0284c7');
      bgGrad.addColorStop(0.50, '#4f46e5');
      bgGrad.addColorStop(0.80, '#9333ea');
      bgGrad.addColorStop(1, '#020617');
    } else {
      bgGrad.addColorStop(0, '#4c0519');
      bgGrad.addColorStop(0.20, '#9333ea');
      bgGrad.addColorStop(0.50, '#db2777');
      bgGrad.addColorStop(0.80, '#2563eb');
      bgGrad.addColorStop(1, '#09090b');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Load and draw Cover Image with 100% MAXIMUM CLARITY
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      // Razor-sharp 100% opacity cover art
      ctx.globalAlpha = 0.98;
      ctx.drawImage(img, 0, height * 0.08, width, height * 0.78);
      ctx.restore();

      // Delicate edge-only vignette for rich contrast without washing out the center
      const edgeVignette = ctx.createLinearGradient(0, 0, 0, height);
      edgeVignette.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      edgeVignette.addColorStop(0.08, 'rgba(0, 0, 0, 0)');
      edgeVignette.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
      edgeVignette.addColorStop(0.72, 'rgba(0, 0, 0, 0.65)');
      edgeVignette.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = edgeVignette;
      ctx.fillRect(0, 0, width, height);

      // Slim top & bottom crimp shading
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, width, height * 0.085);
      ctx.fillRect(0, height * 0.915, width, height * 0.085);

      // 3. Render Top Metadata
      ctx.font = '900 48px monospace';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 14;
      ctx.fillText(`[${pack.code}]`, 65, 125);

      ctx.font = '900 36px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText('JYP / MIXX', width - 65, 105);
      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('ENTERTAINMENT', width - 65, 142);

      // 4. Render Main Title (2-Line Format)
      ctx.textAlign = 'center';
      
      // Top pack number
      ctx.font = '900 62px monospace';
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 20;
      ctx.fillText(pack.code.replace('-', ' '), width / 2, height * 0.54);

      // Main album title (Large Metallic Embossed)
      const albumTitle = pack.name.includes(' - ') ? pack.name.split(' - ')[1] : pack.name;
      ctx.font = '900 96px "Cinzel", "Times New Roman", serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.98)';
      ctx.shadowBlur = 32;
      ctx.fillText(albumTitle, width / 2, height * 0.61);

      // Subtitle
      ctx.font = 'bold 38px sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.shadowBlur = 16;
      ctx.fillText('NMIXX TRADING CARD GAME', width / 2, height * 0.665);

      // 5. Spec Box (High Sharpness)
      const boxW = width * 0.88;
      const boxH = 115;
      const boxX = (width - boxW) / 2;
      const boxY = height * 0.76;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 20);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 38px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(`전 ${pack.totalCards}종 + 특수 레어  |  1팩 5장입  |  부스터 팩`, width / 2, boxY + 72);

      // 6. Copyright
      ctx.font = '28px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('© JYP ENTERTAINMENT. MADE IN MIXXTOPIA', width / 2, height * 0.865);

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
