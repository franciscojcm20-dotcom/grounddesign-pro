'use client';
import { useMemo, useEffect, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Al montar dentro de un panel recién revelado (pestaña 2D/3D, import dinámico sin SSR),
 * el ResizeObserver interno de @react-three/fiber a veces no mide el contenedor a tiempo
 * y el canvas queda con el tamaño por defecto del navegador (300×150). Forzar un evento
 * de resize tras el primer render dispara la medición correcta — workaround conocido para
 * Canvas dentro de contenido condicional/dinámico.
 */
function useForceCanvasResize() {
  useEffect(() => {
    const ids = [50, 200, 600].map(ms => setTimeout(() => window.dispatchEvent(new Event('resize')), ms));
    return () => ids.forEach(clearTimeout);
  }, []);
}

// ─── Colores (alineados con la paleta 2D existente) ────────────────────────
export const COLOR_CONDUCTOR = '#E07A23'; // copper
export const COLOR_ROD = '#3b82f6';       // blue
export const COLOR_RING = '#E07A23';
export const COLOR_SOIL = '#4b5563';

/**
 * Cilindro 3D que conecta dos puntos — usado para representar tramos de
 * conductor o varillas enterradas como tubos con volumen real, en vez de
 * líneas planas, para que la profundidad y disposición se perciban al girar
 * la vista.
 */
export function Segment({ start, end, radius, color }: {
  start: [number, number, number]; end: [number, number, number]; radius: number; color: string;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dir = new THREE.Vector3().subVectors(e, s);
    const length = Math.max(dir.length(), 0.001);
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid, quaternion, length };
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

/** Marca un punto de conexión/electrodo con una pequeña esfera. */
export function JointMarker({ pos, color = COLOR_ROD }: { pos: [number, number, number]; color?: string }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

/** Superficie del suelo (semi-transparente) en y=0, con grilla de referencia y etiqueta. */
function GroundPlane({ size }: { size: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={COLOR_SOIL} transparent opacity={0.18} />
      </mesh>
      <gridHelper args={[size, Math.max(Math.round(size / 2), 4), '#5b6472', '#2a2f3e']} position={[0, 0.001, 0]} />
      <Text position={[-size / 2 + 1.2, 0.35, -size / 2 + 1.2]} fontSize={0.6} color="#9aa3b0" anchorX="left">
        nivel de suelo
      </Text>
    </group>
  );
}

/** Escena 3D compartida por todos los módulos de electrodo: cámara orbital (gira libremente
 * para revisar las condiciones de instalación desde cualquier lado), iluminación y suelo. */
export function Scene3D({ children, size = 40, height = 340, cameraDistance }: {
  children: ReactNode; size?: number; height?: number; cameraDistance?: number;
}) {
  const dist = cameraDistance ?? Math.max(size * 0.6, 10);
  useForceCanvasResize();
  return (
    <div style={{ width: '100%', height, borderRadius: 4, overflow: 'hidden', background: 'var(--bg)', border: '1px solid var(--line)', position: 'relative' }}>
      <Canvas
        camera={{ position: [dist, dist * 0.8, dist], fov: 40 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        resize={{ scroll: false, debounce: 0 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ preserveDrawingBuffer: true, antialias: false, alpha: false, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
        }}
      >
        <color attach="background" args={['#0f1117']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[dist, dist * 1.5, dist]} intensity={1.1} />
        <hemisphereLight args={['#ffffff', '#20242e', 0.35]} />
        <GroundPlane size={size} />
        {children}
        <OrbitControls makeDefault enablePan enableZoom enableRotate minDistance={size * 0.15} maxDistance={size * 3} />
      </Canvas>
    </div>
  );
}

export function Scene3DHint() {
  return (
    <p style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 6, marginBottom: 0, textAlign: 'center' }}>
      Arrastra para girar · rueda para acercar/alejar · clic derecho para desplazar — revisa las condiciones de instalación desde cualquier lado.
    </p>
  );
}
