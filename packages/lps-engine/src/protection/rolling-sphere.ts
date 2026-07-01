import type {
  ExplainableResult, RollingSphereResult,
  PhysicalFoundation, MathFoundation, NormativeFoundation, EngineeringFoundation,
} from '../types';

export type LPSLevel = 'I' | 'II' | 'III' | 'IV';

export interface RollingSphereInput {
  lpsLevel:        LPSLevel;
  structureLength: number;  // m
  structureWidth:  number;  // m
  structureHeight: number;  // m
}

/** Rolling sphere radii per IEC 62305-3 Table 2 */
export const SPHERE_RADIUS: Record<LPSLevel, number> = {
  I:   20,
  II:  30,
  III: 45,
  IV:  60,
};

/** Max mesh size for mesh method (IEC 62305-3 Table 2) */
export const MAX_MESH: Record<LPSLevel, number> = { I: 5, II: 10, III: 15, IV: 20 };

/** Max down conductor spacing (IEC 62305-3 Table 4) */
export const MAX_DC_SPACING: Record<LPSLevel, number> = { I: 10, II: 10, III: 15, IV: 20 };

export function computeRollingSphere(
  input: RollingSphereInput,
): ExplainableResult<RollingSphereResult> {
  const { lpsLevel: lvl, structureLength: L, structureWidth: W, structureHeight: H } = input;
  const r = SPHERE_RADIUS[lvl];

  // Structure is fully protected if the sphere cannot touch the roof without
  // first contacting an air termination (simplified: roof height ≤ radius)
  const fullyProtected = H <= r;

  // Down conductors: perimeter / max spacing, min 2
  const perimeter = 2 * (L + W);
  const minDC     = Math.max(2, Math.ceil(perimeter / MAX_DC_SPACING[lvl]));
  const dcSpacing = perimeter / minDC;

  const unprotectedZones = fullyProtected
    ? []
    : [`Zona superior de la estructura por encima de ${r} m requiere terminales de aire adicionales`];

  const result: RollingSphereResult = {
    radius: r,
    fullyProtected,
    unprotectedZones,
    minDownConductors: minDC,
    maxDownConductorSpacing: Math.round(dcSpacing * 10) / 10,
    earthTerminations: minDC,
  };

  // ── 4 pillars ──────────────────────────────────────────────────────────────

  const physical: PhysicalFoundation = {
    phenomenon:
      'El método de la esfera rodante simula el último salto del líder descendente de un rayo. La esfera rodante de radio r representa la distancia de cebado del arco eléctrico: cualquier punto que la esfera no pueda tocar sin pasar antes por un terminal de captación queda protegido.',
    origin:
      'Desarrollado por R.H. Golde y F.A.M. de la Plata en los años 1950-1970 a partir de estudios de la física del líder escalonado. Adoptado en IEC 62305-3 (2006) como método primario de diseño de SPR, reemplazando el ángulo de protección para estructuras complejas.',
    expectedBehavior:
      'El rayo selecciona el punto de impacto cuando el líder descendente y el líder ascendente se encuentran. La distancia de este encuentro (distancia de cebado) es proporcional a la corriente de pico I: r ≈ 10·I⁰·⁶⁵ para I en kA. Los 4 niveles LPS corresponden a corrientes mínimas de captación de 3, 5, 10 y 16 kA.',
    electromagneticEffects: [
      'El canal de plasma del rayo genera un campo magnético toroidal H(t) durante la corriente de retorno',
      'La derivada dI/dt (típicamente 10–200 kA/µs) induce tensiones en lazos de cableado cercanos',
      'La resistencia de tierra del electrodo de captación determina la tensión de tierra local durante el evento',
    ],
    hypotheses: [
      'El líder descendente es vertical (sin viento fuerte ni condiciones anómalas)',
      'La estructura es conductora o está conectada a un terminal de captación eficaz',
      'La distancia de cebado r es constante para el nivel LPS seleccionado (en realidad varía con la corriente)',
      'Terreno plano — no se considera el efecto de colinas o estructuras vecinas',
    ],
    modelLimitations: [
      'No considera rayos de corriente inferior al mínimo del nivel LPS (pueden impactar en zonas consideradas "protegidas")',
      'Para estructuras de más de 60 m, los rayos ascendentes deben considerarse por separado',
      'El método es determinístico — no proporciona probabilidad de impacto residual como la evaluación de riesgo IEC 62305-2',
    ],
  };

  const math: MathFoundation = {
    formula: 'r = f(LPS level)  →  perímetro / espaciado máx. → Nº bajantes',
    variables: [
      { symbol: 'r',   name: 'Radio de la esfera rodante', value: r,      unit: 'm',  source: `IEC 62305-3 Tabla 2 — LPS ${lvl}` },
      { symbol: 'L',   name: 'Largo de la estructura',      value: L,      unit: 'm',  source: 'Input del diseñador' },
      { symbol: 'W',   name: 'Ancho de la estructura',      value: W,      unit: 'm',  source: 'Input del diseñador' },
      { symbol: 'H',   name: 'Altura de la estructura',     value: H,      unit: 'm',  source: 'Input del diseñador' },
      { symbol: 'P',   name: 'Perímetro',                   value: perimeter, unit: 'm', source: 'Cálculo' },
      { symbol: 'smax',name: 'Espaciado máximo bajantes',   value: MAX_DC_SPACING[lvl], unit: 'm', source: `IEC 62305-3 Tabla 4 — LPS ${lvl}` },
    ],
    stepByStep: [
      {
        index: 1,
        description: `Radio de esfera rodante para LPS ${lvl} (IEC 62305-3 Tabla 2)`,
        expression: `r(LPS ${lvl}) = ${r} m`,
        partialResult: `r = ${r} m`,
      },
      {
        index: 2,
        description: 'Verificación de cobertura: ¿la esfera puede tocar la parte superior sin pasar por un terminal?',
        expression: 'H ≤ r  →  cobertura sin terminales en cubierta',
        partialResult: `${H} m ${H <= r ? '≤' : '>'} ${r} m  →  ${fullyProtected ? 'CUBIERTA PROTEGIDA sin terminales adicionales' : 'REQUIERE terminales de aire en cubierta'}`,
      },
      {
        index: 3,
        description: 'Número mínimo de conductores descendentes (IEC 62305-3 §5.3.2)',
        expression: 'n = max(2 ; ⌈P / smax⌉)',
        partialResult: `n = max(2 ; ⌈${perimeter} / ${MAX_DC_SPACING[lvl]}⌉) = max(2 ; ${Math.ceil(perimeter / MAX_DC_SPACING[lvl])}) = ${minDC}`,
      },
      {
        index: 4,
        description: 'Espaciado real entre bajantes',
        expression: 's = P / n',
        partialResult: `s = ${perimeter} / ${minDC} = ${dcSpacing.toFixed(1)} m ≤ ${MAX_DC_SPACING[lvl]} m  ✓`,
      },
    ],
    finalResult: `LPS ${lvl}: r = ${r} m | ${minDC} bajantes | s = ${dcSpacing.toFixed(1)} m | ${fullyProtected ? 'Cubierta protegida' : 'Terminales adicionales requeridos'}`,
    dimensionalAnalysis: 'r [m], s [m], n [adimensional] — consistencia dimensional ✓',
    sensitivityAnalysis: [
      { variable: 'Nivel LPS', change: 'I → II', impact: `r aumenta de 20 a 30 m — menor cobertura en altura, pero menos bajantes (spaciado máx. igual en LPS I y II: ${MAX_DC_SPACING['I']} m)` },
      { variable: 'Altura H',  change: `${H} → ${H+10} m`, impact: `Si H > r = ${r} m, se requieren terminales de aire adicionales en cubierta` },
    ],
  };

  const normative: NormativeFoundation = {
    standard:  'IEC 62305-3',
    edition:   'Ed. 2.0 2010-12',
    chapter:   'Cláusula 5.2.1 — Método de la esfera rodante',
    table:     'Tabla 2 (radio r, espaciado malla, ángulo α), Tabla 4 (espaciado bajantes)',
    equation:  'No hay ecuación explícita — el radio r se toma directamente de Tabla 2',
    applicabilityConditions: [
      'Aplicable a estructuras de cualquier forma y altura',
      'Preferido sobre el método del ángulo de protección para estructuras complejas o > 60 m',
      'El nivel LPS debe ser determinado previamente por evaluación de riesgo (IEC 62305-2)',
    ],
    standardLimitations: [
      'El método determina dónde colocar terminales de captación — no calcula la probabilidad residual de impacto',
      'Para rayos de corriente < corriente mínima del nivel LPS, el método no garantiza captación',
      `LPS ${lvl}: corriente mínima captada = ${lvl === 'I' ? 3 : lvl === 'II' ? 5 : lvl === 'III' ? 10 : 16} kA`,
    ],
    hierarchyNote:
      'IEC 62305-3 tiene equivalentes nacionales: EN 62305-3 (Europa), NFPA 780 (EE.UU.), AS/NZS 1768 (Australia). Los radios de esfera son iguales en IEC y EN; NFPA 780 no usa la esfera rodante como método primario.',
  };

  const eng: EngineeringFoundation = {
    selectedSolution: `Método de esfera rodante LPS ${lvl} con ${minDC} conductores descendentes, espaciado ${dcSpacing.toFixed(1)} m`,
    whySelected:
      'La esfera rodante es el método más versátil de IEC 62305-3: no depende de la altura del terminal de captación (como el ángulo de protección) y maneja correctamente geometrías complejas (cubiertas curvas, terrazas, instalaciones en cubierta). Es el método preferido del estándar para cualquier estructura.',
    discardedAlternatives: [
      {
        name: 'Método del ángulo de protección (IEC 62305-3 §5.2.2)',
        reason: `Válido solo para estructuras simples de hasta ${r} m de altura y terminales de captación aislados. Para estructuras con instalaciones en cubierta, el ángulo depende de H y puede ser muy restrictivo.`,
      },
      {
        name: 'Método de la malla (jaula Faraday) (IEC 62305-3 §5.2.3)',
        reason: `Adecuado cuando toda la cubierta puede cubrirse con conductor (malla máx. ${MAX_MESH[lvl]} m × ${MAX_MESH[lvl]} m). Más costoso pero protege contra impactos en cualquier punto de la cubierta. Puede combinarse con esfera rodante.`,
      },
    ],
    advantages: [
      'Aplicable universalmente — no hay restricción de altura ni forma',
      'Permite optimizar la ubicación de terminales de captación punto a punto',
      'Fácil de verificar gráficamente (sección transversal con esfera dibujada)',
      'Acepta mezcla de pararrayos tipo punta, conductores de cubierta y elementos metálicos existentes',
    ],
    disadvantages: [
      'Más complejo de verificar que el ángulo de protección para auditores no especializados',
      `No garantiza captación de rayos de corriente inferior a ${lvl === 'I' ? 3 : lvl === 'II' ? 5 : lvl === 'III' ? 10 : 16} kA`,
      'Requiere modelado 3D para estructuras con geometría compleja',
    ],
    safetyLevel: lvl,
    redundancy:
      `Con ${minDC} bajantes, la falla de uno deja los demás funcionales. Para LPS ${lvl} se recomienda que ningún bajante aporte más del ${Math.round(100/minDC)} % de la corriente total — verificar sección mínima.`,
    constructability:
      `Los bajantes deben seguir el camino más recto posible (sin curvas < 0.2 m de radio) para minimizar la inductancia. El espaciado de ${dcSpacing.toFixed(1)} m permite distribuirlos regularmente en el perímetro.`,
    maintenanceImpact:
      'Inspección visual anual de conectores y mordazas. Medición de continuidad de cada bajante cada 4 años. Las soldaduras cadweld o exotérmicas son preferibles a conectores mecánicos en zonas húmedas.',
    expectedLifespan:
      'Conductores de cobre: 40+ años. Acero galvanizado: 25–35 años (clima templado) o 15–20 años (ambiente marino/industrial). Conectores de acero inoxidable: 30+ años.',
  };

  return {
    result,
    explanation: { physical, mathematical: math, normative, engineering: eng },
  };
}
