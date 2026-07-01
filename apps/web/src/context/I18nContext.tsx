'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Locale = 'es' | 'en';

const DICT = {
  es: {
    // ── Navigation ───────────────────────────────────────────────────────────
    dashboard:    'Panel de control',
    projects:     'Proyectos',
    pricing:      'Precios',
    profile:      'Mi perfil',
    settings:     'Configuración',
    logout:       'Cerrar sesión',
    // ── Actions ──────────────────────────────────────────────────────────────
    calculate:    'Calcular',
    calculating:  'Calculando…',
    exportPdf:    '↓ Exportar PDF',
    generating:   '⏳ Generando…',
    downloaded:   '✓ Descargado',
    addReading:   '+ Agregar lectura',
    saveChanges:  'Guardar cambios',
    saved:        '✓ Guardado',
    upgrade:      'Mejorar plan',
    // ── UI ───────────────────────────────────────────────────────────────────
    lang:         'Idioma',
    theme:        'Tema',
    dark:         'Oscuro',
    light:        'Claro',
    system:       'Sistema',
    account:      'Cuenta',
    notifications:'Notificaciones',
    norm:         'Norma activa',
    noProjects:   'No tienes proyectos aún.',
    createFirst:  'Crea uno para guardar tus cálculos.',
    // ── Calc shared ──────────────────────────────────────────────────────────
    inputs:       'Parámetros de entrada',
    results:      'Resultados',
    observations: 'Observaciones',
    complies:     '✓ CUMPLE',
    fails:        '✗ NO CUMPLE',
    // ── Soil fields ──────────────────────────────────────────────────────────
    spacing:      'Espaciamiento a',
    resistance:   'Resistencia medida R',
    rhoApp:       'ρa aparente',
    rhoAvg:       'ρ promedio',
    rho1:         'ρ₁ capa superior',
    rho2:         'ρ₂ capa inferior',
    depth:        'Profundidad h',
    // ── Grid fields ──────────────────────────────────────────────────────────
    gridLength:   'Largo de malla',
    gridWidth:    'Ancho de malla',
    gridDepth:    'Profundidad de entierro',
    numCondLong:  'Nº conductores largo',
    numCondWide:  'Nº conductores ancho',
    numRods:      'Nº varillas verticales',
    rodLength:    'Longitud de varilla',
    soilRho:      'ρ suelo',
    gridResistance:'Resistencia de malla Rg',
    // ── Conductor fields ─────────────────────────────────────────────────────
    faultCurrent: 'Corriente de falla If',
    clearingTime: 'Tiempo de despeje tc',
    ambientTemp:  'Temperatura ambiente',
    maxTemp:      'Temperatura máxima de fusión',
    minArea:      'Área mínima requerida',
    awgSize:      'Calibre AWG/MCM',
    selectedArea: 'Área seleccionada',
    safetyMargin: 'Margen de seguridad',
    // ── Voltages fields ──────────────────────────────────────────────────────
    surfRho:      'ρ capa superficial',
    surfThick:    'Espesor capa superficial',
    faultCurrent2:'Corriente de falla Ig',
    clearingTime2:'Tiempo de despeje ts',
    personWeight: 'Peso de persona',
    meshVoltage:  'Tensión de malla Em',
    stepVoltage:  'Tensión de paso Es',
    admTouch:     'Etouch admisible',
    admStep:      'Estep admisible',
    // ── Lightning fields ─────────────────────────────────────────────────────
    lightningTitle:    'Sistema de Protección contra Rayos (SPR)',
    lightningSubtitle: 'Método de esfera rodante per IEC 62305-3 / NFPA 780. Evaluación de riesgo per IEC 62305-2.',
    structLength:  'Largo',
    structWidth:   'Ancho',
    structHeight:  'Altura',
    flashDensity:  'Densidad de descargas Ng (desc/km²/año)',
    envFactor:     'Factor entorno Cd',
    occupancy:     'Tipo de ocupación',
    lpsLevel:      'Nivel LPS a evaluar (IEC 62305-3)',
    sphereRadius:  'Radio esfera rodante r',
    collectArea:   'Área de captación Ad',
    annualStrikes: 'Frec. anual Nd',
    tolFreq:       'Frec. tolerable NT',
    reqEfficiency: 'Eficiencia requerida E',
    recLevel:      'Nivel LPS recomendado',
    downConductors:'Conductores descendentes',
    groundTerms:   'Terminaciones a tierra',
    maxSpacing:    'Separación máx. entre desc.',
    protRequired:  '✗ SE REQUIERE SPR',
    protNotRequired:'✓ NO REQUIERE SPR',
    sphereView:    'Vista de alzado — Esfera rodante',
    designSpr:     'Diseño SPR',
    riskResults:   'Resultados IEC 62305-2',
    geomSection:   'Geometría de la estructura',
    riskSection:   'Parámetros de riesgo',
  },
  en: {
    // ── Navigation ───────────────────────────────────────────────────────────
    dashboard:    'Dashboard',
    projects:     'Projects',
    pricing:      'Pricing',
    profile:      'My profile',
    settings:     'Settings',
    logout:       'Log out',
    // ── Actions ──────────────────────────────────────────────────────────────
    calculate:    'Calculate',
    calculating:  'Calculating…',
    exportPdf:    '↓ Export PDF',
    generating:   '⏳ Generating…',
    downloaded:   '✓ Downloaded',
    addReading:   '+ Add reading',
    saveChanges:  'Save changes',
    saved:        '✓ Saved',
    upgrade:      'Upgrade plan',
    // ── UI ───────────────────────────────────────────────────────────────────
    lang:         'Language',
    theme:        'Theme',
    dark:         'Dark',
    light:        'Light',
    system:       'System',
    account:      'Account',
    notifications:'Notifications',
    norm:         'Active standard',
    noProjects:   'No projects yet.',
    createFirst:  'Create one to save your calculations.',
    // ── Calc shared ──────────────────────────────────────────────────────────
    inputs:       'Input parameters',
    results:      'Results',
    observations: 'Observations',
    complies:     '✓ COMPLIES',
    fails:        '✗ DOES NOT COMPLY',
    // ── Soil fields ──────────────────────────────────────────────────────────
    spacing:      'Spacing a',
    resistance:   'Measured resistance R',
    rhoApp:       'Apparent ρa',
    rhoAvg:       'Average ρ',
    rho1:         'ρ₁ upper layer',
    rho2:         'ρ₂ lower layer',
    depth:        'Depth h',
    // ── Grid fields ──────────────────────────────────────────────────────────
    gridLength:   'Grid length',
    gridWidth:    'Grid width',
    gridDepth:    'Burial depth',
    numCondLong:  'No. conductors length',
    numCondWide:  'No. conductors width',
    numRods:      'No. ground rods',
    rodLength:    'Rod length',
    soilRho:      'Soil ρ',
    gridResistance:'Grid resistance Rg',
    // ── Conductor fields ─────────────────────────────────────────────────────
    faultCurrent: 'Fault current If',
    clearingTime: 'Clearing time tc',
    ambientTemp:  'Ambient temperature',
    maxTemp:      'Maximum fusion temperature',
    minArea:      'Minimum required area',
    awgSize:      'AWG/MCM gauge',
    selectedArea: 'Selected area',
    safetyMargin: 'Safety margin',
    // ── Voltages fields ──────────────────────────────────────────────────────
    surfRho:      'Surface layer ρ',
    surfThick:    'Surface layer thickness',
    faultCurrent2:'Fault current Ig',
    clearingTime2:'Clearing time ts',
    personWeight: 'Person weight',
    meshVoltage:  'Mesh voltage Em',
    stepVoltage:  'Step voltage Es',
    admTouch:     'Tolerable touch voltage',
    admStep:      'Tolerable step voltage',
    // ── Lightning fields ─────────────────────────────────────────────────────
    lightningTitle:    'Lightning Protection System (LPS)',
    lightningSubtitle: 'Rolling sphere method per IEC 62305-3 / NFPA 780. Risk assessment per IEC 62305-2.',
    structLength:  'Length',
    structWidth:   'Width',
    structHeight:  'Height',
    flashDensity:  'Ground flash density Ng (flashes/km²/yr)',
    envFactor:     'Environment factor Cd',
    occupancy:     'Occupancy type',
    lpsLevel:      'LPS level to evaluate (IEC 62305-3)',
    sphereRadius:  'Rolling sphere radius r',
    collectArea:   'Collection area Ad',
    annualStrikes: 'Annual frequency Nd',
    tolFreq:       'Tolerable frequency NT',
    reqEfficiency: 'Required efficiency E',
    recLevel:      'Recommended LPS level',
    downConductors:'Down conductors',
    groundTerms:   'Ground terminations',
    maxSpacing:    'Max. spacing between conductors',
    protRequired:  '✗ LPS REQUIRED',
    protNotRequired:'✓ LPS NOT REQUIRED',
    sphereView:    'Elevation view — Rolling sphere',
    designSpr:     'LPS Design',
    riskResults:   'IEC 62305-2 Results',
    geomSection:   'Structure geometry',
    riskSection:   'Risk parameters',
  },
} as const;

export type TranslationKey = keyof (typeof DICT)['es'];

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'es';
    return (localStorage.getItem('gdp_locale') as Locale) ?? 'es';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('gdp_locale', l);
  }, []);

  const t = useCallback((key: TranslationKey): string => DICT[locale][key], [locale]);

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be inside I18nProvider');
  return ctx;
}
