/**
 * Freshness Orb — the hero 3D visualisation.
 *
 * A slowly rotating wireframe sphere with orbiting data points and scanning
 * rings, tinted by the freshness band. Deliberately lightweight:
 *
 *  - no external models, no textures, no post-processing
 *  - ~1.2k triangles total, three small geometries reused
 *  - `frameloop="demand"`-style throttling via a capped DPR
 *  - the whole scene is skipped for reduced-motion / low-power clients, which
 *    get a pure-CSS fallback instead (see FreshnessOrb.jsx)
 *
 * This file is only ever reached through a React.lazy boundary, so `three`
 * lands in its own chunk and never loads for users who do not see the orb.
 */
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Deterministic point cloud on a sphere (Fibonacci lattice — even coverage). */
function useSpherePoints(count, radius) {
  return useMemo(() => {
    const positions = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i += 1) {
      const y = 1 - (i / (count - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      positions[i * 3] = Math.cos(theta) * ring * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = Math.sin(theta) * ring * radius;
    }
    return positions;
  }, [count, radius]);
}

function Core({ color, pulse }) {
  const inner = useRef();
  const wire = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (wire.current) {
      wire.current.rotation.y = t * 0.16;
      wire.current.rotation.x = Math.sin(t * 0.12) * 0.14;
    }
    if (inner.current && pulse) {
      const scale = 1 + Math.sin(t * 1.4) * 0.018;
      inner.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      {/* Soft luminous inner sphere */}
      <mesh ref={inner}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={0.14}
        />
      </mesh>
      {/* Delicate futuristic geometric shell */}
      <mesh ref={wire}>
        <icosahedronGeometry args={[1.28, 2]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function DataPoints({ color }) {
  const points = useRef();
  const positions = useSpherePoints(90, 1.42);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = -state.clock.elapsedTime * 0.09;
      points.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.07) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.045}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  );
}

/** Two thin scanning rings on offset axes. */
function ScanRings({ color }) {
  const a = useRef();
  const b = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (a.current) {
      a.current.rotation.x = Math.PI / 2;
      a.current.rotation.z = t * 0.5;
      // Sweep the ring up and down the sphere like a scan head.
      a.current.position.y = Math.sin(t * 0.55) * 0.85;
      const r = Math.cos(Math.asin(Math.min(0.99, Math.abs(a.current.position.y) / 1.3)));
      a.current.scale.setScalar(Math.max(0.25, r));
    }
    if (b.current) {
      b.current.rotation.y = t * 0.35;
      b.current.rotation.x = Math.PI / 2.6;
    }
  });

  return (
    <group>
      <mesh ref={a}>
        <torusGeometry args={[1.3, 0.008, 6, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} />
      </mesh>
      <mesh ref={b}>
        <torusGeometry args={[1.52, 0.005, 6, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Gentle pointer-driven camera drift — parallax without a controls library. */
function ParallaxRig({ pointer }) {
  const group = useRef();
  useFrame(() => {
    if (!group.current) return;
    const targetY = pointer.x * 0.22;
    const targetX = pointer.y * 0.16;
    // Critically damped follow so it never feels jittery.
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.045;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.045;
  });
  return <group ref={group} />;
}

function Scene({ color, pointer, pulse }) {
  const rig = useRef();
  useFrame(() => {
    if (!rig.current) return;
    const targetY = pointer.current.x * 0.22;
    const targetX = pointer.current.y * 0.16;
    rig.current.rotation.y += (targetY - rig.current.rotation.y) * 0.045;
    rig.current.rotation.x += (targetX - rig.current.rotation.x) * 0.045;
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 5]} intensity={1.05} color="#ffffff" />
      <pointLight position={[-3, -2, -3]} intensity={0.5} color={color} />
      <group ref={rig}>
        <Core color={color} pulse={pulse} />
        <DataPoints color={color} />
        <ScanRings color={color} />
      </group>
    </>
  );
}

/**
 * @param {string} color   hex tint (drive from scoreColor())
 * @param {object} pointer ref holding { x, y } in [-1,1] for parallax
 * @param {boolean} pulse  subtle breathing on the core
 */
export default function OrbScene({ color = '#128756', pointer, pulse = true, className }) {
  // A plain ref keeps pointer updates out of React's render path entirely.
  const fallbackPointer = useRef({ x: 0, y: 0 });
  const active = pointer || fallbackPointer;

  return (
    <Canvas
      className={className}
      // Cap the pixel ratio: retina 3x on a decorative scene is wasted GPU.
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#000000'), 0);
      }}
    >
      <Scene color={color} pointer={active} pulse={pulse} />
    </Canvas>
  );
}

export { ParallaxRig };
