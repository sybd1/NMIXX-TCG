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
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, hovered: false });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 450;

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
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 3. Lighting System (PBR Studio Lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Dynamic Tracking Key Light (Produces moving specular highlight on foil)
    const keyPointLight = new THREE.PointLight(0xffffff, 28, 15);
    keyPointLight.position.set(0, 0, 3.5);
    scene.add(keyPointLight);

    // Cyan Left Rim Light
    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 2.2);
    cyanRim.position.set(-5, 2, 2);
    scene.add(cyanRim);

    // Magenta Right Rim Light
    const magentaRim = new THREE.DirectionalLight(0xec4899, 2.2);
    magentaRim.position.set(5, -2, 2);
    scene.add(magentaRim);

    // 4. Geometry & Textures
    const geometry = createBoosterPackGeometry(3.2, 4.8, 28);
    const normalTexture = generateFoilNormalMap();

    // High-end PBR Metallic Physical Material with Iridescence
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.88,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      iridescence: 1.0,
      iridescenceIOR: 1.35,
      reflectivity: 0.95,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.85, 0.85),
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Load pack color graphic texture
    let isDisposed = false;
    createPackColorTexture(pack).then((colorTex) => {
      if (isDisposed) {
        colorTex.dispose();
        return;
      }
      material.map = colorTex;
      material.needsUpdate = true;
    });

    // 5. Mouse Interaction Listeners
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

    // 6. Animation Render Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth interpolation for mouse movement
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // 3D Mesh Tilt
      mesh.rotation.y = mouseRef.current.x * 0.32;
      mesh.rotation.x = -mouseRef.current.y * 0.24;

      // Subtle breathing floating motion
      const floatOffset = Math.sin(elapsedTime * 2.0) * 0.06;
      mesh.position.y = floatOffset;

      // Dynamic Specular Light follows cursor
      keyPointLight.position.x = mouseRef.current.x * 4.2;
      keyPointLight.position.y = mouseRef.current.y * 4.5;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);

      geometry.dispose();
      material.dispose();
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
      className={`relative w-full h-full flex items-center justify-center cursor-pointer select-none ${className}`}
    />
  );
};
