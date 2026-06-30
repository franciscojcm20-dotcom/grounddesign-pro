'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Locale = 'es' | 'en';

const DICT = {
  es: {
    dashboard:    'Panel de control',
    projects:     'Proyectos',
    pricing:      'Precios',
    profile:      'Mi perfil',
    settings:     'Configuración',
    logout:       'Cerrar sesión',
    calculate:    'Calcular',
    calculating:  'Calculando…',
    exportPdf:    '↓ Exportar PDF',
    generating:   '⏳ Generando…',
    downloaded:   '✓ Descargado',
    addReading:   '+ Agregar lectura',
    lang:         'Idioma',
    theme:        'Tema',
    dark:         'Oscuro',
    light:        'Claro',
    system:       'Sistema',
    saveChanges:  'Guardar cambios',
    saved:        '✓ Guardado',
    account:      'Cuenta',
    notifications:'Notificaciones',
    norm:         'Norma activa',
    upgrade:      'Mejorar plan',
    noProjects:   'No tienes proyectos aún.',
    createFirst:  'Crea uno para guardar tus cálculos.',
  },
  en: {
    dashboard:    'Dashboard',
    projects:     'Projects',
    pricing:      'Pricing',
    profile:      'My profile',
    settings:     'Settings',
    logout:       'Log out',
    calculate:    'Calculate',
    calculating:  'Calculating…',
    exportPdf:    '↓ Export PDF',
    generating:   '⏳ Generating…',
    downloaded:   '✓ Downloaded',
    addReading:   '+ Add reading',
    lang:         'Language',
    theme:        'Theme',
    dark:         'Dark',
    light:        'Light',
    system:       'System',
    saveChanges:  'Save changes',
    saved:        '✓ Saved',
    account:      'Account',
    notifications:'Notifications',
    norm:         'Active standard',
    upgrade:      'Upgrade plan',
    noProjects:   'No projects yet.',
    createFirst:  'Create one to save your calculations.',
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
