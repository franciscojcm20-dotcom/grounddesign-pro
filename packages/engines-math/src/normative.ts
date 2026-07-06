// normative.ts — Perfiles normativos de puesta a tierra por país/norma.
//
// La física de las fórmulas (Dwight, Sunde, Sverak, Schwarz, Laurent-Niemann)
// es universal; lo que cambia entre normas/países es el criterio de
// cumplimiento: el límite de resistencia de referencia y/o la tensión de
// contacto máxima admisible usada para derivarlo. Este módulo centraliza
// esos criterios para que la UI pueda evaluar cumplimiento contra el
// perfil normativo que el usuario seleccione, sin tocar los motores de
// cálculo de resistencia.

export interface NormativeProfile {
  id: string;
  label: string;          // nombre corto para selector
  standard: string;       // norma/artículo de referencia
  country: string;
  /** Ω — referencia para instalaciones críticas (subestaciones, alta tensión). */
  rgCritical: number;
  /** Ω — referencia para uso general (baja tensión, distribución). */
  rgGeneral: number;
  /**
   * Ω — límite relajado que la norma admite en vez de rgGeneral, solo si la
   * instalación cumple condiciones de protección específicas (ver
   * rgRelaxedConditions). La persona usuaria debe validar y declarar
   * explícitamente que esas condiciones se cumplen — la plataforma no las
   * verifica de forma automática. Solo se define cuando la norma contempla
   * una relajación condicional explícita y verificable.
   */
  rgRelaxed?: number;
  /** Condiciones de instalación exigidas para poder usar rgRelaxed en vez de rgGeneral. */
  rgRelaxedConditions?: string;
  /** Ω — resistencia del cuerpo humano usada en los cálculos de tensión admisible. */
  bodyResistanceOhm: number;
  /** kg — peso corporal de referencia para Etouch/Estep admisibles (IEEE 80 Cl. 16). */
  bodyWeightKg: 50 | 70;
  /** V — tensión de contacto máxima admisible, cuando la norma la fija directamente (p.ej. REBT). */
  touchVoltageMaxV?: number;
  /**
   * mm² — sección mínima de conductor de cobre desnudo exigida por la norma para el
   * conductor de puesta a tierra enterrado, independiente del resultado térmico de
   * Onderdonk (protección mecánica/corrosión a largo plazo, no solo capacidad de
   * falla). Solo se fija cuando hay una cifra normativa concreta y verificable —
   * de lo contrario queda sin definir en vez de adivinar un valor.
   */
  minConductorMm2?: number;
  notes: string;
}

export const NORMATIVE_PROFILES: NormativeProfile[] = [
  {
    id: 'ieee80-sec-ric',
    label: 'IEEE 80/81 · SEC/RIC (Chile)',
    standard: 'IEEE Std 80-2013 · IEEE Std 81-2012 · SEC Pliego Técnico Normativo RIC N°06 (Res. Ex. N°33.877/2020) Cl. 6-7',
    country: 'Chile / genérico IEEE',
    rgCritical: 5,
    rgGeneral: 20,
    rgRelaxed: 80,
    rgRelaxedConditions: 'Potencia instalada ≤10 kW, esquema de neutralización (RIC N°05 Cl. 6.4), interruptor/disyuntor general de corte omnipolar y protección diferencial (300 mA en todos los alimentadores, ≤30 mA en todos los circuitos) — RIC N°06 Cl. 6.2.1; o bien esquema de neutralización, interruptor general de corte omnipolar y protección de sobretensión permanente (UNE-EN 50550) más transitoria (IEC 61643-11) en todos los tableros — Cl. 6.2.2. Basta con cumplir una de las dos condiciones.',
    bodyResistanceOhm: 1000,
    bodyWeightKg: 70,
    minConductorMm2: 25,
    notes: 'Perfil por defecto de la plataforma. El RIC N°06 distingue "tierra de servicio" de "tierra de protección": rgGeneral = 20 Ω es el límite general de tierra de servicio (Cl. 6.1) para instalaciones de baja tensión; rgRelaxed = 80 Ω solo aplica si la instalación cumple las condiciones de protección de Cl. 6.2.1 o 6.2.2 (ver rgRelaxedConditions) — la persona usuaria debe validarlas y declararlas explícitamente, la plataforma no las verifica de forma automática. rgCritical = 5 Ω corresponde a la resistencia combinada de puestas a tierra de redes de distribución MT/BT (Cl. 6.7.3), un contexto distinto (red con subestación, no una instalación consumidora aislada); el diseño de puesta a tierra de subestaciones MT/AT se rige por el RPTD N°06 (DS N°109/2017), no verificado en este perfil. La "tierra de protección" (Cl. 7) no tiene techo de Ω fijo: se calcula como R_TP = V_S / I_0 (tensión de seguridad ÷ corriente de operación de la protección); el criterio sustantivo es Etouch/Estep, y el Anexo 6.1 del propio RIC N°06 adopta las fórmulas de IEEE Std 80 Cl. 16.4-16.5 — ya modeladas en el módulo de Tensiones. Sección mínima de conductor: 25 mm² de cobre desnudo para electrodo de tierra (Cl. 8.7); el conductor de protección sigue una tabla proporcional a la sección de fase (Anexo 6.7: ≤25mm²→igual a fase, 25-50mm²→25mm², >50mm²→mitad de fase), no un valor único.',
  },
  {
    id: 'retie-co',
    label: 'RETIE (Colombia)',
    standard: 'RETIE — Reglamento Técnico de Instalaciones Eléctricas, Art. 15',
    country: 'Colombia',
    rgCritical: 1,
    rgGeneral: 10,
    bodyResistanceOhm: 1000,
    bodyWeightKg: 70,
    minConductorMm2: 50,
    notes: 'El Art. 15 del RETIE fija 10 Ω como referencia para sistemas de distribución y remite a IEEE 80, IEC 60364-4-442, NTC 2050 y NTC 4552 para el cálculo completo de tensiones de paso, contacto y transferidas — el cumplimiento de la resistencia no exime de verificar esas tensiones. Sección mínima de conductor de puesta a tierra: 50 mm² de cobre para instalaciones industriales/alta tensión (RETIE Art. 15, Tabla 250-95 de NTC 2050) — verifica la tabla exacta según la corriente del dispositivo de protección del proyecto específico.',
  },
  {
    id: 'rebt-es',
    label: 'REBT — ITC-BT-18/26 (España)',
    standard: 'REBT ITC-BT-18 (tensión de contacto) · ITC-BT-26 (viviendas)',
    country: 'España',
    rgCritical: 15,
    rgGeneral: 37,
    bodyResistanceOhm: 1000,
    bodyWeightKg: 70,
    touchVoltageMaxV: 50,
    minConductorMm2: 25,
    notes: 'El REBT no fija un valor único de resistencia: exige que la tensión de contacto no supere 50 V (locales secos) o 24 V (locales húmedos/conductores). Los valores 15 Ω (con pararrayos) y 37 Ω (sin pararrayos) son los prescriptivos de la ITC-BT-26 para viviendas; instalaciones mayores deben verificarse por tensión de contacto (R ≤ U/I_diferencial). Sección mínima de conductor de tierra: 25 mm² de cobre enterrado (no protegido mecánicamente, expuesto a corrosión) — ITC-BT-18 §3.4; 16 mm² si cuenta con protección mecánica adicional.',
  },
  {
    id: 'nbr-br',
    label: 'NBR 15751 (Brasil)',
    standard: 'ABNT NBR 15751:2009 — Aterramento de subestações',
    country: 'Brasil',
    rgCritical: 1,
    rgGeneral: 5,
    bodyResistanceOhm: 1000,
    bodyWeightKg: 70,
    notes: 'La NBR 15751 sigue una metodología equivalente a IEEE 80 (tensões de passo e toque admissíveis según resistividad superficial y tiempo de falla); no fija un techo universal de resistencia — se usan 1 Ω/5 Ω como referencia práctica habitual, igual que en el perfil IEEE por defecto. No se fija aquí una sección mínima de conductor: la NBR 5410 prohíbe TN-C bajo 10 mm² de cobre, pero no se encontró una cifra específica y confiable para malla de subestación (NBR 15751) — verifica directamente contra NBR 15751/5410 para el proyecto específico en vez de asumir un valor.',
  },
];

export function getNormativeProfile(id: string): NormativeProfile {
  return NORMATIVE_PROFILES.find(p => p.id === id) ?? NORMATIVE_PROFILES[0]!;
}

export interface RgCompliance { rgCritical: boolean; rgGeneral: boolean }

/**
 * Evalúa una resistencia de puesta a tierra calculada contra los límites de referencia
 * del perfil normativo seleccionado. Si `relaxedConditionsMet` es true y el perfil define
 * `rgRelaxed`, se usa ese límite relajado en vez de `rgGeneral` — la persona usuaria es
 * quien declara que la instalación cumple las condiciones de protección exigidas
 * (`rgRelaxedConditions`); esta función no las verifica.
 */
export function evaluateRgCompliance(Rg: number, profile: NormativeProfile, relaxedConditionsMet = false): RgCompliance {
  const generalLimit = relaxedConditionsMet && profile.rgRelaxed !== undefined ? profile.rgRelaxed : profile.rgGeneral;
  return { rgCritical: Rg <= profile.rgCritical, rgGeneral: Rg <= generalLimit };
}

/** Límite general efectivo del perfil, considerando la relajación condicional si aplica. */
export function effectiveRgGeneral(profile: NormativeProfile, relaxedConditionsMet = false): number {
  return relaxedConditionsMet && profile.rgRelaxed !== undefined ? profile.rgRelaxed : profile.rgGeneral;
}
