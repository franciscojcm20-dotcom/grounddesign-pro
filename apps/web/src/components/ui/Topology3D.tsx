'use client';
import {
  Segment, JointMarker, Scene3D, Scene3DHint, DimensionLine, SoilLayers3D,
  COLOR_CONDUCTOR, COLOR_ROD, type SoilProfile3D,
} from './Scene3D';

// Todas las coordenadas usan metros reales de las mismas variables ya usadas en
// el diagrama 2D de cada módulo — Y negativo representa profundidad bajo el
// nivel de suelo (Y=0), para que la vista 3D muestre fielmente las condiciones
// reales de instalación (profundidad de enterramiento, longitud de varillas, etc).
//
// Cada topología incluye además sus cotas dimensionales (DimensionLine) y los
// wrappers aceptan el modelo de suelo activo del proyecto para dibujar el
// perfil estratigráfico translúcido de fondo (SoilLayers3D) — el terreno como
// contexto interpretativo, la malla como protagonista.

/** Formatea metros con hasta 2 decimales significativos. */
function fm(v: number): string {
  return `${Number.isInteger(v) ? v : Number(v.toFixed(2))} m`;
}

/** Malla rectangular (Sverak) + varillas perimetrales — grid/resistance. */
export function Grid3D({ largo, ancho, nL, nW, profundidad, nVarillas, longVarilla }: {
  largo: number; ancho: number; nL: number; nW: number; profundidad: number; nVarillas: number; longVarilla: number;
}) {
  const hw = largo / 2, hd = ancho / 2;
  const y = -profundidad;
  const nLc = Math.max(nL, 2), nWc = Math.max(nW, 2);
  const scale = Math.max(largo, ancho);
  const off = scale * 0.07;

  const hLines = Array.from({ length: nWc }, (_, i) => {
    const z = -hd + (i / (nWc - 1)) * ancho;
    return <Segment key={`h${i}`} start={[-hw, y, z]} end={[hw, y, z]} radius={0.05} color={COLOR_CONDUCTOR} />;
  });
  const vLines = Array.from({ length: nLc }, (_, i) => {
    const x = -hw + (i / (nLc - 1)) * largo;
    return <Segment key={`v${i}`} start={[x, y, -hd]} end={[x, y, hd]} radius={0.05} color={COLOR_CONDUCTOR} />;
  });

  const rodCount = Math.min(Math.round(nVarillas), 24);
  const corners: [number, number][] = [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]];
  const perimeter = 2 * (largo + ancho);
  const rods = Array.from({ length: rodCount }, (_, i) => {
    let x: number, z: number;
    if (i < 4) { [x, z] = corners[i]!; }
    else {
      const dist = (perimeter * (i - 4)) / Math.max(rodCount - 4, 1);
      if (dist < largo) { x = -hw + dist; z = -hd; }
      else if (dist < largo + ancho) { x = hw; z = -hd + (dist - largo); }
      else if (dist < 2 * largo + ancho) { x = hw - (dist - largo - ancho); z = hd; }
      else { x = -hw; z = hd - (dist - 2 * largo - ancho); }
    }
    return (
      <group key={`r${i}`}>
        <Segment start={[x, y, z]} end={[x, y - longVarilla, z]} radius={0.045} color={COLOR_ROD} />
        <JointMarker pos={[x, y, z]} />
      </group>
    );
  });

  return (
    <group>
      {hLines}{vLines}{rods}
      <DimensionLine start={[-hw, y, hd + off]} end={[hw, y, hd + off]} label={fm(largo)} scale={scale} />
      <DimensionLine start={[hw + off, y, -hd]} end={[hw + off, y, hd]} label={fm(ancho)} scale={scale} />
      {profundidad > 0.04 && (
        <DimensionLine start={[-hw - off, 0, -hd]} end={[-hw - off, y, -hd]} label={`prof. ${fm(profundidad)}`} scale={scale} />
      )}
      {rodCount > 0 && longVarilla > 0 && (
        <DimensionLine
          start={[hw + off * 0.6, y, hd + off * 0.6]} end={[hw + off * 0.6, y - longVarilla, hd + off * 0.6]}
          label={`varilla ${fm(longVarilla)}`} scale={scale}
        />
      )}
    </group>
  );
}

/** Electrodos verticales en paralelo — grid/rod. */
export function Rod3D({ n, L, spacing }: { n: number; L: number; spacing: number }) {
  const count = Math.max(Math.round(n), 1);
  const totalWidth = (count - 1) * spacing;
  const startX = -totalWidth / 2;
  const scale = Math.max(totalWidth, L * 1.5, 4);
  const off = scale * 0.08;

  const rods = Array.from({ length: count }, (_, i) => {
    const x = startX + i * spacing;
    return (
      <group key={i}>
        <Segment start={[x, 0, 0]} end={[x, -L, 0]} radius={0.06} color={COLOR_ROD} />
        <JointMarker pos={[x, 0, 0]} />
        {i < count - 1 && <Segment start={[x, 0, 0]} end={[x + spacing, 0, 0]} radius={0.04} color={COLOR_CONDUCTOR} />}
      </group>
    );
  });
  return (
    <group>
      {rods}
      {count > 1 && (
        <DimensionLine start={[startX, off * 0.5, 0]} end={[startX + spacing, off * 0.5, 0]} label={`s = ${fm(spacing)}`} scale={scale} />
      )}
      <DimensionLine start={[startX - off, 0, 0]} end={[startX - off, -L, 0]} label={`L = ${fm(L)}`} scale={scale} />
    </group>
  );
}

/** Conductor horizontal enterrado — grid/strip. */
export function Strip3D({ L, h }: { L: number; h: number }) {
  const off = L * 0.06;
  return (
    <group>
      <Segment start={[-L / 2, -h, 0]} end={[L / 2, -h, 0]} radius={0.06} color={COLOR_CONDUCTOR} />
      <JointMarker pos={[-L / 2, -h, 0]} color={COLOR_CONDUCTOR} />
      <JointMarker pos={[L / 2, -h, 0]} color={COLOR_CONDUCTOR} />
      <DimensionLine start={[-L / 2, -h, off]} end={[L / 2, -h, off]} label={`L = ${fm(L)}`} scale={L} />
      {h > 0.04 && (
        <DimensionLine start={[-L / 2 - off, 0, 0]} end={[-L / 2 - off, -h, 0]} label={`h = ${fm(h)}`} scale={L} />
      )}
    </group>
  );
}

/** Sistema radial / estrella (Laurent-Niemann) — grid/radial. */
export function Radial3D({ n, L, h }: { n: number; L: number; h: number }) {
  const arms = Math.max(Math.min(Math.round(n), 24), 2);
  const scale = L * 2;
  const off = L * 0.12;
  const segs = Array.from({ length: arms }, (_, i) => {
    const angle = (i / arms) * Math.PI * 2;
    const x = Math.cos(angle) * L, z = Math.sin(angle) * L;
    return (
      <group key={i}>
        <Segment start={[0, -h, 0]} end={[x, -h, z]} radius={0.05} color={COLOR_CONDUCTOR} />
        <JointMarker pos={[x, -h, z]} color={COLOR_CONDUCTOR} />
      </group>
    );
  });
  return (
    <group>
      {segs}
      <JointMarker pos={[0, -h, 0]} color={COLOR_ROD} />
      <DimensionLine start={[0, -h, off]} end={[L, -h, off]} label={`L = ${fm(L)}`} scale={scale} />
      {h > 0.04 && (
        <DimensionLine start={[-off, 0, -off]} end={[-off, -h, -off]} label={`h = ${fm(h)}`} scale={scale} />
      )}
    </group>
  );
}

/** Anillo perimetral — grid/ring. Se aproxima con un polígono de muchos lados. */
export function Ring3D({ largo, ancho, h }: { largo: number; ancho: number; h: number }) {
  const hw = largo / 2, hd = ancho / 2;
  const scale = Math.max(largo, ancho);
  const off = scale * 0.07;
  const corners: [number, number][] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]];
  const segs = corners.slice(0, -1).map((c, i) => {
    const [x1, z1] = c;
    const [x2, z2] = corners[i + 1]!;
    return <Segment key={i} start={[x1, -h, z1]} end={[x2, -h, z2]} radius={0.055} color={COLOR_CONDUCTOR} />;
  });
  const markers = corners.slice(0, -1).map((c, i) => <JointMarker key={i} pos={[c[0], -h, c[1]]} color={COLOR_CONDUCTOR} />);
  return (
    <group>
      {segs}{markers}
      <DimensionLine start={[-hw, -h, hd + off]} end={[hw, -h, hd + off]} label={fm(largo)} scale={scale} />
      <DimensionLine start={[hw + off, -h, -hd]} end={[hw + off, -h, hd]} label={fm(ancho)} scale={scale} />
      {h > 0.04 && (
        <DimensionLine start={[-hw - off, 0, -hd]} end={[-hw - off, -h, -hd]} label={`h = ${fm(h)}`} scale={scale} />
      )}
    </group>
  );
}

/** Malla + picas combinada (Schwarz) — grid/combined. */
export function Combined3D({ largo, ancho, nL, nW, profundidad, nRods, rodLength }: {
  largo: number; ancho: number; nL: number; nW: number; profundidad: number; nRods: number; rodLength: number;
}) {
  return (
    <Grid3D
      largo={largo} ancho={ancho} nL={nL} nW={nW} profundidad={profundidad}
      nVarillas={nRods} longVarilla={rodLength}
    />
  );
}

// ─── Vistas compuestas (Scene3D + topología + suelo + hint en un solo chunk) ──
// Cada módulo antes cargaba Scene3D, Scene3DHint y su topología con 3
// dynamic() independientes (3 promesas de chunk por módulo). Al componerlas
// aquí, el cliente hace un único import dinámico por módulo.
//
// `soil` (opcional): modelo de suelo activo del proyecto (ρ1/ρ2/h del VES) —
// si está presente, la escena dibuja el perfil estratigráfico de fondo.

type WithSoil<P> = P & { soil?: SoilProfile3D | null };

export function GridScene3D({ soil, ...props }: WithSoil<Parameters<typeof Grid3D>[0]>) {
  const size = Math.max(props.largo, props.ancho) * 1.4;
  const maxDepth = props.profundidad + (props.nVarillas > 0 ? props.longVarilla : 0);
  return (
    <>
      <Scene3D size={size}>
        <Grid3D {...props} />
        {soil && <SoilLayers3D soil={soil} size={size} depthExtent={maxDepth * 1.25 + size * 0.04} />}
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function RodScene3D({ soil, ...props }: WithSoil<Parameters<typeof Rod3D>[0]>) {
  const size = Math.max(props.n * props.spacing, props.L * 3);
  return (
    <>
      <Scene3D size={size}>
        <Rod3D {...props} />
        {soil && <SoilLayers3D soil={soil} size={size} depthExtent={props.L * 1.25 + size * 0.04} />}
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function StripScene3D({ soil, ...props }: WithSoil<Parameters<typeof Strip3D>[0]>) {
  const size = props.L * 1.4;
  return (
    <>
      <Scene3D size={size}>
        <Strip3D {...props} />
        {soil && <SoilLayers3D soil={soil} size={size} depthExtent={props.h * 1.6 + size * 0.06} />}
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function RadialScene3D({ soil, ...props }: WithSoil<Parameters<typeof Radial3D>[0]>) {
  const size = props.L * 2.6;
  return (
    <>
      <Scene3D size={size}>
        <Radial3D {...props} />
        {soil && <SoilLayers3D soil={soil} size={size} depthExtent={props.h * 1.6 + size * 0.06} />}
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function RingScene3D({ soil, ...props }: WithSoil<Parameters<typeof Ring3D>[0]>) {
  const size = Math.max(props.largo, props.ancho) * 1.4;
  return (
    <>
      <Scene3D size={size}>
        <Ring3D {...props} />
        {soil && <SoilLayers3D soil={soil} size={size} depthExtent={props.h * 1.6 + size * 0.06} />}
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function CombinedScene3D({ soil, ...props }: WithSoil<Parameters<typeof Combined3D>[0]>) {
  const size = Math.max(props.largo, props.ancho) * 1.4;
  const maxDepth = props.profundidad + (props.nRods > 0 ? props.rodLength : 0);
  return (
    <>
      <Scene3D size={size}>
        <Combined3D {...props} />
        {soil && <SoilLayers3D soil={soil} size={size} depthExtent={maxDepth * 1.25 + size * 0.04} />}
      </Scene3D>
      <Scene3DHint />
    </>
  );
}
