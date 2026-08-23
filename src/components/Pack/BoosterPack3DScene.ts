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
 * - Smart aspect ratio handling (square / landscape artworks are 100% uncropped!)
 * - Beautiful seamless ambient bled background
 * - Minimal, ultra-clean official package design
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
      // Draw background gradient matching pack theme
      if (pack.code === 'NX-01') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0a0d18');
        bgGrad.addColorStop(0.3, '#10172e');
        bgGrad.addColorStop(0.7, '#1e1b4b');
        bgGrad.addColorStop(1, '#090a12');
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
        // 100% UN-CROPPED: Draw image full-width in the center
        const drawWidth = width;
        const drawHeight = width / imgAspect;
        const drawY = usableY + 70; // Positioned nicely under the top header

        // Draw main artwork with 100% sharpness & NO cropping
        ctx.drawImage(img, 0, drawY, drawWidth, drawHeight);

        // Elegant metallic subtle divider line below artwork
        const dividerY = drawY + drawHeight + 15;
        const lineGrad = ctx.createLinearGradient(width * 0.1, 0, width * 0.9, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
        lineGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.1, dividerY);
        ctx.lineTo(width * 0.9, dividerY);
        ctx.stroke();

        // High-end Metallic Album Title below artwork
        const albumTitle = pack.name.includes(' - ') ? pack.name.split(' - ')[1] : pack.name;
        ctx.font = '900 68px "Cinzel", "Times New Roman", serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 20;
        ctx.fillText(albumTitle, width / 2, dividerY + 80);

        // Subtitle Slogan
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.shadowBlur = 10;
        ctx.fillText(pack.subtitle, width / 2, dividerY + 130);
      } else {
        // Portrait artwork (e.g. NX-02 or NX-04)
        ctx.drawImage(img, 0, usableY, width, usableHeight);
      }

      // 3. Realistic Aluminum Foil Crimp Seals on Top & Bottom
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, topCrimpHeight, width - 8, height - topCrimpHeight - bottomCrimpHeight);

      // 5. Minimal, Ultra-Clean Branding (Pack-Themed & Large Crisp Typography)
      const headerY = topCrimpHeight + 56;

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

      // Left: Pack Code [NX 01]
      ctx.font = '900 52px monospace';
      ctx.fillStyle = theme.codeColor;
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
      ctx.shadowBlur = 18;
      ctx.fillText(`[${pack.code}]`, 55, headerY);

      // Right: Brand Text NMIXX TCG
      ctx.font = '900 42px sans-serif';
      ctx.fillStyle = theme.brandColor;
      ctx.textAlign = 'right';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
      ctx.shadowBlur = 18;
      ctx.fillText('NMIXX TCG', width - 55, headerY);

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
