import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Shared pointer position (normalized -1..1); mutated directly to avoid React re-renders.
const pointer = { x: 0, y: 0 };

function NeuralNetwork() {
  const groupRef = useRef<THREE.Group>(null);
  const smoothed = useRef({ x: 0, y: 0 });

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

  useEffect(() => () => {
    pointsGeometry.dispose();
    linesGeometry.dispose();
  }, [pointsGeometry, linesGeometry]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    // Ease toward the pointer so movement stays smooth
    const k = Math.min(1, delta * 3);
    smoothed.current.x += (pointer.x - smoothed.current.x) * k;
    smoothed.current.y += (pointer.y - smoothed.current.y) * k;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.05 + smoothed.current.x * 0.3;
    groupRef.current.rotation.x = smoothed.current.y * 0.2;
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
        <lineBasicMaterial color="#6366f1" transparent opacity={0.15} depthWrite={false} />
      </lineSegments>
      <mesh>
        <sphereGeometry args={[1.8, 24, 24]} />
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
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    // Fixed to the viewport so the canvas stays screen-sized instead of spanning the whole scrolling page
    <div className="fixed inset-0 pointer-events-none" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <NeuralNetwork />
      </Canvas>
    </div>
  );
}
