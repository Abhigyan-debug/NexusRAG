import { useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useResolvedTheme, type ResolvedTheme } from '../../lib/theme';

// Additive glow reads well on dark; on a light page the same points need normal
// blending and deeper colours to stay visible.
const PALETTES = {
  dark: { point: '#818cf8', line: '#6366f1', lineOpacity: 0.15, sphere: '#1a1a2e', sphereOpacity: 0.3, blending: THREE.AdditiveBlending },
  light: { point: '#6366f1', line: '#818cf8', lineOpacity: 0.14, sphere: '#a5b4fc', sphereOpacity: 0.55, blending: THREE.NormalBlending },
} as const;

// Shared pointer position (normalized -1..1); mutated directly to avoid React re-renders.
const pointer = { x: 0, y: 0 };

function NeuralNetwork({ theme }: { theme: ResolvedTheme }) {
  const palette = PALETTES[theme];
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
          key={theme}
          color={palette.point}
          size={0.025}
          sizeAttenuation
          depthWrite={false}
          transparent
          blending={palette.blending}
        />
      </points>
      <lineSegments geometry={linesGeometry}>
        <lineBasicMaterial color={palette.line} transparent opacity={palette.lineOpacity} depthWrite={false} />
      </lineSegments>
      <mesh>
        <sphereGeometry args={[1.8, 24, 24]} />
        {theme === 'light' ? (
          // Unlit so it keeps its soft indigo instead of being shaded dark by the scene lights
          <meshBasicMaterial color={palette.sphere} transparent opacity={palette.sphereOpacity} wireframe />
        ) : (
          <meshStandardMaterial
            color={palette.sphere}
            transparent
            opacity={palette.sphereOpacity}
            wireframe
          />
        )}
      </mesh>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#6366f1" />
      <pointLight position={[-10, -10, -5]} intensity={0.4} color="#a855f7" />
    </group>
  );
}

export default function BrainScene() {
  const theme = useResolvedTheme();

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Portaled to <body>: the animated page wrapper uses CSS transforms, and a transformed
  // ancestor turns `position: fixed` into page-relative, which would stretch the canvas
  // to the full page height (slow, and the scene drifts off-centre).
  return createPortal(
    <div className="fixed inset-0 pointer-events-none -z-10" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <NeuralNetwork theme={theme} />
      </Canvas>
    </div>,
    document.body
  );
}
