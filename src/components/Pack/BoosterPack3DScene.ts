import * as THREE from 'three';
import { BoosterPackConfig } from '../../config/gameConfig';

/**
 * Generates a high-precision 3D booster pack geometry with:
 * 1. Compact physical zigzag crimped top & bottom edges (small realistic sawteeth)
 * 2. Delicate small punch hole (hanger hole)
 * 3. Natural asymmetric 3D pillowing/puffing displacement in the pack center
 */
export function createBoosterPackGeometry(width = 3.2, height = 4.8, toothCount = 36): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfH = height / 2;
  const toothWidth = width / toothCount;
  const toothDepth = 0.045; // Realistically small & compact sawtooth height

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

  // Small, realistic Sombrero/circular hanger hole in top center
  const holePath = new THREE.Path();
  const holeRadius = 0.095; // Realistically small punch hole
  const holeY = halfH - 0.36; // Positioned neatly in the top header
  holePath.absarc(0, holeY, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  // Generate Shape Geometry with fine subdivisions
  const geometry = new THREE.ShapeGeometry(shape, 28);

  // Add UVs & Asymmetric Vertex Displacement (Organic Foil Volume)
  const pos = geometry.attributes.position;
  const uvs: number[] = [];

  const topCrimpBound = halfH - 0.48;
  const bottomCrimpBound = -halfH + 0.42;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    // Compute normalized UV [0, 1]
    const u = (x + halfW) / width;
    const v = (y + halfH) / height;
    uvs.push(u, v);

    const normX = x / halfW; // [-1, 1]
    const normY = y / halfH; // [-1, 1]

    const isTopCrimp = y > topCrimpBound;
    const isBottomCrimp = y < bottomCrimpBound;

    let z = 0;
    if (!isTopCrimp && !isBottomCrimp) {
      // Natural asymmetric pillow volume (slight diagonal shift & organic curvature)
      const asymX = normX * 0.94 + 0.06;
      const domeX = Math.cos(Math.min(Math.max(asymX, -1), 1) * (Math.PI / 2));
      const domeY = Math.sin(((y - bottomCrimpBound) / (topCrimpBound - bottomCrimpBound)) * Math.PI);
      
      // Asymmetric organic puff displacement
      const basePuff = domeX * domeY * 0.16;
      const organicWave = (Math.sin(normX * 8.0 + normY * 5.0) * 0.016 + Math.cos(normX * 12.0 - normY * 9.0) * 0.012) * (1 - Math.abs(normX) * 0.5);
      z = basePuff + organicWave;
    } else {
      // Very subtle crimp ripple on seals
      z = Math.sin(x * 90) * 0.005;
    }

    pos.setZ(i, z);
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Generates organic, non-uniform procedural normal map for natural foil creases & crimp bands
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

  // Generate organic height map with fine crimp ridges, randomized tension creases, and micro-texture
  for (let y = 0; y < size; y++) {
    const ny = y / size; // [0, 1]
    const isTop = ny < 0.10;
    const isBottom = ny > 0.91;

    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const idx = (y * size + x) * 4;

      let height = 0.5;

      if (isTop || isBottom) {
        // High density vertical crimp ridges
        const ridge = Math.sin(nx * Math.PI * 72);
        height += ridge * 0.30;
      } else {
        // Multi-frequency organic foil tension wrinkles
        const d1 = Math.sin((nx * 5.5 + ny * 7.2) * Math.PI + Math.cos(nx * 11)) * 0.06;
        const d2 = Math.sin((nx * 9.2 - ny * 5.8) * Math.PI) * 0.045;
        const d3 = Math.cos((nx * 16.0 + ny * 13.0) * Math.PI) * 0.025;
        
        // Edge corner tension lines pulling inward
        const cornerDist = Math.hypot(nx - 0.5, ny - 0.5);
        const tension = Math.sin(cornerDist * 18.0 * Math.PI) * (0.04 * (1 - cornerDist));

        // Subtle micro-surface roughness
        const micro = (Math.sin(nx * 120) * Math.cos(ny * 120)) * 0.012;

        height += d1 + d2 + d3 + tension + micro;
      }

      // Convert height gradient to normal map
      const nxVal = Math.floor(128 + (height - 0.5) * 85);
      const nyVal = Math.floor(128 + (height - 0.5) * 85);

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
 * Creates high-resolution pack graphic texture with enhanced contrast & crisp typography
 */
export function createPackColorTexture(pack: BoosterPackConfig): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const width = 1024;
    const height = 1536;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw Iridescent Holographic Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (pack.code === 'NX-01') {
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(0.22, '#0284c7');
      bgGrad.addColorStop(0.48, '#db2777');
      bgGrad.addColorStop(0.76, '#7c3aed');
      bgGrad.addColorStop(1, '#0f172a');
    } else if (pack.code === 'NX-02') {
      bgGrad.addColorStop(0, '#451a03');
      bgGrad.addColorStop(0.22, '#d97706');
      bgGrad.addColorStop(0.48, '#e11d48');
      bgGrad.addColorStop(0.76, '#9333ea');
      bgGrad.addColorStop(1, '#1e1b4b');
    } else if (pack.code === 'NX-03') {
      bgGrad.addColorStop(0, '#082f49');
      bgGrad.addColorStop(0.22, '#0284c7');
      bgGrad.addColorStop(0.48, '#4f46e5');
      bgGrad.addColorStop(0.76, '#9333ea');
      bgGrad.addColorStop(1, '#020617');
    } else {
      bgGrad.addColorStop(0, '#4c0519');
      bgGrad.addColorStop(0.22, '#9333ea');
      bgGrad.addColorStop(0.48, '#db2777');
      bgGrad.addColorStop(0.76, '#2563eb');
      bgGrad.addColorStop(1, '#09090b');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Load and draw Cover Image with high clarity & contrast
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      // High-contrast, broad main art layout (occupying ~80% of height)
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, 0, height * 0.08, width, height * 0.78);
      ctx.restore();

      // Delicate foil sheen overlay (subtle, non-washout)
      const sheenGrad = ctx.createLinearGradient(0, 0, width, height);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      sheenGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.15)');
      sheenGrad.addColorStop(0.6, 'rgba(236, 72, 153, 0.18)');
      sheenGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.22)');
      sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(0, 0, width, height);

      // Slim top & bottom crimp shading
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, width, height * 0.09);
      ctx.fillRect(0, height * 0.91, width, height * 0.09);

      // 3. Render Top Metadata (Compact, crystal-clear)
      ctx.font = '900 34px monospace';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 10;
      ctx.fillText(`[${pack.code}]`, 48, 85);

      ctx.font = '900 24px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText('JYP / MIXX', width - 48, 72);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('ENTERTAINMENT', width - 48, 96);

      // 4. Render Main Title (2-Line Format with Rich Shading)
      ctx.textAlign = 'center';
      
      // Top pack number
      ctx.font = '900 42px monospace';
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 16;
      ctx.fillText(pack.code.replace('-', ' '), width / 2, height * 0.53);

      // Main album title (Large Metallic Embossed)
      const albumTitle = pack.name.includes(' - ') ? pack.name.split(' - ')[1] : pack.name;
      ctx.font = '900 68px "Cinzel", "Times New Roman", serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 24;
      ctx.fillText(albumTitle, width / 2, height * 0.60);

      // Subtitle
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.shadowBlur = 12;
      ctx.fillText('NMIXX TRADING CARD GAME', width / 2, height * 0.65);

      // 5. Spec Box (Compact & Sharp)
      const boxW = width * 0.86;
      const boxH = 80;
      const boxX = (width - boxW) / 2;
      const boxY = height * 0.76;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 27px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(`전 ${pack.totalCards}종 + 특수 레어  |  1팩 5장입  |  부스터 팩`, width / 2, boxY + 50);

      // 6. Copyright
      ctx.font = '20px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('© JYP ENTERTAINMENT. MADE IN MIXXTOPIA', width / 2, height * 0.86);

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
