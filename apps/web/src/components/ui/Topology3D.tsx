'use client';
import { Segment, JointMarker, Scene3D, Scene3DHint, COLOR_CONDUCTOR, COLOR_ROD } from './Scene3D';

// Todas las coordenadas usan metros reales de las mismas variables ya usadas en
// el diagrama 2D de cada módulo — Y negativo representa profundidad bajo el
// nivel de suelo (Y=0), para que la vista 3D muestre fielmente las condiciones
// reales de instalación (profundidad de enterramiento, longitud de varillas, etc).

/** Malla rectangular (Sverak) + varillas perimetrales — grid/resistance. */
export function Grid3D({ largo, ancho, nL, nW, profundidad, nVarillas, longVarilla }: {
  largo: number; ancho: number; nL: number; nW: number; profundidad: number; nVarillas: number; longVarilla: number;
}) {
  const hw = largo / 2, hd = ancho / 2;
  const y = -profundidad;
  const nLc = Math.max(nL, 2), nWc = Math.max(nW, 2);

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

  return <group>{hLines}{vLines}{rods}</group>;
}

/** Electrodos verticales en paralelo — grid/rod. */
export function Rod3D({ n, L, spacing }: { n: number; L: number; spacing: number }) {
  const count = Math.max(Math.round(n), 1);
  const totalWidth = (count - 1) * spacing;
  const startX = -totalWidth / 2;
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
  return <group>{rods}</group>;
}

/** Conductor horizontal enterrado — grid/strip. */
export function Strip3D({ L, h }: { L: number; h: number }) {
  return (
    <group>
      <Segment start={[-L / 2, -h, 0]} end={[L / 2, -h, 0]} radius={0.06} color={COLOR_CONDUCTOR} />
      <JointMarker pos={[-L / 2, -h, 0]} color={COLOR_CONDUCTOR} />
      <JointMarker pos={[L / 2, -h, 0]} color={COLOR_CONDUCTOR} />
    </group>
  );
}

/** Sistema radial / estrella (Laurent-Niemann) — grid/radial. */
export function Radial3D({ n, L, h }: { n: number; L: number; h: number }) {
  const arms = Math.max(Math.min(Math.round(n), 24), 2);
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
  return <group>{segs}<JointMarker pos={[0, -h, 0]} color={COLOR_ROD} /></group>;
}

/** Anillo perimetral — grid/ring. Se aproxima con un polígono de muchos lados. */
export function Ring3D({ largo, ancho, h }: { largo: number; ancho: number; h: number }) {
  const hw = largo / 2, hd = ancho / 2;
  const corners: [number, number][] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]];
  const segs = corners.slice(0, -1).map((c, i) => {
    const [x1, z1] = c;
    const [x2, z2] = corners[i + 1]!;
    return <Segment key={i} start={[x1, -h, z1]} end={[x2, -h, z2]} radius={0.055} color={COLOR_CONDUCTOR} />;
  });
  const markers = corners.slice(0, -1).map((c, i) => <JointMarker key={i} pos={[c[0], -h, c[1]]} color={COLOR_CONDUCTOR} />);
  return <group>{segs}{markers}</group>;
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

// ─── Vistas compuestas (Scene3D + topología + hint en un solo chunk) ───────
// Cada módulo antes cargaba Scene3D, Scene3DHint y su topología con 3
// dynamic() independientes (3 promesas de chunk por módulo). Al componerlas
// aquí, el cliente hace un único import dinámico por módulo.

export function GridScene3D(props: Parameters<typeof Grid3D>[0]) {
  return (
    <>
      <Scene3D size={Math.max(props.largo, props.ancho) * 1.4}>
        <Grid3D {...props} />
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function RodScene3D(props: Parameters<typeof Rod3D>[0]) {
  return (
    <>
      <Scene3D size={Math.max(props.n * props.spacing, props.L * 3)}>
        <Rod3D {...props} />
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function StripScene3D(props: Parameters<typeof Strip3D>[0]) {
  return (
    <>
      <Scene3D size={props.L * 1.4}>
        <Strip3D {...props} />
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function RadialScene3D(props: Parameters<typeof Radial3D>[0]) {
  return (
    <>
      <Scene3D size={props.L * 2.6}>
        <Radial3D {...props} />
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function RingScene3D(props: Parameters<typeof Ring3D>[0]) {
  return (
    <>
      <Scene3D size={Math.max(props.largo, props.ancho) * 1.4}>
        <Ring3D {...props} />
      </Scene3D>
      <Scene3DHint />
    </>
  );
}

export function CombinedScene3D(props: Parameters<typeof Combined3D>[0]) {
  return (
    <>
      <Scene3D size={Math.max(props.largo, props.ancho) * 1.4}>
        <Combined3D {...props} />
      </Scene3D>
      <Scene3DHint />
    </>
  );
}
