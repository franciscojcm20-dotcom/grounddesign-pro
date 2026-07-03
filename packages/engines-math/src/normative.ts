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
  /** Ω — resistencia del cuerpo humano usada en los cálculos de tensión admisible. */
  bodyResistanceOhm: number;
  /** kg — peso corporal de referencia para Etouch/Estep admisibles (IEEE 80 Cl. 16). */
  bodyWeightKg: 50 | 70;
  /** V — tensión de contacto máxima admisible, cuando la norma la fija directamente (p.ej. REBT). */
  touchVoltageMaxV?: number;
  notes: string;
}

export const NORMATIVE_PROFILES: NormativeProfile[] = [
  {
    id: 'ieee80-sec-ric',
    label: 'IEEE 80/81 · SEC/RIC (Chile)',
    standard: 'IEEE Std 80-2013 · IEEE Std 81-2012 · SEC RIC N°6',
    country: 'Chile / genérico IEEE',
    rgCritical: 1,
    rgGeneral: 5,
    bodyResistanceOhm: 1000,
    bodyWeightKg: 70,
    notes: 'Perfil por defecto de la plataforma. Los límites 1 Ω/5 Ω son una referencia práctica habitual en subestaciones críticas y uso general; el criterio normativo completo es Etouch/Estep (Cl. 16.4-16.5) — ya modelado en el módulo de Tensiones.',
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
    notes: 'El Art. 15 del RETIE fija 10 Ω como referencia para sistemas de distribución y remite a IEEE 80, IEC 60364-4-442, NTC 2050 y NTC 4552 para el cálculo completo de tensiones de paso, contacto y transferidas — el cumplimiento de la resistencia no exime de verificar esas tensiones.',
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
    notes: 'El REBT no fija un valor único de resistencia: exige que la tensión de contacto no supere 50 V (locales secos) o 24 V (locales húmedos/conductores). Los valores 15 Ω (con pararrayos) y 37 Ω (sin pararrayos) son los prescriptivos de la ITC-BT-26 para viviendas; instalaciones mayores deben verificarse por tensión de contacto (R ≤ U/I_diferencial).',
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
    notes: 'La NBR 15751 sigue una metodología equivalente a IEEE 80 (tensões de passo e toque admissíveis según resistividad superficial y tiempo de falla); no fija un techo universal de resistencia — se usan 1 Ω/5 Ω como referencia práctica habitual, igual que en el perfil IEEE por defecto.',
  },
];

export function getNormativeProfile(id: string): NormativeProfile {
  return NORMATIVE_PROFILES.find(p => p.id === id) ?? NORMATIVE_PROFILES[0]!;
}

export interface RgCompliance { rgCritical: boolean; rgGeneral: boolean }

/** Evalúa una resistencia de puesta a tierra calculada contra los límites de referencia del perfil normativo seleccionado. */
export function evaluateRgCompliance(Rg: number, profile: NormativeProfile): RgCompliance {
  return { rgCritical: Rg <= profile.rgCritical, rgGeneral: Rg <= profile.rgGeneral };
}
