import type {
  ExplainableResult, RiskInput, RiskResult, RiskComponents,
  EnvironmentType, StructureType, SoilType,
  PhysicalFoundation, MathFoundation, NormativeFoundation, EngineeringFoundation,
  Variable, Step,
} from '../types';

// Re-export RiskInput so consumers don't need to import from types directly
export type { RiskInput } from '../types';

// ─── Tables from IEC 62305-2 ──────────────────────────────────────────────────

/** Environment factor Cd — IEC 62305-2 Table 3 */
const CD: Record<EnvironmentType, number> = {
  hilltop:  0.25,
  rural:    0.5,
  suburban: 1.0,
  urban:    2.0,
};

/** Tolerable risk RT — IEC 62305-2 Table 2 */
const RT_DEFAULT = {
  R1: 1e-5,   // 10⁻⁵  loss of human life
  R2: 1e-3,   // 10⁻³  loss of public services
  R3: 1e-3,   // 10⁻³  loss of cultural heritage
  R4: 1e-3,   // 10⁻³  loss of economic value (default)
};

/** Probability of injury pa — IEC 62305-2 Table 4 */
const PA: Record<SoilType, number> = {
  agricultural: 1e-2,
  clay:         1e-2,
  sandy:        1e-3,
  rock:         1e-3,
  concrete:     1e-3,
  asphalt:      1e-4,
};

/** Probability of physical damage pb — IEC 62305-2 Table 5 */
function getPB(hasLPS: boolean, lpsLevel?: string): number {
  if (!hasLPS) return 1.0;
  if (lpsLevel === 'I')   return 0.02;
  if (lpsLevel === 'II')  return 0.05;
  if (lpsLevel === 'III') return 0.10;
  if (lpsLevel === 'IV')  return 0.20;
  return 1.0;
}

/** Probability of failure of internal systems pc — IEC 62305-2 Table 7 */
function getPC(hasSPD: boolean, hasBonding: boolean, shieldingFactor = 0): number {
  let base = 1.0;
  if (shieldingFactor > 0) base *= (1 - shieldingFactor);
  if (hasSPD)     base *= 0.05;
  if (hasBonding) base *= 0.5;
  return Math.min(base, 1.0);
}

/** Mean number of victims — simplified (IEC 62305-2 Annex B) */
function getNX(structureType: StructureType): { nX: number; lt: number } {
  const map: Record<StructureType, { nX: number; lt: number }> = {
    residential: { nX: 2,    lt: 8760 },
    farm:        { nX: 4,    lt: 8760 },
    industry:    { nX: 50,   lt: 2000 },
    commercial:  { nX: 100,  lt: 3000 },
    public:      { nX: 1000, lt: 2000 },
    hospital:    { nX: 200,  lt: 8760 },
    heritage:    { nX: 500,  lt: 2000 },
    datacenter:  { nX: 20,   lt: 8760 },
    telecom:     { nX: 10,   lt: 8760 },
    explosive:   { nX: 20,   lt: 2000 },
  };
  return map[structureType] ?? { nX: 2, lt: 8760 };
}

// ─── Collection area — IEC 62305-2 Annex A ────────────────────────────────────

function collectionArea(L: number, W: number, H: number): number {
  // Ad = L·W + 2·(L+W)·H + π·H²
  return L * W + 2 * (L + W) * H + Math.PI * H * H;
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export function computeRisk(input: RiskInput): ExplainableResult<RiskResult> {
  const { structure: s, location: loc, existing: ex, loss } = input;

  // ── Step 1: Environment factor Cd ──────────────────────────────────────────
  const Cd = CD[loc.environment];

  // ── Step 2: Collection area Ad ─────────────────────────────────────────────
  const Ad = collectionArea(s.length, s.width, s.height);

  // ── Step 3: Annual dangerous events Nd ────────────────────────────────────
  const Nd = loc.Ng * Ad * Cd * 1e-6;

  // ── Step 4: Risk components ────────────────────────────────────────────────
  const pa = PA[s.soilType] ?? 1e-2;
  const pb = getPB(ex.hasLPS, ex.lpsLevel);
  const pc = getPC(ex.hasSPD, ex.hasBonding, ex.shieldingFactor);
  const { nX, lt } = getNX(s.type);
  const nt = nX / (8760); // fraction of total population at risk (simplified)

  // IEC 62305-2 §5.2 — Risk components for a structure
  // R = ND · (prob of event) · (mean relative loss) · (mean number of victims)
  const ND = Nd;
  const NM = loc.Ng * 25 * Ad * Cd * 1e-6;  // flashes near structure (simplified)
  const NI = 0;  // incoming services — not modelled in phase 1
  const NL = 0;

  const RA  = ND * pa * 0.01 * nt;          // touch/step voltages
  const RB  = ND * pb * 0.1  * nt;          // physical damage
  const RC  = ND * pc * 0.5  * nt;          // internal systems
  const RM  = NM * pc * 0.1  * nt;          // LEMP
  const RU  = 0; const RV = 0; const RW = 0; const RZ = 0;

  // ── Step 5: Aggregate risk per loss type ───────────────────────────────────
  // R1 = loss of human life: RA + RB + RC + RM
  const R1 = RA + RB + RC + RM;
  // R2 = loss of service to public: RB + RC + RM (simplified)
  const R2 = RB + RC;
  // R3 = loss of cultural heritage: RB
  const R3 = RB;
  // R4 = loss of economic value: RB + RC + RM (with cost weighting)
  const costFactor = loss.structureCost
    ? Math.min(1, (loss.structureCost + (loss.equipmentCost ?? 0)) / 1_000_000)
    : 0.1;
  const R4 = (RB + RC + RM) * costFactor;

  const RT  = { ...RT_DEFAULT };
  const required = {
    R1: R1 > RT.R1,
    R2: R2 > RT.R2,
    R3: R3 > RT.R3,
    R4: R4 > RT.R4,
  };

  const components: RiskComponents = {
    ND, NM, NI, NL, RA, RB, RC, RM, RU, RV, RW, RZ,
  };

  const result: RiskResult = { R1, R2, R3, R4, RT, required, components, Cd, Ad, Nd };

  // ── Explanation — 4 pillars ────────────────────────────────────────────────

  const physical: PhysicalFoundation = {
    phenomenon:
      'Descarga atmosférica (rayo): fenómeno electrostático en el que cargas eléctricas acumuladas en nubes se neutralizan mediante un canal de plasma que conecta la nube con la tierra u otra nube. La corriente de retorno puede superar 200 kA con frentes de subida de 1–10 µs.',
    origin:
      'Modelo de riesgo desarrollado por el IEC (International Electrotechnical Commission) en base a décadas de datos estadísticos de incidentes por rayos en Europa, América del Norte y Asia. La metodología IEC 62305-2 es la evolución de la VDE 0185 alemana y la BS 6651 británica.',
    expectedBehavior:
      'Una descarga que impacta directamente la estructura (o sus servicios de entrada) inyecta corrientes de impulso que pueden generar tensiones de toque y paso peligrosas, incendios, sobretensiones en equipos y fallas estructurales.',
    electromagneticEffects: [
      'Campo magnético pulsado H(t) proporcional a la derivada de la corriente: dH/dt ∝ dI/dt',
      'Inducción electromagnética en lazos de cableado internos (LEMP — Lightning ElectroMagnetic Pulse)',
      'Tensiones de paso y contacto en el suelo hasta 50 m del punto de impacto',
      'Acoplamiento galvánico a través de la red de tierra y servicios metálicos',
    ],
    hypotheses: [
      'Estructura aislada en terreno plano (sin efecto de pantalla de edificios vecinos)',
      'Densidad de descargas Ng uniforme en el área de captación Ad',
      'Las probabilidades de daño son estadísticas — válidas para poblaciones de estructuras, no para un caso individual',
      'Modelo de primer impacto (no considera rayos subsecuentes del mismo evento)',
    ],
    modelLimitations: [
      'Ng debe obtenerse de mapas isoceráunicos locales validados — la precisión del resultado depende directamente de este dato',
      'No modela efectos de terreno (orografía, vegetación, edificios vecinos) excepto a través del factor Cd',
      `Válido para Ng entre 0.1 y 20 descargas/km²/año — fuera de este rango la incertidumbre crece significativamente`,
      'No considera rayos nube-nube ni descargas ascendentes (estructuras > 100 m)',
    ],
  };

  const variables: Variable[] = [
    { symbol: 'Ng',  name: 'Densidad de descargas a tierra',      value: loc.Ng,           unit: 'descargas/km²/año', source: 'Mapa isoceráunico local' },
    { symbol: 'Ad',  name: 'Área de captación equivalente',       value: Ad.toFixed(1),    unit: 'm²',                source: 'IEC 62305-2 Anexo A' },
    { symbol: 'Cd',  name: 'Factor de localización',              value: Cd,               unit: 'adimensional',      source: `IEC 62305-2 Tabla 3 — ${loc.environment}` },
    { symbol: 'Nd',  name: 'Nº peligroso de eventos por año',    value: Nd.toExponential(3), unit: 'eventos/año',   source: 'Ec. 1 IEC 62305-2' },
    { symbol: 'pa',  name: 'Prob. lesión por tensión contacto',  value: pa,               unit: 'adimensional',      source: `IEC 62305-2 Tabla 4 — ${s.soilType}` },
    { symbol: 'pb',  name: 'Prob. de daño físico',               value: pb,               unit: 'adimensional',      source: ex.hasLPS ? `IEC 62305-2 Tabla 5 — LPS ${ex.lpsLevel}` : 'Sin LPS = 1.0' },
    { symbol: 'pc',  name: 'Prob. falla sistemas internos',      value: pc.toFixed(3),    unit: 'adimensional',      source: 'IEC 62305-2 Tabla 7' },
  ];

  const steps: Step[] = [
    {
      index: 1,
      description: 'Área de captación equivalente de la estructura (IEC 62305-2 Anexo A)',
      expression: 'Ad = L·W + 2·(L+W)·H + π·H²',
      partialResult: `Ad = ${s.length}×${s.width} + 2·(${s.length}+${s.width})·${s.height} + π·${s.height}² = ${Ad.toFixed(1)} m²`,
    },
    {
      index: 2,
      description: 'Factor de localización Cd (IEC 62305-2 Tabla 3)',
      expression: `Entorno: ${loc.environment}  →  Cd`,
      partialResult: `Cd = ${Cd}`,
    },
    {
      index: 3,
      description: 'Número anual de eventos peligrosos por descarga directa a la estructura',
      expression: 'Nd = Ng · Ad · Cd · 10⁻⁶',
      partialResult: `Nd = ${loc.Ng} × ${Ad.toFixed(1)} × ${Cd} × 10⁻⁶ = ${Nd.toExponential(3)} eventos/año`,
    },
    {
      index: 4,
      description: 'Componente RA — riesgo de lesión por tensión de contacto/paso (IEC 62305-2 §5.2.1)',
      expression: 'RA = ND · pa · La · nX/nt',
      partialResult: `RA = ${ND.toExponential(3)} × ${pa} × 0.01 × ${nt.toFixed(5)} = ${RA.toExponential(3)}`,
    },
    {
      index: 5,
      description: 'Componente RB — riesgo de daño físico (incendio, explosión) (IEC 62305-2 §5.2.2)',
      expression: 'RB = ND · pb · Lf · nX/nt',
      partialResult: `RB = ${ND.toExponential(3)} × ${pb} × 0.1 × ${nt.toFixed(5)} = ${RB.toExponential(3)}`,
    },
    {
      index: 6,
      description: 'Componente RC — riesgo de falla de sistemas internos (IEC 62305-2 §5.2.3)',
      expression: 'RC = ND · pc · Lo · nX/nt',
      partialResult: `RC = ${ND.toExponential(3)} × ${pc.toFixed(3)} × 0.5 × ${nt.toFixed(5)} = ${RC.toExponential(3)}`,
    },
    {
      index: 7,
      description: 'Riesgo total R1 — pérdida de vidas humanas',
      expression: 'R1 = RA + RB + RC + RM',
      partialResult: `R1 = ${RA.toExponential(3)} + ${RB.toExponential(3)} + ${RC.toExponential(3)} + ${RM.toExponential(3)} = ${R1.toExponential(3)}`,
    },
    {
      index: 8,
      description: 'Verificación R1 vs tolerable RT1 = 10⁻⁵',
      expression: 'R1 ≤ RT1 ?',
      partialResult: `${R1.toExponential(3)} ${R1 > RT.R1 ? '>' : '≤'} ${RT.R1.toExponential(0)}  →  ${R1 > RT.R1 ? 'SE REQUIERE PROTECCIÓN' : 'SIN RIESGO SIGNIFICATIVO'}`,
    },
  ];

  const mathematical: MathFoundation = {
    formula: 'R1 = RA + RB + RC + RM  donde  Ri = ND · pi · Li · (nX/nt)',
    variables,
    stepByStep: steps,
    finalResult: `R1 = ${R1.toExponential(3)}  |  RT1 = ${RT.R1.toExponential(0)}  |  ${required.R1 ? 'PROTECCIÓN REQUERIDA' : 'ACEPTABLE'}`,
    dimensionalAnalysis:
      'Nd [eventos/año] × p [adimensional] × L [víctimas/evento] → R [víctimas/año]  ✓',
    sensitivityAnalysis: [
      { variable: 'Ng',     change: '+50 %', impact: `Nd aumenta 50 % → Nd = ${(Nd*1.5).toExponential(3)}` },
      { variable: 'pb',     change: 'LPS I (pb=0.02)', impact: `RB se reduce ${((1-0.02/pb)*100).toFixed(0)} % — mayor impacto sobre R1` },
      { variable: 'pc',     change: 'SPD + bonding', impact: 'RC se reduce ~97.5 % — protección efectiva contra LEMP' },
    ],
  };

  const normative: NormativeFoundation = {
    standard:  'IEC 62305-2',
    edition:   'Ed. 2.0 2010-12',
    chapter:   'Cláusula 5 — Evaluación del riesgo',
    table:     'Tabla 1 (componentes de riesgo), Tabla 2 (RT), Tabla 3 (Cd), Tabla 4 (pa), Tabla 5 (pb), Tabla 7 (pc)',
    equation:  'Ec. (1): Nd = Ng · Ad · Cd · 10⁻⁶  |  Ec. (3): R = N · P · L',
    applicabilityConditions: [
      'Estructuras de hasta 60 m de altura (para estructuras ≥ 60 m se requiere IEC 62305-2 Anexo C)',
      'Densidad de descargas Ng de fuentes oficiales (servicio meteorológico nacional)',
      'No aplica a estructuras en zonas de tormenta activa (uso de datos históricos, mínimo 5 años)',
    ],
    standardLimitations: [
      'El modelo es probabilístico — no garantiza protección al 100 % para un evento individual',
      'Los valores de probabilidad (pa, pb, pc) son estadísticos y pueden variar localmente',
      'IEC 62305-2 no cubre coordinación de pararrayos tipo ESE (PDC/CTS) — para ello ver NFPA 781 o NFC 17-102',
    ],
    hierarchyNote:
      'En caso de conflicto: IEC 62305-2 > norma nacional (NFPA 780, UNE-EN 62305, NTC 4552) > norma de fabricante. Verificar siempre la norma de aplicación obligatoria en la jurisdicción del proyecto.',
  };

  const anyRequired = Object.values(required).some(Boolean);
  const recommendedLevel = R1 > 1e-4 ? 'I' : R1 > 1e-5 ? 'II' : 'III';

  const engineering: EngineeringFoundation = {
    selectedSolution: anyRequired
      ? `Sistema de Protección contra Rayos (SPR) nivel LPS ${recommendedLevel} con evaluación de riesgo conforme IEC 62305-2`
      : 'No se requiere SPR — el riesgo residual es inferior al tolerable en todas las categorías',
    whySelected: anyRequired
      ? `El riesgo calculado R1 = ${R1.toExponential(3)} supera el tolerable RT1 = ${RT.R1.toExponential(0)}. La normativa IEC 62305-2 establece que cuando R > RT se debe instalar un SPR. El nivel LPS ${recommendedLevel} se determina por la eficiencia requerida E = 1 − RT/R = ${(1 - RT.R1/R1).toFixed(3)}.`
      : `Todos los riesgos calculados son inferiores a sus valores tolerables (IEC 62305-2 Tabla 2). No existe obligación normativa de instalar un SPR, aunque se puede instalar voluntariamente para mayor seguridad.`,
    discardedAlternatives: [
      {
        name: 'No hacer evaluación de riesgo (criterio simplificado)',
        reason: 'El criterio simplificado (instalar SPR siempre) es conservador pero no permite optimizar el nivel de protección ni justificar técnicamente la decisión ante autoridades o aseguradoras.',
      },
      {
        name: 'Método de la esfera rodante sin evaluación de riesgo',
        reason: 'La esfera rodante define las zonas de protección física, pero no evalúa si el riesgo residual es aceptable ni identifica qué componente de riesgo domina (touch, física, LEMP).',
      },
    ],
    advantages: [
      'Metodología internacionalmente reconocida y auditable (ISO/IEC)',
      'Permite identificar cuál componente de riesgo domina y priorizar la inversión en protección',
      'Justificable ante autoridades regulatorias, aseguradoras y clientes',
      'Permite evaluar el impacto de medidas de protección individuales (SPD, bonding, LPS) antes de implementarlas',
    ],
    disadvantages: [
      'Requiere datos de Ng precisos — errores en Ng se propagan directamente al resultado',
      'Los valores de probabilidad (pb, pc) son promedios estadísticos — pueden no reflejar condiciones específicas',
      'No sustituye el diseño físico del SPR (esfera rodante, ángulo de protección, jaula Faraday)',
    ],
    safetyLevel: anyRequired ? (recommendedLevel as 'I'|'II'|'III'|'IV') : 'N/A',
    redundancy: anyRequired
      ? 'SPR con múltiples conductores descendentes provee redundancia — falla de un bajante no compromete el sistema completo'
      : 'Sin SPR — la estructura es la única protección; considerar bonding y SPD como mínimo',
    constructability:
      'La instalación de un SPR nivel II es factible en cualquier etapa constructiva, aunque se reduce el costo si se planifica en diseño. Nivel I requiere mayor densidad de componentes y puede afectar estética.',
    maintenanceImpact:
      'Inspección visual anual + medición de resistencia de tierra cada 4 años (IEC 62305-3 §8). Los conectores y mordazas de los bajantes son los puntos de mayor desgaste por corrosión.',
    expectedLifespan:
      'Sistema correctamente instalado: 25–40 años. Electrodos de tierra en suelo corrosivo: 15–25 años (verificar con inspección). SPD clase I/II: 10–15 años o ante un evento significativo.',
  };

  return {
    result,
    explanation: { physical, mathematical: mathematical, normative, engineering },
  };
}
