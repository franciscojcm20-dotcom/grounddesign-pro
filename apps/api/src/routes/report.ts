import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  generateReportBuffer,
  generateGridDxf, generateRodDxf, generateStripDxf, generateRadialDxf, generateRingDxf, generateCombinedDxf,
  type ReportMeta, type ReportSection,
  type GridDxfInput, type RodDxfInput, type StripDxfInput, type RadialDxfInput, type RingDxfInput, type CombinedDxfInput,
} from '@gdp/pdf-engine';
import type { ValorizacionResult, CubicacionInput, PreciosUnitariosCLP } from '@gdp/engines-math';

// ─── Module adapters — shape raw calc output into ReportSection ───────────────

/**
 * Recomendación estándar para todo sistema de puesta a tierra proyectado: dejar
 * al menos un punto de acceso (cámara o cámarilla de registro) sobre el
 * conductor o electrodo, exigido por la normativa eléctrica de instalación de
 * la generalidad de los países soportados (ej. NCh Elec. 4/2003 en Chile,
 * RETIE en Colombia, REBT en España) para poder medir y verificar
 * periódicamente la resistencia de puesta a tierra sin excavar.
 */
const INSPECTION_CHAMBER_RECOMMENDATION =
  'Recomendación constructiva: dejar al menos una cámara o cámarilla de registro accesible sobre el conductor/electrodo de puesta a tierra (típicamente en el punto de conexión al sistema o en cada electrodo principal), conforme a la normativa eléctrica de instalación aplicable en el país del proyecto — permite medir y verificar periódicamente la resistencia de puesta a tierra sin necesidad de excavar.';

function wennerSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const pts = (outputs['points'] as Array<{ a: number; r: number; rhoA: number }>) ?? [];
  return {
    title: 'Resistividad de suelo — Wenner',
    norm: 'IEEE Std 81-2012, Cláusula 8.3',
    inputs: [
      { label: 'Nº lecturas', value: pts.length, unit: '' },
      { label: 'Espaciamientos a', value: pts.map(p => p.a).join(', '), unit: 'm' },
    ],
    results: [
      { label: 'ρ promedio', value: Number(outputs['rhoAvg']).toFixed(1), unit: 'Ω·m', highlight: true },
      { label: 'ρ1 (capa sup.)', value: Number((outputs['twoLayer'] as Record<string, number>)?.['rho1']).toFixed(1), unit: 'Ω·m' },
      { label: 'ρ2 (capa inf.)', value: Number((outputs['twoLayer'] as Record<string, number>)?.['rho2']).toFixed(1), unit: 'Ω·m' },
      { label: 'h estimada', value: String((outputs['twoLayer'] as Record<string, number>)?.['h']), unit: 'm' },
    ],
    pass: true,
    passLabel: `Procesadas ${pts.length} lecturas de campo — IEEE 81-2012`,
    observations: [
      'Fenómeno físico: el método de Wenner inyecta una corriente conocida entre dos electrodos externos y mide la diferencia de potencial entre dos electrodos internos equiespaciados; la resistividad aparente medida representa un promedio ponderado del volumen de suelo bajo el arreglo, hasta una profundidad aproximadamente igual al espaciamiento a.',
      'Fórmula aplicada: ρa = 2π·a·R, donde a es el espaciamiento entre electrodos y R la resistencia medida (V/I).',
      'Hipótesis del modelo: electrodos puntuales alineados y equiespaciados, superficie del terreno plana y homogénea a la escala del ensayo.',
      'Rol en el proyecto: en este software, Wenner opera como método de validación cruzada del modelo de suelo obtenido por Schlumberger (método primario) — una diferencia significativa entre ambos modelos debe investigarse antes de dimensionar el sistema de puesta a tierra.',
    ],
  };
}

function gridSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const Rg = Number(outputs['Rg']);
  const compliance = outputs['compliance'] as { rg1ohm?: { pass: boolean }; rg5ohm?: { pass: boolean } } | undefined;
  const pass = Boolean(compliance?.rg1ohm?.pass) || Boolean(compliance?.rg5ohm?.pass);
  const rho = Number(outputs['rhoUsado'] ?? inputs['rho']);
  const area = Number(outputs['area']);
  const Ltotal = Number(outputs['Ltotal']);
  const gelInfo = outputs['gelInfo'] as { activo?: boolean } | null | undefined;
  return {
    title: 'Resistencia de malla de puesta a tierra — Método de Sverak',
    norm: 'IEEE Std 80-2013, Cláusula 14.2, Ecuación 52',
    inputs: [
      { label: 'Largo',          value: Number(inputs['largo']).toFixed(1),         unit: 'm' },
      { label: 'Ancho',          value: Number(inputs['ancho']).toFixed(1),         unit: 'm' },
      { label: 'Profundidad de enterramiento', value: Number(inputs['profundidad']).toFixed(2), unit: 'm' },
      { label: 'Nº conductores (largo)', value: Number(inputs['nConductoresL']).toFixed(0), unit: '' },
      { label: 'Nº conductores (ancho)', value: Number(inputs['nConductoresW']).toFixed(0), unit: '' },
      { label: 'Nº varillas perimetrales', value: Number(inputs['nVarillas']).toFixed(0), unit: '' },
      { label: 'Longitud de varilla', value: Number(inputs['longVarilla']).toFixed(1), unit: 'm' },
      { label: 'ρ suelo (aplicada)', value: rho.toFixed(1), unit: 'Ω·m' },
      { label: 'Corriente de falla', value: Number(inputs['iFalla']).toFixed(0), unit: 'A' },
    ],
    results: [
      { label: 'Rg (Sverak)', value: Rg.toFixed(4), unit: 'Ω', highlight: true },
      { label: 'Área de la malla', value: area.toFixed(1), unit: 'm²' },
      { label: 'Longitud total de conductor Lt', value: Ltotal.toFixed(1), unit: 'm' },
      { label: 'GPR (elevación de potencial)', value: (Number(outputs['gpr']) / 1000).toFixed(2), unit: 'kV' },
    ],
    pass,
    passLabel: pass
      ? `Rg = ${Rg.toFixed(4)} Ω — CUMPLE el límite normativo aplicable (≤1 Ω subestaciones AT / ≤5 Ω distribución MT)`
      : `Rg = ${Rg.toFixed(4)} Ω — NO CUMPLE ningún límite normativo aplicable`,
    observations: [
      'Fenómeno físico: la resistencia de puesta a tierra representa la oposición que ofrece el volumen de suelo circundante al paso de la corriente de falla hacia tierra remota; depende de la resistividad del terreno y de la geometría (área y longitud de conductor) del electrodo.',
      'Fórmula aplicada — Sverak (1979), IEEE Std 80-2013 Ec. 52: Rg = ρ·[1/Lt + (1/√(20·A))·(1 + 1/(1 + h·√(20/A)))], donde ρ es la resistividad efectiva del suelo, Lt la longitud total de conductor enterrado, A el área de la malla y h la profundidad de enterramiento.',
      'Hipótesis del modelo: suelo homogéneo o representado por un modelo equivalente de dos capas; el método de Sverak es una aproximación empírica validada para geometrías rectangulares o cuasi-rectangulares y pierde precisión en geometrías muy irregulares.',
      gelInfo?.activo
        ? `Se aplicó tratamiento químico del suelo (aditivo gel) para reducir la resistividad efectiva a ${rho.toFixed(1)} Ω·m — ver módulo de aditivo gel químico para el fundamento de esa reducción.`
        : 'No se aplicó tratamiento químico del suelo; la resistividad utilizada corresponde directamente al modelo de suelo medido en terreno.',
      pass
        ? 'Juicio de ingeniería: la geometría propuesta es adecuada para la resistividad del sitio; no se identifican acciones correctivas obligatorias, sin perjuicio de optimizaciones de costo.'
        : 'Juicio de ingeniería: se recomienda aumentar la longitud total de conductor (más conductores o varillas) o ampliar el área de la malla; alternativamente, evaluar tratamiento químico del suelo si la resistividad es el factor limitante.',
      'Limitación normativa: el criterio de Rg por sí solo no garantiza la seguridad de las personas — la verificación definitiva del diseño es el cumplimiento de las tensiones de paso y contacto (IEEE Std 80-2013 Cl. 16), presentadas en la sección correspondiente de este informe.',
      INSPECTION_CHAMBER_RECOMMENDATION,
    ],
  };
}

function conductorSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const seleccionado = outputs['seleccionado'] as { calibre?: string; mm2?: number } | undefined;
  const sugerido = outputs['sugerido'] as { calibre?: string; mm2?: number } | undefined;
  const margen = Number(outputs['margen']);
  const esManual = Boolean(outputs['esSeleccionManual']);
  return {
    title: 'Dimensionamiento de conductor de puesta a tierra — Método de Onderdonk',
    norm: 'IEEE Std 80-2013, Cláusula 11.3',
    inputs: [
      { label: 'Corriente de falla', value: Number(inputs['iFalla'] ?? inputs['Ifalla_kA']).toFixed(2), unit: 'kA' },
      { label: 'Tiempo de despeje',  value: Number(inputs['tFalla']).toFixed(3), unit: 's' },
      { label: 'Temp. ambiente',     value: Number(inputs['tempAmbiente']), unit: '°C' },
      { label: 'Temp. máx. de fusión', value: Number(inputs['tempMaxFusion']), unit: '°C' },
    ],
    results: [
      { label: 'Área mínima requerida', value: Number(outputs['areaMm2']).toFixed(2), unit: 'mm²', highlight: true },
      { label: 'Calibre sugerido',      value: sugerido?.calibre ?? '—', unit: `${sugerido?.mm2 ?? '—'} mm²` },
      { label: 'Calibre seleccionado',  value: seleccionado?.calibre ?? '—', unit: `${seleccionado?.mm2 ?? '—'} mm²` },
      { label: 'Margen de seguridad',   value: margen.toFixed(1), unit: '%' },
    ],
    pass: true,
    passLabel: `Calibre ${seleccionado?.calibre ?? sugerido?.calibre} seleccionado — cumple el método de fusión adiabática de Onderdonk`,
    observations: [
      'Fenómeno físico: durante una falla a tierra, la corriente circula por el conductor durante el tiempo de despeje de las protecciones; la energía disipada por efecto Joule eleva la temperatura del conductor, que no debe superar la temperatura de fusión del material sin dañar el aislamiento ni el propio conductor.',
      'Fórmula aplicada — Onderdonk, IEEE Std 80-2013 Ec. 37: A[mm²] = (I[kA]·197.4) / √[(TCAP/(tc·αr·ρr))·ln((Ko+Tm)/(Ko+Ta))], donde TCAP es la capacidad calorífica térmica, αr y ρr son coeficientes del material (cobre), Tm la temperatura máxima admisible y Ta la temperatura ambiente.',
      'Hipótesis del modelo: proceso adiabático (sin disipación de calor al medio durante el tiempo de falla, válido para tc < 1-3 s típico de protecciones de sistemas de potencia); propiedades térmicas del cobre constantes en el rango de temperatura considerado.',
      esManual
        ? 'El calibre fue seleccionado manualmente por el usuario; se verifica que su sección sea igual o superior al área mínima calculada.'
        : 'El calibre fue seleccionado automáticamente por el sistema, tomando el primer calibre normalizado (tabla AWG/kcmil) igual o superior al área mínima requerida.',
      `Juicio de ingeniería: un margen de seguridad de ${margen.toFixed(1)}% sobre el área mínima calculada es adecuado para absorber incertidumbres en el estudio de cortocircuito y la coordinación de protecciones; no se recomienda seleccionar un calibre con margen negativo.`,
    ],
  };
}

function voltagesSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const mesh = outputs['mesh'] as { Em?: number; Km?: number; Ki?: number } | undefined;
  const step = outputs['step'] as { Es?: number } | undefined;
  const compliance = outputs['compliance'] as { touch?: { pass: boolean }; step?: { pass: boolean } } | undefined;
  const passTouch = Boolean(compliance?.touch?.pass);
  const passStep  = Boolean(compliance?.step?.pass);
  const pass      = passTouch && passStep;
  const eTouchAdm = Number(outputs['eTouchAdm_V']);
  const eStepAdm  = Number(outputs['eStepAdm_V']);
  return {
    title: 'Verificación de tensiones de paso y contacto',
    norm: 'IEEE Std 80-2013, Cláusula 16',
    inputs: [
      { label: 'ρ suelo',           value: Number(inputs['rho']).toFixed(0),           unit: 'Ω·m' },
      { label: 'ρ capa superficial', value: Number(inputs['rhoSuperficial']).toFixed(0), unit: 'Ω·m' },
      { label: 'Espesor capa superficial', value: Number(inputs['hSuperficial']).toFixed(2), unit: 'm' },
      { label: 'Corriente de falla Ig', value: Number(inputs['Ig']).toFixed(0), unit: 'A' },
      { label: 'Tiempo de despeje', value: Number(inputs['tFalla']).toFixed(3), unit: 's' },
      { label: 'Peso de persona',   value: Number(inputs['peso']).toFixed(0), unit: 'kg' },
    ],
    results: [
      { label: 'Em (tensión de contacto real)', value: Number(mesh?.Em).toFixed(1), unit: 'V', highlight: true },
      { label: 'Es (tensión de paso real)',      value: Number(step?.Es).toFixed(1), unit: 'V', highlight: true },
      { label: 'Etouch admisible', value: eTouchAdm.toFixed(1), unit: 'V' },
      { label: 'Estep admisible',  value: eStepAdm.toFixed(1), unit: 'V' },
      { label: 'Cs (factor capa superficial)', value: Number(outputs['Cs']).toFixed(4), unit: '' },
      { label: 'Km (factor de malla)', value: Number(mesh?.Km).toFixed(4), unit: '' },
    ],
    pass,
    passLabel: pass
      ? 'Em ≤ Etouch_adm y Es ≤ Estep_adm — CUMPLE IEEE Std 80-2013 Cl. 16'
      : `${!passTouch ? `Em (${Number(mesh?.Em).toFixed(0)} V) > Etouch_adm (${eTouchAdm.toFixed(0)} V) ` : ''}${!passStep ? `Es (${Number(step?.Es).toFixed(0)} V) > Estep_adm (${eStepAdm.toFixed(0)} V)` : ''} — NO CUMPLE`,
    observations: [
      'Fenómeno físico: durante una falla a tierra, el gradiente de potencial en la superficie del suelo puede someter a una persona a una diferencia de tensión entre dos puntos de contacto (mano-pie, tensión de contacto) o entre ambos pies (tensión de paso); si esta diferencia supera el umbral de fibrilación ventricular del cuerpo humano, existe riesgo de electrocución.',
      'Fórmula de tensión real — Sverak (simplificada), IEEE Std 80-2013 Cl. 16.5: Em = ρ·Ki·Ig·Km/Lt (contacto) y Es = ρ·Ks·Ki·Ig/Lt (paso), donde Km y Ks son factores geométricos que dependen del espaciamiento de conductores, profundidad y diámetro, y Ki es un factor de irregularidad de corriente.',
      'Fórmula de tensión admisible — Dalziel (1956, 1968), IEEE Std 80-2013 Cl. 16.3: Etouch_adm = (1000 + 1.5·Cs·ρs)·k/√tc, Estep_adm = (1000 + 6·Cs·ρs)·k/√tc, con k = 0.157 (persona de 70 kg) o 0.116 (50 kg); estas fórmulas modelan la impedancia del cuerpo humano y la energía tolerable sin fibrilación ventricular en función del tiempo de exposición.',
      'Hipótesis del modelo: persona descalza o con calzado no aislante en contacto directo con el gradiente de potencial superficial; el factor Cs de la capa superficial (grava) reduce la corriente que efectivamente circula por el cuerpo al aumentar la resistencia de contacto pie-suelo.',
      pass
        ? 'Juicio de ingeniería: el diseño garantiza que ninguna persona en el área de la instalación estaría expuesta a tensiones superiores a las admisibles durante una falla a tierra, bajo las hipótesis y parámetros considerados.'
        : 'Juicio de ingeniería: se recomienda aumentar el espesor o la resistividad de la capa superficial de grava (sube directamente el límite admisible), aumentar la longitud total de conductor de la malla (reduce el valor real), o revisar el espaciamiento de conductores en zonas críticas.',
    ],
  };
}

// ─── Adaptadores de topologías adicionales (rod, strip, radial, ring, combined) ──

function rodSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const Rn = Number(outputs['Rn']);
  const compliance = outputs['compliance'] as { rg1?: boolean; rg5?: boolean } | undefined;
  const pass = Boolean(compliance?.rg1) || Boolean(compliance?.rg5);
  return {
    title: 'Electrodos verticales (picas) — Método de Dwight y Sunde',
    norm: 'Dwight (1936), Sunde (1949) — IEEE Std 80-2013 Annex B.1',
    inputs: [
      { label: 'Nº de picas',        value: Number(inputs['n']).toFixed(0), unit: '' },
      { label: 'Longitud de pica',   value: Number(inputs['L']).toFixed(1), unit: 'm' },
      { label: 'Separación entre picas', value: Number(inputs['spacing']).toFixed(1), unit: 'm' },
      { label: 'ρ suelo (aplicada)', value: Number(outputs['rhoUsado'] ?? inputs['rho']).toFixed(1), unit: 'Ω·m' },
    ],
    results: [
      { label: 'Rn (n picas en paralelo)', value: Rn.toFixed(3), unit: 'Ω', highlight: true },
      { label: 'R1 (una pica aislada)',    value: Number(outputs['R1']).toFixed(3), unit: 'Ω' },
      { label: 'Rm (resistencia mutua por par)', value: Number(outputs['Rm']).toFixed(3), unit: 'Ω' },
      { label: 'GPR', value: (Number(outputs['gpr']) / 1000).toFixed(2), unit: 'kV' },
    ],
    pass,
    passLabel: pass ? `Rn = ${Rn.toFixed(3)} Ω — CUMPLE` : `Rn = ${Rn.toFixed(3)} Ω — NO CUMPLE`,
    observations: [
      'Fenómeno físico: cada electrodo vertical disipa corriente radialmente en el suelo; cuando varios electrodos se instalan próximos entre sí, sus campos de dispersión se superponen (acoplamiento o resistencia mutua), reduciendo la eficiencia de cada pica adicional respecto de si estuviera aislada.',
      'Fórmula de Dwight (resistencia de una pica): R1 = (ρ/2πL)·[ln(4L/a) − 1]. Fórmula de Sunde (resistencia mutua entre dos picas): Rm = (ρ/2πL)·[ln(2L/s) − 1]. Combinación en paralelo para n picas: Rn = (R1 + (n−1)·Rm)/n.',
      'Hipótesis del modelo: picas verticales de longitud L y radio a uniformemente distribuidas en línea con separación s constante; el modelo pierde precisión para arreglos no lineales o muy irregulares, donde se recomienda un análisis numérico de campo.',
      'Juicio de ingeniería: para separaciones s ≥ 2L el acoplamiento mutuo es reducido y el beneficio marginal de cada pica adicional es cercano al de una pica aislada; para s < 2L, agregar más picas tiene retornos decrecientes y puede ser más eficiente alargar las picas existentes.',
      INSPECTION_CHAMBER_RECOMMENDATION,
    ],
  };
}

function stripSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const Rh = Number(outputs['Rh']);
  const compliance = outputs['compliance'] as { rg1?: boolean; rg5?: boolean } | undefined;
  const pass = Boolean(compliance?.rg1) || Boolean(compliance?.rg5);
  return {
    title: 'Conductor horizontal enterrado — Método de Dwight',
    norm: 'Dwight (1936) — IEEE Std 80-2013 Annex B.3',
    inputs: [
      { label: 'Longitud total',     value: Number(inputs['L']).toFixed(1), unit: 'm' },
      { label: 'Profundidad de enterramiento', value: Number(inputs['h']).toFixed(2), unit: 'm' },
      { label: 'ρ suelo (aplicada)', value: Number(outputs['rhoUsado'] ?? inputs['rho']).toFixed(1), unit: 'Ω·m' },
    ],
    results: [
      { label: 'Rh (resistencia del conductor)', value: Rh.toFixed(3), unit: 'Ω', highlight: true },
      { label: 'GPR', value: (Number(outputs['gpr']) / 1000).toFixed(2), unit: 'kV' },
    ],
    pass,
    passLabel: pass ? `Rh = ${Rh.toFixed(3)} Ω — CUMPLE` : `Rh = ${Rh.toFixed(3)} Ω — NO CUMPLE`,
    observations: [
      'Fenómeno físico: un conductor horizontal enterrado se comporta como un electrodo extendido cuya resistencia depende principalmente de su longitud total, ya que no hay efecto de área acumulada como en una malla bidimensional.',
      'Fórmula de Dwight: R = (ρ/πL)·[ln(2L²/(a·h)) − 1], donde a es el radio del conductor y h la profundidad de enterramiento.',
      'Hipótesis del modelo: conductor recto de longitud L; para trazados curvos o en L el modelo es una aproximación conservadora.',
      'Juicio de ingeniería: dado que R decrece aproximadamente con 1/L, este electrodo requiere mayor longitud de conductor que una malla equivalente para alcanzar la misma resistencia; es más adecuado como complemento de otros electrodos que como solución única en suelos de alta resistividad.',
      INSPECTION_CHAMBER_RECOMMENDATION,
    ],
  };
}

function radialSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const Rstar = Number(outputs['Rstar']);
  const compliance = outputs['compliance'] as { rg1?: boolean; rg5?: boolean } | undefined;
  const pass = Boolean(compliance?.rg1) || Boolean(compliance?.rg5);
  return {
    title: 'Sistema radial / estrella — Método de Laurent-Niemann',
    norm: 'Laurent (1952), Niemann (1952) — IEEE Std 80-2013 Annex B',
    inputs: [
      { label: 'Nº de radiales',    value: Number(inputs['n']).toFixed(0), unit: '' },
      { label: 'Longitud de cada radial', value: Number(inputs['L']).toFixed(1), unit: 'm' },
      { label: 'Profundidad',       value: Number(inputs['h']).toFixed(2), unit: 'm' },
      { label: 'ρ suelo (aplicada)', value: Number(outputs['rhoUsado'] ?? inputs['rho']).toFixed(1), unit: 'Ω·m' },
    ],
    results: [
      { label: 'R★ (sistema radial)', value: Rstar.toFixed(3), unit: 'Ω', highlight: true },
      { label: 'R1 (un radial aislado)', value: Number(outputs['R1']).toFixed(3), unit: 'Ω' },
      { label: 'Longitud total', value: Number(outputs['Ltotal']).toFixed(1), unit: 'm' },
      { label: 'GPR', value: (Number(outputs['gpr']) / 1000).toFixed(2), unit: 'kV' },
    ],
    pass,
    passLabel: pass ? `R★ = ${Rstar.toFixed(3)} Ω — CUMPLE` : `R★ = ${Rstar.toFixed(3)} Ω — NO CUMPLE`,
    observations: [
      'Fenómeno físico: n conductores dispuestos radialmente desde un punto central disipan corriente en direcciones angulares distintas, reduciendo el acoplamiento mutuo respecto de conductores paralelos, pero con un factor de corrección por el ángulo compartido en el centro.',
      'Fórmula de Niemann: R★ = (ρ/(π·n·L))·[ln(2L²/(a·h)) − 1 + (n−1)·(h/L)], que corrige la resistencia de un radial aislado por el número de radiales y su acoplamiento mutuo en el punto de conexión común.',
      'Hipótesis del modelo: radiales de igual longitud L distribuidos con igual separación angular (360°/n); geometrías con radiales de longitud desigual requieren un análisis por superposición.',
      'Juicio de ingeniería: útil en terrenos alargados o con restricciones de espacio donde una malla rectangular no es viable (ej. líneas de transmisión, torres); el beneficio marginal de agregar radiales decrece por el acoplamiento mutuo en el centro.',
      INSPECTION_CHAMBER_RECOMMENDATION,
    ],
  };
}

function ringSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const Rring = Number(outputs['Rring']);
  const compliance = outputs['compliance'] as { rg1?: boolean; rg5?: boolean } | undefined;
  const pass = Boolean(compliance?.rg1) || Boolean(compliance?.rg5);
  return {
    title: 'Anillo perimetral — Método de Sunde',
    norm: 'Sunde (1949) — IEEE Std 80-2013 §14.3',
    inputs: [
      { label: 'Perímetro',   value: Number(inputs['perimeter']).toFixed(1), unit: 'm' },
      { label: 'Profundidad', value: Number(inputs['h']).toFixed(2), unit: 'm' },
      { label: 'ρ suelo (aplicada)', value: Number(outputs['rhoUsado'] ?? inputs['rho']).toFixed(1), unit: 'Ω·m' },
    ],
    results: [
      { label: 'Rring', value: Rring.toFixed(3), unit: 'Ω', highlight: true },
      { label: 'Radio equivalente r', value: Number(outputs['rEq']).toFixed(2), unit: 'm' },
      { label: 'GPR', value: (Number(outputs['gpr']) / 1000).toFixed(2), unit: 'kV' },
    ],
    pass,
    passLabel: pass ? `Rring = ${Rring.toFixed(3)} Ω — CUMPLE` : `Rring = ${Rring.toFixed(3)} Ω — NO CUMPLE`,
    observations: [
      'Fenómeno físico: un anillo cerrado se comporta de forma similar a un electrodo circular equivalente; la corriente se dispersa radialmente hacia afuera y hacia el centro del anillo, con un comportamiento intermedio entre un conductor recto y una malla cerrada.',
      'Fórmula de Sunde: R = (ρ/(2π²·r))·[ln(8r/a) + ln(2r/h) − 2], donde r = P/(2π) es el radio equivalente del anillo (P = perímetro real, sea circular o rectangular).',
      'Hipótesis del modelo: anillo aproximadamente circular o de aspecto cercano al circular; para geometrías muy alargadas (relación largo/ancho alta) el radio equivalente pierde representatividad y se recomienda verificar con el método de malla rectangular.',
      'Juicio de ingeniería: la resistencia depende fuertemente del radio equivalente (por ende, del perímetro) — ampliar la huella del anillo es la acción más efectiva para reducir Rring en suelos de alta resistividad.',
      INSPECTION_CHAMBER_RECOMMENDATION,
    ],
  };
}

function combinedSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const Rc = Number(outputs['Rc']);
  const compliance = outputs['compliance'] as { rg1?: boolean; rg5?: boolean } | undefined;
  const pass = Boolean(compliance?.rg1) || Boolean(compliance?.rg5);
  return {
    title: 'Malla combinada con electrodos verticales — Método de Schwarz',
    norm: 'Schwarz (1954) — IEEE Std 80-2013 §14.5',
    inputs: [
      { label: 'Área de la malla', value: Number(inputs['area']).toFixed(1), unit: 'm²' },
      { label: 'Longitud total conductores de malla', value: Number(inputs['Ltotal']).toFixed(1), unit: 'm' },
      { label: 'Profundidad de malla', value: Number(inputs['depth']).toFixed(2), unit: 'm' },
      { label: 'Nº de picas adicionales', value: Number(inputs['nRods']).toFixed(0), unit: '' },
      { label: 'Longitud de picas', value: Number(inputs['rodLength']).toFixed(1), unit: 'm' },
      { label: 'ρ suelo (aplicada)', value: Number(outputs['rhoUsado'] ?? inputs['rho']).toFixed(1), unit: 'Ω·m' },
    ],
    results: [
      { label: 'Rc (combinada, Schwarz)', value: Rc.toFixed(3), unit: 'Ω', highlight: true },
      { label: 'Rg (malla sola, Sverak)', value: Number(outputs['Rg']).toFixed(3), unit: 'Ω' },
      { label: 'Rr (picas en paralelo)', value: Number(outputs['Rr']).toFixed(3), unit: 'Ω' },
      { label: 'Rmr (acoplamiento malla-picas)', value: Number(outputs['Rmr']).toFixed(3), unit: 'Ω' },
      { label: 'Mejora vs. malla sola', value: Number(outputs['mejora']).toFixed(1), unit: '%' },
    ],
    pass,
    passLabel: pass ? `Rc = ${Rc.toFixed(3)} Ω — CUMPLE (mejora ${Number(outputs['mejora']).toFixed(1)}% vs. malla sola)` : `Rc = ${Rc.toFixed(3)} Ω — NO CUMPLE`,
    observations: [
      'Fenómeno físico: la combinación de una malla horizontal con electrodos verticales adicionales aprovecha que las picas alcanzan capas de suelo más profundas (potencialmente de menor resistividad) mientras la malla controla el gradiente de potencial superficial; ambos sistemas están acoplados eléctricamente al compartir el mismo volumen de suelo.',
      'Fórmula de Schwarz: Rc = (Rg·Rr − Rmr²)/(Rg + Rr − 2·Rmr), donde Rg es la resistencia de la malla sola (Sverak), Rr la resistencia de las picas en paralelo (Dwight/Sunde) y Rmr la resistencia mutua de acoplamiento entre ambos sistemas.',
      'Hipótesis del modelo: picas distribuidas dentro o en el perímetro del área de la malla; el término de acoplamiento Rmr es una aproximación y su precisión disminuye si las picas están muy alejadas del área de la malla.',
      'Juicio de ingeniería: esta topología es especialmente efectiva en suelos estratificados donde la capa profunda tiene menor resistividad que la superficial (perfil tipo K); si el perfil es inverso (capa profunda de mayor resistividad), el beneficio de las picas adicionales es marginal y se debe priorizar la ampliación de la malla.',
      INSPECTION_CHAMBER_RECOMMENDATION,
    ],
  };
}


function freeformSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const Rg = Number(outputs['Rg']);
  const vertices = (inputs['vertices'] as { x: number; y: number }[] | undefined) ?? [];
  const rods = (inputs['rods'] as { x: number; y: number }[] | undefined) ?? [];
  const rg1 = Rg <= 1, rg5 = Rg <= 5;
  const momRg = outputs['momRg'] as number | undefined;
  const momTruncated = Boolean(outputs['momTruncated']);

  const results = [
    { label: 'Rg (Sverak, polígono)', value: Rg.toFixed(3), unit: 'Ω', highlight: true },
    { label: 'Área del polígono', value: Number(inputs['area'] ?? outputs['area']).toFixed(1), unit: 'm²' },
    { label: 'Perímetro', value: Number(inputs['perimeter'] ?? outputs['perimeter']).toFixed(1), unit: 'm' },
    { label: 'GPR', value: (Number(outputs['gpr']) / 1000).toFixed(2), unit: 'kV' },
  ];
  if (momRg !== undefined) {
    results.push({ label: 'Rg (Método de Momentos, perímetro)', value: momRg.toFixed(3), unit: 'Ω', highlight: true });
  }

  return {
    title: 'Malla de geometría libre — Sverak generalizado a polígono arbitrario',
    norm: 'Sverak (área/perímetro de polígono) — IEEE Std 80-2013 Cl. 14.2',
    inputs: [
      { label: 'Vértices del polígono', value: vertices.length, unit: '' },
      { label: 'Picas', value: rods.length, unit: '' },
      { label: 'Longitud de pica', value: Number(inputs['rodLength']).toFixed(1), unit: 'm' },
      { label: 'Profundidad de enterramiento', value: Number(inputs['depth'] ?? inputs['profundidad']).toFixed(2), unit: 'm' },
      { label: 'ρ suelo (aplicada)', value: Number(inputs['rho']).toFixed(1), unit: 'Ω·m' },
    ],
    results,
    pass: rg1 || rg5,
    passLabel: (rg1 || rg5) ? `Rg = ${Rg.toFixed(3)} Ω — CUMPLE` : `Rg = ${Rg.toFixed(3)} Ω — NO CUMPLE`,
    observations: [
      'Fenómeno físico: idéntico al de una malla rectangular (Sverak) — la resistencia depende del área encerrada y la longitud total de conductor, sin exigir una huella rectangular; se calcula el área y el perímetro reales del polígono dibujado (fórmula del shoelace) en vez de largo×ancho.',
      'Fórmula: Rg = ρ·[1/Lt + (1/√(20A))·(1 + 1/(1+h√(20/A)))], con A y P calculados sobre los vértices del polígono.',
      'Hipótesis del modelo: sigue siendo la aproximación empírica de Sverak, validada para geometrías cuasi-rectangulares; en huellas muy irregulares o con concavidades pronunciadas, la aproximación pierde precisión.',
      ...(momRg !== undefined ? [
        `Verificación cruzada — Método de Momentos: se resolvió además el sistema real de corrientes por segmento del perímetro (función de Green de dos capas, Sunde), obteniendo Rg = ${momRg.toFixed(3)} Ω. A diferencia de Sverak (fórmula empírica basada en área/perímetro), el MoM resuelve directamente el acoplamiento mutuo entre segmentos — es más riguroso para geometría irregular, pero en este cálculo no incluye las picas (solo el perímetro).${momTruncated ? ' La geometría se recortó al límite de segmentos del solver.' : ''}`,
      ] : []),
      INSPECTION_CHAMBER_RECOMMENDATION,
    ],
  };
}

function lightningSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const pReq = Boolean(outputs['protectionRequired']);
  return {
    title: 'Protección contra rayos — Esfera rodante',
    norm: 'IEC 62305-2/3 · NFPA 780',
    inputs: [
      { label: 'Largo estructura',       value: Number(inputs['structureLength']).toFixed(0),      unit: 'm'  },
      { label: 'Ancho estructura',       value: Number(inputs['structureWidth']).toFixed(0),       unit: 'm'  },
      { label: 'Altura estructura',      value: Number(inputs['structureHeight']).toFixed(0),      unit: 'm'  },
      { label: 'Densidad descargas Ng',  value: Number(inputs['groundFlashDensity']).toFixed(1),  unit: 'desc/km²/año' },
      { label: 'Nivel LPS',             value: String(inputs['lpsLevel']),                         unit: ''   },
      { label: 'Factor entorno Cd',      value: Number(inputs['environmentFactor'] ?? 1).toFixed(2), unit: '' },
    ],
    results: [
      { label: 'Radio esfera rodante r', value: Number(outputs['rollingSphereRadius']).toFixed(0), unit: 'm',  highlight: true },
      { label: 'Área captación Ad',      value: Number(outputs['collectionAreaM2']).toFixed(0),    unit: 'm²' },
      { label: 'Frecuencia anual Nd',    value: Number(outputs['annualStrikes']).toFixed(4),       unit: ''   },
      { label: 'Frec. tolerable NT',     value: Number(outputs['tolerableFrequency']).toExponential(0), unit: '' },
      { label: 'Eficiencia requerida E', value: `${(Number(outputs['efficiencyRequired']) * 100).toFixed(1)} %`, unit: '', highlight: pReq },
      { label: 'Nivel LPS recomendado',  value: `LPS ${outputs['recommendedLevel']}`,             unit: ''   },
      { label: 'Conductores descendentes', value: String(outputs['downConductors']),               unit: ''   },
    ],
    pass: !pReq,
    passLabel: pReq
      ? `Nd > NT — SE REQUIERE SPR nivel LPS ${outputs['recommendedLevel']}`
      : 'Nd ≤ NT — No se requiere sistema de protección contra rayos',
    observations: [
      'Método esfera rodante per IEC 62305-3 Tabla 2 y NFPA 780 §4.3',
      `Área de captación: Ad = L·W + 2·(L+W)·H + π·H² = ${Number(outputs['collectionAreaM2']).toFixed(0)} m²`,
    ],
  };
}

function valorizacionSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const cub = inputs as unknown as CubicacionInput & { precios?: PreciosUnitariosCLP };
  const val = outputs as unknown as ValorizacionResult;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
  return {
    title: 'Cubicación y Valorización Económica',
    norm: 'Cubicación propia del sistema — precios de referencia editables',
    inputs: [
      { label: 'Conductor total',  value: cub.conductorMetros.toFixed(1), unit: 'm' },
      { label: 'Sección conductor', value: cub.conductorSeccionMm2.toFixed(1), unit: 'mm²' },
      { label: 'Varillas',          value: cub.varillasCantidad, unit: 'un' },
      { label: 'Conectores',        value: cub.conectoresCantidad, unit: 'un' },
      ...(cub.gelActivo ? [{ label: 'Aditivo gel', value: cub.gelKg.toFixed(1), unit: 'kg' }] : []),
    ],
    results: [
      ...val.items.map(it => ({
        label: `${it.item} (${it.cantidad} ${it.unidad} × ${fmt(it.precioUnitCLP)})`,
        value: fmt(it.subtotalCLP), unit: '',
      })),
      { label: 'Subtotal materiales', value: fmt(val.subtotalMateriales), unit: '' },
      { label: 'Mano de obra',        value: fmt(val.manoObra), unit: '' },
      { label: 'Imprevistos',         value: fmt(val.imprevistos), unit: '' },
      { label: 'TOTAL VALORIZADO',    value: fmt(val.total), unit: 'CLP', highlight: true },
    ],
    pass: true,
    passLabel: `Valorización total: ${fmt(val.total)} CLP (referencial)`,
    observations: [
      'Cubicación derivada de la geometría real del sistema diseñado y calculado en este software.',
      'Los precios unitarios son de referencia de mercado y deben ser ajustados por el profesional según cotización vigente antes de uso contractual.',
      'Documento independiente del informe técnico normativo — corresponde exclusivamente a la valorización económica de la propuesta.',
    ],
  };
}

function soilModelSection(inputs: Record<string, unknown>): ReportSection {
  const schlum = (inputs['schlumbergerReadings'] as Array<{ L: number; l: number; r: number }>) ?? [];
  const wenner = (inputs['wennerReadings'] as Array<{ a: number; r: number }>) ?? [];
  const validatedBy = inputs['validatedBy'] as { deltaPct: number; rho1: number; rho2: number } | undefined;
  const source = String(inputs['source']);

  const curvaRows = [
    ...schlum.map(p => ({ label: `Schlumberger L=${p.L} l=${p.l}`, value: `${p.r.toFixed(2)} Ω`, unit: `(L/l=${(p.L / p.l).toFixed(1)})` })),
    ...wenner.map(p => ({ label: `Wenner a=${p.a} m`, value: `${p.r.toFixed(2)} Ω`, unit: '' })),
  ];

  return {
    title: 'Modelo de Suelo — Curva de Sondeo Eléctrico Vertical (VES)',
    norm: 'IEEE Std 81-2012, Cláusula 8',
    inputs: [
      { label: 'Método primario', value: source === 'schlumberger' ? 'Schlumberger' : 'Wenner', unit: '' },
      { label: 'Nº lecturas Schlumberger', value: schlum.length, unit: '' },
      { label: 'Nº lecturas Wenner (validación)', value: wenner.length, unit: '' },
    ],
    results: [
      { label: 'ρ1 (capa superior)', value: Number(inputs['rho1']).toFixed(1), unit: 'Ω·m', highlight: true },
      { label: 'ρ2 (capa inferior)', value: Number(inputs['rho2']).toFixed(1), unit: 'Ω·m', highlight: true },
      { label: 'h (profundidad de interfaz)', value: Number(inputs['h']).toFixed(2), unit: 'm' },
      { label: 'ρ equivalente uniforme (√ρ1·ρ2)', value: Number(inputs['rhoUniform']).toFixed(1), unit: 'Ω·m' },
      ...(validatedBy ? [{ label: 'Validación cruzada Wenner — Δ%', value: validatedBy.deltaPct.toFixed(1), unit: '%', highlight: validatedBy.deltaPct > 20 }] : []),
      ...curvaRows,
    ],
    pass: !validatedBy || validatedBy.deltaPct <= 20,
    passLabel: validatedBy
      ? (validatedBy.deltaPct <= 20
        ? `Modelo validado — diferencia de ${validatedBy.deltaPct.toFixed(1)}% entre Schlumberger y Wenner (≤20%, aceptable)`
        : `Diferencia de ${validatedBy.deltaPct.toFixed(1)}% entre métodos supera el 20% recomendado — revisar mediciones antes de dimensionar`)
      : 'Modelo de suelo sin validación cruzada — se recomienda medir también con el método secundario',
    observations: [
      'Fenómeno físico: un sondeo eléctrico vertical (VES) inyecta corriente y mide potencial con espaciamientos crecientes entre electrodos; a mayor espaciamiento, la corriente penetra capas más profundas del suelo, permitiendo inferir un modelo estratificado (biestrato) de resistividad.',
      'Método primario — Schlumberger (IEEE Std 81-2012 Cl. 8): mantiene fijos los electrodos de potencial y expande solo los de corriente, reduciendo el número de desplazamientos de electrodos en terreno y mejorando la resolución de la curva de sondeo. La relación L/l debe mantenerse ≤ 5 según lo especificado en la norma para minimizar el error de aproximación.',
      'Método de validación — Wenner (IEEE Std 81-2012 Cl. 8.3): expande los cuatro electrodos equiespaciadamente; se usa aquí como verificación cruzada independiente del modelo obtenido por Schlumberger, no como fuente primaria de diseño.',
      'Modelo biestrato: ρ1 representa la resistividad de la capa superficial y ρ2 la de la capa profunda, con h la profundidad estimada de la interfaz; ρ equivalente uniforme (√(ρ1·ρ2)) es el valor que alimenta las fórmulas de electrodos que asumen suelo homogéneo (Sverak, Dwight, Sunde).',
      validatedBy && validatedBy.deltaPct > 20
        ? 'Juicio de ingeniería: una diferencia superior al 20% entre métodos sugiere posible error de medición (mala conexión de electrodos, interferencia de estructuras metálicas enterradas, escala incorrecta) o heterogeneidad lateral del suelo no capturada por el modelo biestrato — se recomienda repetir las mediciones antes de continuar con el diseño.'
        : 'Juicio de ingeniería: la concordancia entre ambos métodos respalda la confiabilidad del modelo de suelo utilizado como base de todos los cálculos de este proyecto.',
    ],
  };
}

const SPLIT_METHOD_LABEL: Record<string, string> = {
  manual: 'Manual (validado por estudio de distribución de corriente)',
  conservative: 'Conservador (Sf = 1, sin datos de trayectorias alternativas)',
  estimated: 'Estimado (aproximación propia según nº de trayectorias paralelas)',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  alta: 'Alta — validada por estudio específico de distribución de corriente',
  media: 'Media — estimación propia de ingeniería, no un estudio de distribución exacto',
  conservadora: 'Conservadora — maximiza Ig por falta de datos, sin optimización de costo',
};

/**
 * Capítulo "Determinación de la Corriente de Diseño del Sistema de Puesta a
 * Tierra" — se presenta inmediatamente después de las mediciones de terreno
 * (Schlumberger/Wenner/curvas patrón) y antes de cualquier cálculo de diseño
 * de malla, conforme a la secuencia de ingeniería de un proyecto profesional
 * de puesta a tierra. Ig, aquí determinada y justificada, es el parámetro
 * maestro que alimenta automáticamente todos los módulos de diseño posteriores.
 */
const FAULT_TYPE_LABEL: Record<string, string> = {
  trifasica: 'Trifásica simétrica',
  monofasica_tierra: 'Monofásica a tierra',
};

const GROUNDING_LABEL: Record<string, string> = {
  solido: 'Sólidamente aterrizado',
  resistencia: 'Aterrizado por resistencia',
  reactancia: 'Aterrizado por reactancia',
  aislado: 'Aislado (sin conexión a tierra)',
  desconocido: 'No especificada',
};

const SC_CONFIDENCE_LABEL: Record<string, string> = {
  alta: 'Alta — datos dentro de rangos típicos IEEE/IEC',
  media: 'Media — hipótesis o datos atípicos a verificar',
  estimada: 'Estimada — Z0 asumida y/o datos atípicos',
};

interface ShortCircuitTraceLike {
  tipoFalla: string;
  fuente: { un: number; ikss3: number; xr: number; ik1?: number };
  transformador?: { sn: number; un: number; vcc: number; xr: number; z0Factor?: number };
  zn?: number;
  aterramiento?: string;
  Z1: { R: number; X: number; Z: number };
  Z0: { R: number; X: number; Z: number } | null;
  z0Assumed: boolean;
  memoria: string[];
  recomendaciones?: string[];
  advertencias?: string[];
  confidence?: string;
}

function faultAnalysisSection(inputs: Record<string, unknown>): ReportSection {
  const If = Number(inputs['If']);
  const tFalla = Number(inputs['tFalla']);
  const xr = Number(inputs['xr']);
  const freq = Number(inputs['freq']);
  const Ta = Number(inputs['Ta']);
  const Df = Number(inputs['Df']);
  const Sf = Number(inputs['Sf']);
  const Ig = Number(inputs['Ig']);
  const splitMethod = String(inputs['splitMethod']);
  const splitJustificacion = String(inputs['splitJustificacion']);
  const confidence = String(inputs['confidence']);
  const ifOrigin = String(inputs['ifOrigin'] ?? 'manual');
  const sc = inputs['shortCircuitModel'] as ShortCircuitTraceLike | undefined;

  const scInputs = sc ? [
    { label: 'Tipo de falla modelada', value: FAULT_TYPE_LABEL[sc.tipoFalla] ?? sc.tipoFalla, unit: '' },
    ...(sc.aterramiento && sc.aterramiento !== 'desconocido'
      ? [{ label: 'Configuración de puesta a tierra del neutro', value: GROUNDING_LABEL[sc.aterramiento] ?? sc.aterramiento, unit: '' }]
      : []),
    { label: 'Un — tensión en el punto de falla', value: sc.fuente.un, unit: 'kV' },
    { label: "I''kss3 — Icc trifásica de la red", value: sc.fuente.ikss3, unit: 'kA' },
    { label: 'X/R de la fuente', value: sc.fuente.xr, unit: '' },
    ...(sc.fuente.ik1 ? [{ label: 'Ik1 — Icc monofásica de la red', value: sc.fuente.ik1, unit: 'kA' }] : []),
    ...(sc.transformador ? [
      { label: 'Sn — potencia del transformador', value: sc.transformador.sn, unit: 'kVA' },
      { label: 'Ucc — tensión de cortocircuito (placa)', value: sc.transformador.vcc, unit: '%' },
      { label: 'X/R del transformador', value: sc.transformador.xr, unit: '' },
    ] : []),
    ...(sc.zn ? [{ label: 'Zn — impedancia de puesta a tierra del neutro', value: sc.zn, unit: 'Ω' }] : []),
  ] : [];

  const scResults = sc ? [
    { label: 'Z1 total (red + transformador)', value: sc.Z1.Z.toFixed(4), unit: 'Ω' },
    ...(sc.Z0 ? [{ label: 'Z0 total (red + transformador)', value: `${sc.Z0.Z.toFixed(4)}${sc.z0Assumed ? ' (asumida ≈ Z1)' : ''}`, unit: 'Ω' }] : []),
  ] : [];

  return {
    title: 'Determinación de la Corriente de Diseño del Sistema de Puesta a Tierra',
    norm: 'IEEE Std 80-2013, Cláusula 15.9–15.10 (Ec. 79) — Motor de Análisis de Falla propio',
    inputs: [
      { label: 'Origen de If', value: ifOrigin === 'calculado' ? 'Modelado calculado del sistema (red + transformador)' : 'Valor conocido (estudio de cortocircuito existente)', unit: '' },
      ...scInputs,
      { label: 'Método de división de corriente', value: SPLIT_METHOD_LABEL[splitMethod] ?? splitMethod, unit: '' },
      { label: 'If — corriente de falla simétrica', value: If.toFixed(0), unit: 'A' },
      { label: 'tf — tiempo de despeje', value: tFalla, unit: 's' },
      { label: 'X/R en el punto de falla', value: xr, unit: '' },
      { label: 'Frecuencia del sistema', value: freq, unit: 'Hz' },
    ],
    results: [
      ...scResults,
      { label: 'Ta = (X/R)/(2πf) — constante de tiempo', value: Ta.toFixed(4), unit: 's' },
      { label: 'Df = √(1+(Ta/tf)(1−e^(−2tf/Ta))) — factor de decremento', value: Df.toFixed(4), unit: '' },
      { label: 'Sf — factor de división de corriente', value: Sf.toFixed(3), unit: '' },
      { label: 'If (resultado, corriente de falla)', value: If.toFixed(0), unit: 'A' },
      { label: 'Ig = If · Sf · Df (corriente de diseño oficial)', value: Ig.toFixed(0), unit: 'A', highlight: true },
    ],
    pass: true,
    passLabel: `Ig = ${If.toFixed(0)} × ${Sf.toFixed(3)} × ${Df.toFixed(4)} = ${Ig.toFixed(0)} A — corriente de diseño oficial del proyecto, aplicada automáticamente a todos los módulos posteriores`,
    observations: [
      `Nivel de confiabilidad: ${CONFIDENCE_LABEL[confidence] ?? confidence}.`,
      ...(sc ? [
        `Modelado del sistema para determinar If: ${sc.memoria.join(' ')}`,
        ...(sc.confidence ? [`Confiabilidad del modelo de cortocircuito: ${SC_CONFIDENCE_LABEL[sc.confidence] ?? sc.confidence}.`] : []),
        ...(sc.advertencias ?? []).map(a => `Advertencia de plausibilidad del modelo: ${a}`),
        ...(sc.recomendaciones ?? []).map(r => `Recomendación normativa: ${r}`),
        ...(sc.z0Assumed && sc.tipoFalla === 'monofasica_tierra'
          ? ['Nota de hipótesis: al no disponerse de la Icc monofásica de la red ni del factor Z0/Z1 de placa del transformador, se asumió conservadoramente Z0 ≈ Z1 — simplificación habitual para transformadores trifásicos de tres columnas con conexión Dyn; se recomienda verificar con datos de placa para proyectos críticos.']
          : []),
      ] : [
        'If fue ingresada directamente por el profesional a partir de un estudio de cortocircuito existente del sistema eléctrico (nivel de falla en la barra/subestación en estudio).',
      ]),
      `Explicación del factor de división (Sf): ${splitJustificacion}`,
      'Explicación del factor de decremento (Df): corrige la corriente de falla por su componente asimétrica (DC) durante el período transitorio inmediatamente posterior a la falla. Si el tiempo de despeje de las protecciones (tf) es corto en relación a la constante de tiempo del sistema (Ta = (X/R)/(2πf)), la componente DC no alcanza a decaer y la severidad efectiva de la falla es mayor que la corriente simétrica sola — Df ≥ 1 siempre, y Df → 1 cuando tf ≫ Ta.',
      'Interpretación técnica: la corriente de diseño Ig obtenida en este capítulo no es la corriente de falla total del sistema, sino la fracción de ella que efectivamente circula por la malla de tierra en estudio (vía Sf), corregida por el efecto transitorio asimétrico (vía Df). Es este valor — y no If directamente — el que debe usarse para dimensionar la malla, calcular el GPR y verificar las tensiones de paso y contacto.',
      'Regla fundamental de este software: ningún módulo de diseño de malla, verificación de tensiones o dimensionamiento de conductor define su propia corriente de falla — todos consumen automáticamente Ig desde este capítulo, evitando inconsistencias y garantizando trazabilidad completa del parámetro más sensible del proyecto.',
      'Referencias normativas: IEEE Std 80-2013, Cláusula 15.9 (determinación de la corriente máxima de malla) y Cláusula 15.10 con Ecuación 79 (factor de decremento); IEEE Std 80-2013 Annex C (métodos de estimación del factor de división de corriente); IEC 60909 (corrientes de cortocircuito en sistemas trifásicos — método de la impedancia equivalente de cortocircuito).',
      'Bibliografía: IEEE Std 80-2013 — IEEE Guide for Safety in AC Substation Grounding, Institute of Electrical and Electronics Engineers; Sunde, E.D. (1949) — Earth Conduction Effects in Transmission Systems; Dwight, H.B. (1936) — Calculation of Resistances to Ground; Fortescue, C.L. (1918) — Method of Symmetrical Co-Ordinates Applied to the Solution of Polyphase Networks.',
    ],
  };
}

function normativeProfileSection(inputs: Record<string, unknown>): ReportSection {
  const label = String(inputs['label']);
  const standard = String(inputs['standard']);
  const country = String(inputs['country']);
  const rgCritical = Number(inputs['rgCritical']);
  const rgGeneral = Number(inputs['rgGeneral']);
  const touchVoltageMaxV = inputs['touchVoltageMaxV'] as number | undefined;
  const notes = String(inputs['notes']);

  return {
    title: 'Perfil Normativo Aplicado al Proyecto',
    norm: standard,
    inputs: [
      { label: 'País / norma', value: label, unit: '' },
    ],
    results: [
      { label: 'Rg crítico de referencia (subestaciones AT)', value: rgCritical.toFixed(1), unit: 'Ω', highlight: true },
      { label: 'Rg general de referencia (uso general)', value: rgGeneral.toFixed(1), unit: 'Ω' },
      ...(touchVoltageMaxV ? [{ label: 'Tensión de contacto máxima admisible', value: touchVoltageMaxV.toFixed(0), unit: 'V' }] : []),
    ],
    pass: true,
    passLabel: `Criterio de cumplimiento aplicado en este informe: ${label} (${country})`,
    observations: [
      `Este proyecto fue evaluado bajo el criterio de cumplimiento de ${label}. La física de las fórmulas de cálculo (Dwight, Sunde, Sverak, Schwarz, Laurent-Niemann) es universal y no cambia entre normas; lo que varía es el límite de referencia de resistencia de puesta a tierra (y/o la tensión de contacto admisible) contra el cual se evalúa el cumplimiento.`,
      notes,
      'Los badges de cumplimiento IEEE 1 Ω/5 Ω que aparecen en cada capítulo de diseño se mantienen como referencia técnica de la plataforma; el criterio de cumplimiento normativo vinculante para este proyecto es el de esta sección.',
    ],
  };
}

/**
 * Capítulo de cierre del informe: síntesis del juicio técnico de ingeniería
 * (fundamento teórico ya desarrollado en los capítulos anteriores) y el
 * deslinde explícito de responsabilidad profesional — GroundDesign Pro es
 * una herramienta de asistencia de cálculo, no un reemplazo del criterio ni
 * de la firma del profesional responsable.
 */
function technicalJudgmentSection(inputs: Record<string, unknown>): ReportSection {
  const globalStatus = String(inputs['globalStatus'] ?? 'parcial'); // 'cumple' | 'revisar' | 'parcial'
  const chosenSystemLabel = String(inputs['chosenSystemLabel'] ?? '—');
  const normativeLabel = String(inputs['normativeLabel'] ?? '—');
  const normativeStandard = String(inputs['normativeStandard'] ?? '—');
  const verifiedCount = Number(inputs['verifiedCount'] ?? 0);
  const failedCount = Number(inputs['failedCount'] ?? 0);
  const engineerName = inputs['engineerName'] as string | null | undefined;

  const pass = globalStatus === 'cumple' ? true : globalStatus === 'revisar' ? false : undefined;

  return {
    title: 'Juicio Técnico y Responsabilidad Profesional',
    norm: 'Criterio de ingeniería — GroundDesign Pro',
    inputs: [
      { label: 'Sistema de puesta a tierra elegido', value: chosenSystemLabel, unit: '' },
      { label: 'Perfil normativo aplicado', value: normativeLabel, unit: '' },
    ],
    results: [
      { label: 'Capítulos verificados', value: verifiedCount, unit: '' },
      { label: 'Capítulos con incumplimiento', value: failedCount, unit: '', highlight: failedCount > 0 },
    ],
    ...(pass !== undefined ? {
      pass,
      passLabel: pass
        ? 'El desarrollo teórico de este informe respalda el cumplimiento del diseño propuesto bajo los parámetros ingresados'
        : `${failedCount} capítulo(s) no cumplen el criterio normativo aplicable — requieren ajuste antes de dar el diseño por definitivo`,
    } : {}),
    observations: [
      `Juicio técnico: los resultados de este informe se obtuvieron aplicando, de forma trazable, los fundamentos físicos y matemáticos documentados en cada capítulo — modelo de suelo (Wait/Orellana-Mooney), corriente de diseño (componentes simétricas de Fortescue), resistencia de puesta a tierra (Sverak/Dwight/Sunde/Schwarz/Laurent-Niemann), dimensionamiento de conductor (Onderdonk) y verificación de tensiones de paso/contacto (Dalziel) — contrastados contra el criterio de ${normativeLabel} (${normativeStandard}). ${failedCount > 0 ? `Se identificaron ${failedCount} capítulo(s) que no cumplen el criterio aplicable; deben resolverse ajustando la geometría, el tratamiento del suelo o el conductor antes de ejecutar la instalación.` : 'No se identificaron incumplimientos en los capítulos verificables bajo los parámetros ingresados en este proyecto.'}`,
      'Alcance de la asistencia del software: GroundDesign Pro automatiza fórmulas de ingeniería reconocidas (IEEE Std 80-2013/81-2012 y las normas nacionales aplicables) con cálculo propio y trazable; no reemplaza el juicio profesional ni releva de la obligación de validar en terreno que los parámetros de entrada (resistividad, corriente de falla, geometría real, condiciones del sitio) correspondan a las condiciones efectivas de la instalación.',
      `Responsabilidad profesional: el ajuste final del sistema de puesta a tierra propuesto, su adaptación a las condiciones reales del sitio, y la decisión de aceptar, modificar o rechazar el diseño son responsabilidad exclusiva del instalador o ingeniero eléctrico responsable que suscribe este informe${engineerName && engineerName !== '—' ? ` (${engineerName})` : ''}, o de quien solicitó su elaboración utilizando GroundDesign Pro como herramienta de asistencia técnica, conforme a la normativa vigente aplicable indicada en este informe y a la reglamentación eléctrica del país de la instalación.`,
    ],
  };
}

const ADAPTERS: Record<string, (i: Record<string, unknown>, o: Record<string, unknown>) => ReportSection> = {
  wenner:       wennerSection,
  grid:         gridSection,
  rod:          rodSection,
  strip:        stripSection,
  radial:       radialSection,
  ring:         ringSection,
  combined:     combinedSection,
  freeform:     freeformSection,
  conductor:    conductorSection,
  voltages:     voltagesSection,
  lightning:    lightningSection,
  valorizacion: valorizacionSection,
  soilModel:    (i) => soilModelSection(i),
  faultAnalysis: (i) => faultAnalysisSection(i),
  normativeProfile: (i) => normativeProfileSection(i),
  technicalJudgment: (i) => technicalJudgmentSection(i),
};

// ─── Route ────────────────────────────────────────────────────────────────────

export async function reportRoutes(app: FastifyInstance) {

  // POST /api/v1/report
  // Body: { meta: ReportMeta, sections: Array<{ module, inputs, outputs }> }
  app.post('/', async (req, reply) => {
    const body = req.body as {
      meta: ReportMeta;
      sections: Array<{ module: string; inputs: Record<string, unknown>; outputs: Record<string, unknown>; norm?: string }>;
    };

    if (!body.meta?.projectName) return reply.code(400).send({ error: 'meta.projectName es requerido' });
    if (!body.sections?.length)  return reply.code(400).send({ error: 'sections no puede estar vacío' });

    // El logo del proyectista viaja como data URL — se valida formato (solo PNG/JPEG
    // base64) y tamaño (≤ 700 KB codificado ≈ 500 KB de imagen) antes de tocar PDFKit.
    if (body.meta.logoDataUrl !== undefined) {
      if (typeof body.meta.logoDataUrl !== 'string'
        || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(body.meta.logoDataUrl)) {
        return reply.code(400).send({ error: 'logoDataUrl debe ser una imagen PNG o JPEG en formato data URL base64' });
      }
      if (body.meta.logoDataUrl.length > 700_000) {
        return reply.code(400).send({ error: 'El logo supera el tamaño máximo permitido (500 KB)' });
      }
    }

    const sections: ReportSection[] = body.sections.map(s => {
      const adapter = ADAPTERS[s.module];
      if (adapter) return adapter(s.inputs, s.outputs);
      // Generic fallback
      return {
        title: s.module.toUpperCase(),
        ...(s.norm !== undefined ? { norm: s.norm } : {}),
        inputs:  Object.entries(s.inputs).map(([k, v]) => ({ label: k, value: String(v) })),
        results: Object.entries(s.outputs).map(([k, v]) => ({ label: k, value: String(v) })),
      };
    });

    const buffer = await generateReportBuffer({ meta: body.meta, sections });

    const filename = `GDP-${body.meta.projectCode ?? 'report'}-${new Date().toISOString().slice(0, 10)}.pdf`;
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  });

  function sendDxf(reply: FastifyReply, dxf: string, name: string) {
    const filename = `GDP-${name}-${new Date().toISOString().slice(0, 10)}.dxf`;
    reply
      .header('Content-Type', 'application/dxf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(dxf);
  }

  // POST /api/v1/report/dxf/grid — plano DXF de la malla rectangular (Sverak)
  app.post<{ Body: GridDxfInput }>('/dxf/grid', async (req, reply) => {
    const p = req.body;
    if (p.largo <= 0 || p.ancho <= 0) return reply.code(400).send({ error: 'largo y ancho deben ser positivos' });
    sendDxf(reply, generateGridDxf(p), 'malla');
  });

  // POST /api/v1/report/dxf/rod — plano DXF de electrodos verticales
  app.post<{ Body: RodDxfInput }>('/dxf/rod', async (req, reply) => {
    const p = req.body;
    if (p.n < 1 || p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    sendDxf(reply, generateRodDxf(p), 'picas');
  });

  // POST /api/v1/report/dxf/strip — plano DXF de conductor horizontal
  app.post<{ Body: StripDxfInput }>('/dxf/strip', async (req, reply) => {
    const p = req.body;
    if (p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    sendDxf(reply, generateStripDxf(p), 'conductor');
  });

  // POST /api/v1/report/dxf/radial — plano DXF de sistema radial/estrella
  app.post<{ Body: RadialDxfInput }>('/dxf/radial', async (req, reply) => {
    const p = req.body;
    if (p.n < 2 || p.L <= 0) return reply.code(400).send({ error: 'Parámetros inválidos' });
    sendDxf(reply, generateRadialDxf(p), 'radial');
  });

  // POST /api/v1/report/dxf/ring — plano DXF de anillo perimetral
  app.post<{ Body: RingDxfInput }>('/dxf/ring', async (req, reply) => {
    const p = req.body;
    if (p.largo <= 0 || p.ancho <= 0) return reply.code(400).send({ error: 'largo y ancho deben ser positivos' });
    sendDxf(reply, generateRingDxf(p), 'anillo');
  });

  // POST /api/v1/report/dxf/combined — plano DXF de malla + picas combinada
  app.post<{ Body: CombinedDxfInput }>('/dxf/combined', async (req, reply) => {
    const p = req.body;
    if (p.largo <= 0 || p.ancho <= 0) return reply.code(400).send({ error: 'largo y ancho deben ser positivos' });
    sendDxf(reply, generateCombinedDxf(p), 'combinada');
  });
}
