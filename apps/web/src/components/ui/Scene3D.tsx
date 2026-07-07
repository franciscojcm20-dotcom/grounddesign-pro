'use client';
import { useMemo, useEffect, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
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

// ─── Cotas dimensionales 3D ─────────────────────────────────────────────────
//
// Línea de cota con marcas en los extremos y etiqueta que siempre mira a la
// cámara (billboard) — agrega la lectura de distancias reales (largo, ancho,
// profundidad, separaciones) directamente sobre el modelo, sin depender de la
// tabla de parámetros del panel lateral.

const COLOR_DIM = '#8b94a3';

export function DimensionLine({ start, end, label, scale }: {
  start: [number, number, number]; end: [number, number, number]; label: string;
  /** Tamaño de referencia de la escena (m) — dimensiona grosor de línea y fuente. */
  scale: number;
}) {
  const r = Math.max(scale * 0.0035, 0.015);
  const tickR = r * 3.2;
  const fontSize = Math.max(scale * 0.032, 0.18);
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2,
  ];
  return (
    <group>
      <Segment start={start} end={end} radius={r} color={COLOR_DIM} />
      <mesh position={start}><sphereGeometry args={[tickR, 8, 8]} /><meshBasicMaterial color={COLOR_DIM} /></mesh>
      <mesh position={end}><sphereGeometry args={[tickR, 8, 8]} /><meshBasicMaterial color={COLOR_DIM} /></mesh>
      <Billboard position={[mid[0], mid[1] + fontSize * 0.9, mid[2]]}>
        <Text fontSize={fontSize} color="#c3cad6" anchorX="center" anchorY="bottom" outlineWidth={fontSize * 0.06} outlineColor="#0f1117">
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Perfil estratigráfico del suelo (homologado del terreno) ───────────────
//
// Interpretación gráfica sutil del modelo de suelo activo del proyecto (VES
// biestrato: ρ1/ρ2/h): un corte geológico translúcido como telón de fondo en
// el plano trasero de la escena + un plano de interfaz muy tenue a la
// profundidad h, para leer de un vistazo en qué capa trabaja cada electrodo
// (¿las picas cruzan a la capa profunda conductiva?). El protagonista sigue
// siendo el diseño de la malla — el terreno es contexto, no foco.

export interface SoilProfile3D { rho1: number; rho2: number; h: number }

/** Color de capa según ρ relativa: azulado = conductiva, ámbar = resistiva. */
function layerColor(rho: number, rhoMin: number, rhoMax: number): string {
  const lo = new THREE.Color('#3b82f6');
  const hi = new THREE.Color('#b45309');
  if (rhoMax <= rhoMin) return '#6b7280';
  const t = (Math.log(rho) - Math.log(rhoMin)) / (Math.log(rhoMax) - Math.log(rhoMin));
  return `#${lo.clone().lerp(hi, Math.min(Math.max(t, 0), 1)).getHexString()}`;
}

export function SoilLayers3D({ soil, size, depthExtent }: {
  soil: SoilProfile3D; size: number;
  /** m — profundidad máxima de interés de la escena (electrodo más profundo + margen). */
  depthExtent: number;
}) {
  const bottom = Math.max(depthExtent, soil.h * 1.6, 1);
  const h1 = Math.min(soil.h, bottom);
  const rhoMin = Math.min(soil.rho1, soil.rho2);
  const rhoMax = Math.max(soil.rho1, soil.rho2);
  const c1 = layerColor(soil.rho1, rhoMin, rhoMax);
  const c2 = layerColor(soil.rho2, rhoMin, rhoMax);
  const zBack = -size / 2;
  const fontSize = Math.max(size * 0.028, 0.16);
  const labelX = -size / 2 + fontSize * 0.6;

  const fmt = (n: number) => n >= 100 ? n.toFixed(0) : n.toFixed(1);

  return (
    <group>
      {/* Corte geológico en el plano trasero — banda por capa, muy translúcida */}
      <mesh position={[0, -h1 / 2, zBack]}>
        <planeGeometry args={[size, h1]} />
        <meshBasicMaterial color={c1} transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {bottom > h1 && (
        <mesh position={[0, -(h1 + (bottom - h1) / 2), zBack]}>
          <planeGeometry args={[size, bottom - h1]} />
          <meshBasicMaterial color={c2} transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {/* Línea de interfaz sobre el corte */}
      <Segment start={[-size / 2, -h1, zBack]} end={[size / 2, -h1, zBack]} radius={Math.max(size * 0.003, 0.012)} color="#8b94a3" />

      {/* Plano de interfaz horizontal (área completa, casi imperceptible) — permite
          leer contra las varillas si el electrodo alcanza la capa profunda */}
      {bottom > h1 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -h1, 0]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial color={c2} transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* Etiquetas de capa: ρ y rango de profundidad, ancladas al corte */}
      <Text position={[labelX, -h1 / 2, zBack + 0.05]} fontSize={fontSize} color="#9aa3b0" anchorX="left" anchorY="middle" outlineWidth={fontSize * 0.06} outlineColor="#0f1117">
        {`ρ1 = ${fmt(soil.rho1)} Ω·m · 0–${fmt(soil.h)} m`}
      </Text>
      {bottom > h1 && (
        <Text position={[labelX, -(h1 + (bottom - h1) / 2), zBack + 0.05]} fontSize={fontSize} color="#9aa3b0" anchorX="left" anchorY="middle" outlineWidth={fontSize * 0.06} outlineColor="#0f1117">
          {`ρ2 = ${fmt(soil.rho2)} Ω·m · >${fmt(soil.h)} m (semi-espacio)`}
        </Text>
      )}
    </group>
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
