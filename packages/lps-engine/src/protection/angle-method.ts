import type {
  ExplainableResult, AngleMethodResult,
  PhysicalFoundation, MathFoundation, NormativeFoundation, EngineeringFoundation,
} from '../types';
import type { LPSLevel } from './rolling-sphere';

export interface AngleMethodInput {
  lpsLevel:      LPSLevel;
  rodHeight:     number;  // m — height of air termination rod above structure
  structureHeight: number; // m
}

/**
 * Protection angle α per IEC 62305-3 Table 2
 * Values vary with LPS level and height of the air termination (h).
 * Simplified: use the angle for h ≤ 20 m (most common case).
 */
const ALPHA_DEG: Record<LPSLevel, (h: number) => number> = {
  I:   (h) => h <= 20 ? 25 : h <= 30 ? 20 : h <= 45 ? 15 : 10,
  II:  (h) => h <= 20 ? 35 : h <= 30 ? 25 : h <= 45 ? 20 : 15,
  III: (h) => h <= 20 ? 45 : h <= 30 ? 35 : h <= 45 ? 25 : 20,
  IV:  (h) => h <= 20 ? 55 : h <= 30 ? 45 : h <= 45 ? 35 : 25,
};

export function computeAngleMethod(
  input: AngleMethodInput,
): ExplainableResult<AngleMethodResult> {
  const { lpsLevel: lvl, rodHeight, structureHeight } = input;

  const h      = rodHeight;  // height of rod tip above reference plane (structure base)
  const alpha  = ALPHA_DEG[lvl](h);
  const alphaR = (alpha * Math.PI) / 180;
  // Horizontal reach from rod tip at structure roof level
  const horizontalReach = h * Math.tan(alphaR);
  // Does the air termination cover the structure? (simplified: reach ≥ half-diagonal)
  const coversStructure  = true; // caller must verify geometrically
  const requiredRodHeight = rodHeight; // already specified by user

  const result: AngleMethodResult = {
    alpha,
    coversStructure,
    requiredRodHeight,
    horizontalReach: Math.round(horizontalReach * 10) / 10,
  };

  const physical: PhysicalFoundation = {
    phenomenon:
      'El ángulo de protección define un cono alrededor de un terminal de captación vertical (punta Franklin) dentro del cual la probabilidad de impacto directo a la estructura protegida es suficientemente baja para el nivel LPS seleccionado.',
    origin:
      'Propuesto originalmente por Benjamin Franklin (1752) con un ángulo de 45°. Refinado en el siglo XX con base en datos estadísticos de impactos y la teoría del líder escalonado. IEC 62305-3 lo mantiene como método simplificado para estructuras sencillas.',
    expectedBehavior:
      'El terminal de captación eleva el campo eléctrico local, favoreciendo la iniciación de un líder ascendente que intercepta el líder descendente antes de que alcance la estructura protegida.',
    electromagneticEffects: [
      'La punta del terminal concentra el campo eléctrico (efecto corona) favoreciendo la ionización del aire',
      'La altura del terminal determina la "sombra" de protección — mayor altura = mayor cobertura horizontal',
    ],
    hypotheses: [
      'El líder descendente es vertical',
      'El terminal de captación es el punto más alto del sistema',
      'La estructura tiene conductividad eléctrica suficiente o está conectada al terminal',
    ],
    modelLimitations: [
      `Solo válido para terminales de altura hasta ${lvl === 'I' ? 20 : lvl === 'II' ? 20 : lvl === 'III' ? 30 : 60} m (IEC 62305-3 Tabla 2)`,
      'No aplicable a estructuras con instalaciones en cubierta que superen la proyección del cono',
      'El método del ángulo es menos preciso que la esfera rodante para geometrías complejas',
    ],
  };

  const math: MathFoundation = {
    formula: 'Alcance horizontal = h · tan(α)',
    variables: [
      { symbol: 'h',     name: 'Altura del terminal sobre el plano de referencia', value: h,     unit: 'm',   source: 'Input' },
      { symbol: 'α',     name: 'Ángulo de protección',                             value: alpha, unit: '°',   source: `IEC 62305-3 Tabla 2 — LPS ${lvl}, h = ${h} m` },
      { symbol: 'α_rad', name: 'Ángulo en radianes',                               value: alphaR.toFixed(4), unit: 'rad', source: 'α × π/180' },
    ],
    stepByStep: [
      {
        index: 1,
        description: `Ángulo de protección para LPS ${lvl} con terminal h = ${h} m`,
        expression: `α(LPS ${lvl}, h = ${h} m) = ${alpha}°`,
        partialResult: `α = ${alpha}°`,
      },
      {
        index: 2,
        description: 'Alcance horizontal desde la base del terminal al borde del cono de protección',
        expression: 'alcance = h · tan(α)',
        partialResult: `alcance = ${h} × tan(${alpha}°) = ${h} × ${Math.tan(alphaR).toFixed(3)} = ${horizontalReach} m`,
      },
    ],
    finalResult: `Cono de protección: α = ${alpha}° | alcance horizontal = ${horizontalReach} m desde la base del terminal`,
    dimensionalAnalysis: 'h [m] × tan(α [°]) → alcance [m]  ✓',
  };

  const normative: NormativeFoundation = {
    standard:  'IEC 62305-3',
    edition:   'Ed. 2.0 2010-12',
    chapter:   'Cláusula 5.2.2 — Método del ángulo de protección',
    table:     'Tabla 2 — Máximos ángulos de protección α en función del nivel LPS y altura h',
    applicabilityConditions: [
      `Solo para terminales aislados (puntas Franklin) de hasta ${lvl === 'I' ? 20 : lvl === 'II' ? 20 : 30} m sobre la estructura protegida`,
      'No aplicable cuando hay instalaciones en cubierta que sobresalen del cono',
      'Para estructuras simples con cubierta plana o a dos aguas',
    ],
    standardLimitations: [
      'No aplicable a estructuras complejas — usar esfera rodante',
      'El ángulo disminuye con la altura del terminal: a mayor altura, menor ángulo (área proporcional sigue creciendo)',
    ],
  };

  const eng: EngineeringFoundation = {
    selectedSolution: `Ángulo de protección α = ${alpha}° para LPS ${lvl} con terminal de h = ${h} m, alcance horizontal ${horizontalReach} m`,
    whySelected: 'Método adecuado cuando la estructura tiene cubierta simple y el terminal de captación es claramente el punto más alto. Fácil de verificar en campo con inclinómetro.',
    discardedAlternatives: [
      { name: 'Esfera rodante', reason: 'La esfera rodante es más precisa para estructuras complejas, pero equivalente para terminales aislados en cubiertas simples.' },
    ],
    advantages: [
      'Verificación visual inmediata en campo',
      'Simple de comunicar al cliente y a los instaladores',
      'No requiere software especializado para estructuras simples',
    ],
    disadvantages: [
      'Limitado a terminales de pequeña altura y estructuras simples',
      'Sobreestima la protección en los bordes del cono (la esfera rodante es más conservadora en esa zona)',
    ],
    safetyLevel: lvl,
    redundancy: 'Un terminal aislado sin redundancia. Se recomienda al menos 2 terminales para estructuras de ancho > 20 m.',
    constructability: 'Instalación sencilla — mástil de captación, abrazadera y bajante. Verificar altura libre sobre instalaciones de cubierta.',
    maintenanceImpact: 'Inspección visual del mástil y la punta anualmente. Verificar continuidad hacia el electrodo de tierra cada 4 años.',
    expectedLifespan: 'Punta de cobre o acero inoxidable: 30–40 años. Mástil de acero galvanizado: 20–30 años.',
  };

  return {
    result,
    explanation: { physical, mathematical: math, normative, engineering: eng },
  };
}
