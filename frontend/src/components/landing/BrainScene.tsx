import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function NeuralNetwork() {
  const groupRef = useRef<THREE.Group>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const { pointsGeometry, linesGeometry } = useMemo(() => {
    const count = 800;
    const positions = new Float32Array(count * 3);

    // Create particle positions
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 1.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    // Create point geometry
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create connection lines
    const connPositions: number[] = [];
    for (let i = 0; i < count; i += 3) {
      for (let j = i + 1; j < Math.min(i + 8, count); j++) {
        if (Math.random() > 0.7) {
          connPositions.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          );
        }
      }
    }

    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(connPositions), 3));

    return { pointsGeometry: pGeo, linesGeometry: lGeo };
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05 + mouse.x * 0.3;
      groupRef.current.rotation.x = mouse.y * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={pointsGeometry} frustumCulled={false}>
        <pointsMaterial
          color="#818cf8"
          size={0.025}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments geometry={linesGeometry}>
        <lineBasicMaterial color="#6366f1" transparent opacity={0.15} />
      </lineSegments>
      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshStandardMaterial
          color="#1a1a2e"
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#6366f1" />
      <pointLight position={[-10, -10, -5]} intensity={0.4} color="#a855f7" />
    </group>
  );
}

export default function BrainScene() {
  return (
    <div
      className="absolute inset-0"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        if (typeof window !== 'undefined') {
          (window as any).__brainMouse = { x, y };
        }
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <NeuralNetwork />
      </Canvas>
    </div>
  );
}
