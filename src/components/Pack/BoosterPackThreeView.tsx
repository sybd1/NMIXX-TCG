import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BoosterPackConfig } from '../../config/gameConfig';
import {
  createBoosterPackGeometry,
  generateFoilNormalMap,
  createPackColorTexture,
  getPackProfile,
} from './BoosterPack3DScene';

interface BoosterPackThreeViewProps {
  pack: BoosterPackConfig;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BoosterPackThreeView: React.FC<BoosterPackThreeViewProps> = ({
  pack,
  disabled = false,
  className = '',
  onClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, hovered: false });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 450;
    const profile = getPackProfile(pack.code);

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.z = 7.0;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);

    // 3. Lighting System (PBR Studio Lights with High Clarity & Sparkle)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    // Dynamic Tracking Key Light (Produces crisp moving specular highlight)
    const keyPointLight = new THREE.PointLight(0xffffff, 18, 14);
    keyPointLight.position.set(0, 0, 3.8);
    scene.add(keyPointLight);

    // Pack-specific Rim Light 1
    const rimLight1 = new THREE.DirectionalLight(profile.rimColor, 1.6);
    rimLight1.position.set(-4, 2, 2);
    scene.add(rimLight1);

    // Pack-specific Rim Light 2
    const rimLight2 = new THREE.DirectionalLight(profile.sparkleColor, 1.5);
    rimLight2.position.set(4, -2, 2);
    scene.add(rimLight2);

    // 4. 3D Pack Group (Front Foil + Rear Back Pouch for True Physical Thickness)
    const packGroup = new THREE.Group();
    scene.add(packGroup);

    // Geometry for front & back
    const frontGeometry = createBoosterPackGeometry(pack.code, 3.2, 4.8, 36, false);
    const backGeometry = createBoosterPackGeometry(pack.code, 3.2, 4.8, 36, true);
    const normalTexture = generateFoilNormalMap(pack.code);

    // Front Physical Material (Crystal Clear Artwork + Iridescent Foil Finish)
    const frontMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: profile.metalness,
      roughness: profile.roughness,
      clearcoat: 0.50,
      clearcoatRoughness: 0.20,
      iridescence: profile.iridescence,
      iridescenceIOR: profile.iridescenceIOR,
      reflectivity: 0.90,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(profile.normalScale, profile.normalScale),
      side: THREE.FrontSide,
    });

    const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
    packGroup.add(frontMesh);

    // Back Pouch Material (Dark Metallic Foil Backing with Thickness)
    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0x181824,
      metalness: 0.85,
      roughness: 0.35,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(profile.normalScale * 0.8, profile.normalScale * 0.8),
      side: THREE.BackSide,
    });

    const backMesh = new THREE.Mesh(backGeometry, backMaterial);
    packGroup.add(backMesh);

    // 5. Dynamic Sparkling Glint Particles
    const sparkleCount = 20;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparkleScales = new Float32Array(sparkleCount);
    const sparklePhases = new Float32Array(sparkleCount);

    for (let i = 0; i < sparkleCount; i++) {
      sparklePositions[i * 3] = (Math.random() - 0.5) * 2.8;
      sparklePositions[i * 3 + 1] = (Math.random() - 0.5) * 4.2;
      sparklePositions[i * 3 + 2] = 0.18 + Math.random() * 0.15;
      sparkleScales[i] = Math.random() * 0.08 + 0.04;
      sparklePhases[i] = Math.random() * Math.PI * 2;
    }

    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));

    // Canvas-based Star Sparkle Texture
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 64;
    starCanvas.height = 64;
    const starCtx = starCanvas.getContext('2d')!;
    const radGrad = starCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    radGrad.addColorStop(0, '#ffffff');
    radGrad.addColorStop(0.3, '#fef08a');
    radGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.4)');
    radGrad.addColorStop(1, 'transparent');
    starCtx.fillStyle = radGrad;
    starCtx.fillRect(0, 0, 64, 64);
    const starTexture = new THREE.CanvasTexture(starCanvas);

    const sparkleMat = new THREE.PointsMaterial({
      color: profile.sparkleColor,
      size: 0.25,
      map: starTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
    packGroup.add(sparklePoints);

    // Load pack color graphic texture
    let isDisposed = false;
    createPackColorTexture(pack).then((colorTex) => {
      if (isDisposed) {
        colorTex.dispose();
        return;
      }
      frontMaterial.map = colorTex;
      frontMaterial.needsUpdate = true;
    });

    // 6. Mouse Interaction Listeners
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; // [-1, 1]
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1); // [-1, 1]
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
    };

    const handleMouseEnter = () => {
      mouseRef.current.hovered = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.hovered = false;
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    // 7. Animation Render Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth interpolation for mouse movement
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // 3D Pack Group Tilt
      packGroup.rotation.y = mouseRef.current.x * 0.35;
      packGroup.rotation.x = -mouseRef.current.y * 0.26;

      // Subtle breathing floating motion
      const floatOffset = Math.sin(elapsedTime * 2.0) * 0.06;
      packGroup.position.y = floatOffset;

      // Dynamic Specular Light follows cursor
      keyPointLight.position.x = mouseRef.current.x * 4.2;
      keyPointLight.position.y = mouseRef.current.y * 4.5;

      // Sparkling twinkle glints
      sparkleMat.opacity = 0.5 + Math.sin(elapsedTime * 4.0) * 0.35;
      sparklePoints.rotation.z = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);

      frontGeometry.dispose();
      backGeometry.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      normalTexture.dispose();
      starTexture.dispose();
      sparkleGeo.dispose();
      sparkleMat.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [pack]);

  return (
    <div
      ref={mountRef}
      onClick={!disabled ? onClick : undefined}
      className={`relative w-full h-full flex items-center justify-center cursor-pointer select-none ${className}`}
    />
  );
};
