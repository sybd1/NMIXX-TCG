import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BoosterPackConfig } from '../../config/gameConfig';
import {
  createBoosterPackGeometry,
  generateFoilNormalMap,
  createPackColorTexture,
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
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.z = 7.2;

    // 2. High-Performance WebGL Renderer with Balanced Exposure
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02; // Reduced exposure to prevent center washout
    container.appendChild(renderer.domElement);

    // 3. Balanced Studio Lighting (Natural, Non-Overexposed Setup)
    // Soft natural ambient light ensuring 100% graphic clarity
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambientLight);

    // Gentle Tracking Key Light (Provides subtle specular reflection without lens flare washout)
    const keyPointLight = new THREE.PointLight(0xffffff, 4.5, 20);
    keyPointLight.position.set(0, 2.0, 4.5);
    scene.add(keyPointLight);

    // Subtle Fill Lights for rich 3D foil depth
    const fillLightLeft = new THREE.DirectionalLight(0xffffff, 0.32);
    fillLightLeft.position.set(-4, 3, 2);
    scene.add(fillLightLeft);

    const fillLightRight = new THREE.DirectionalLight(0xffffff, 0.22);
    fillLightRight.position.set(4, -2, 2);
    scene.add(fillLightRight);

    // 4. Physical 3D Foil Pouch Group (Front Foil + Thick Back Pouch)
    const packGroup = new THREE.Group();
    scene.add(packGroup);

    const frontGeometry = createBoosterPackGeometry(3.2, 4.8, 38, false);
    const backGeometry = createBoosterPackGeometry(3.2, 4.8, 38, true);
    const normalTexture = generateFoilNormalMap(pack.code);

    // Ultra-Realistic Aluminum Foil Packaging Material with Controlled Specular Highlights
    const frontMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.43,
      roughness: 0.27,
      clearcoat: 0.23,
      clearcoatRoughness: 0.22,
      reflectivity: 0.60,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.40, 0.40),
      side: THREE.FrontSide,
    });

    const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
    packGroup.add(frontMesh);

    // Rear Pouch Backing (Authentic dark metallic silver foil back)
    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1e28,
      metalness: 0.65,
      roughness: 0.38,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.35, 0.35),
      side: THREE.BackSide,
    });

    const backMesh = new THREE.Mesh(backGeometry, backMaterial);
    packGroup.add(backMesh);

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

    // 5. Mouse Movement Listeners
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; // [-1, 1]
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1); // [-1, 1]
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // 6. Animation Render Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth interpolation for mouse movement
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // Realistic 3D Pouch Tilt
      packGroup.rotation.y = mouseRef.current.x * 0.30;
      packGroup.rotation.x = -mouseRef.current.y * 0.22;

      // Very subtle organic floating
      packGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.04;

      // Subtle key light tracking without overexposing center
      keyPointLight.position.x = mouseRef.current.x * 3.0;
      keyPointLight.position.y = mouseRef.current.y * 3.0 + 2.0;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);

      frontGeometry.dispose();
      backGeometry.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      normalTexture.dispose();
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
      className={`relative w-full h-full flex items-center justify-center cursor-pointer select-none [filter:contrast(1.03)_saturate(1.05)] ${className}`}
    />
  );
};
