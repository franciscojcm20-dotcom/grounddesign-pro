import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider, useI18n, LOCALES } from '@/context/I18nContext';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

// DICT no está tipado como Record<Locale, Record<TranslationKey, string>>, así que
// TypeScript no obliga a que las 8 traducciones tengan exactamente las mismas claves
// que 'es' — un traductor podría agregar una clave nueva solo en 'es' y el build
// seguiría pasando. Esta prueba es la única red que detecta ese desajuste en runtime.
function ProbeInner({ keys }: { keys: string[] }) {
  const { t } = useI18n();
  return (
    <ul>
      {keys.map(k => (
        <li key={k} data-testid={`key-${k}`}>{t(k as never)}</li>
      ))}
    </ul>
  );
}

const ALL_KEYS = [
  'dashboard', 'projects', 'pricing', 'profile', 'settings', 'logout', 'calculate', 'calculating',
  'exportPdf', 'generating', 'downloaded', 'addReading', 'saveChanges', 'saved', 'upgrade', 'lang',
  'theme', 'dark', 'light', 'system', 'account', 'notifications', 'norm', 'noProjects', 'createFirst',
  'inputs', 'results', 'observations', 'complies', 'fails', 'spacing', 'resistance', 'rhoApp', 'rhoAvg',
  'rho1', 'rho2', 'depth', 'gridLength', 'gridWidth', 'gridDepth', 'numCondLong', 'numCondWide', 'numRods',
  'rodLength', 'soilRho', 'gridResistance', 'faultCurrent', 'clearingTime', 'ambientTemp', 'maxTemp',
  'minArea', 'awgSize', 'selectedArea', 'safetyMargin', 'surfRho', 'surfThick', 'faultCurrent2',
  'clearingTime2', 'personWeight', 'meshVoltage', 'stepVoltage', 'admTouch', 'admStep',
  'groupSoilMeasurement', 'groupFaultAnalysis', 'groupGridDesign', 'groupVerification',
  'moduleFieldMeasurements', 'moduleSchlumberger', 'moduleWenner', 'moduleNLayer', 'moduleFaultAnalysis',
  'moduleGridRectangular', 'moduleGridRod', 'moduleGridStrip', 'moduleGridRadial', 'moduleGridRing',
  'moduleGridCombined', 'moduleVoltages', 'moduleGpr', 'moduleReport', 'viewProjects', 'calcModulesTitle',
  'calcModulesTooltip', 'closeWord', 'modulesWord', 'adminWord', 'preferences', 'langDesc', 'normDesc',
  'weeklyDigest', 'weeklyDigestDesc', 'attachPdf', 'attachPdfDesc', 'deliverablesSubtitle',
  'tabConsolidated', 'tabValorization', 'tabDxf', 'normativeProfile', 'normativeProfileReference',
  'rgCriticalWord', 'rgGeneralWord', 'touchVoltageWord',
];

describe('I18nContext — completitud de traducciones entre los 8 locales', () => {
  it('LOCALES declara exactamente los 8 idiomas soportados', () => {
    expect(LOCALES.map(l => l.value).sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'ja', 'pt', 'zh']);
  });

  it.each(LOCALES.map(l => l.value))('t(key) devuelve un string no vacío para cada clave en locale "%s"', async (locale) => {
    window.localStorage.setItem('gdp_locale', locale);
    render(
      <I18nProvider>
        <ProbeInner keys={ALL_KEYS} />
      </I18nProvider>,
    );
    for (const key of ALL_KEYS) {
      const el = screen.getByTestId(`key-${key}`);
      expect(el.textContent, `locale "${locale}" — clave "${key}" vacía o ausente (traducción faltante)`).not.toBe('');
    }
  });
});

describe('I18nContext — persistencia y detección de idioma', () => {
  it('usa el locale guardado en localStorage si es válido', () => {
    window.localStorage.setItem('gdp_locale', 'fr');
    render(
      <I18nProvider>
        <ProbeInner keys={['dashboard']} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('key-dashboard').textContent).toBe('Tableau de bord');
  });

  it('ignora un locale guardado inválido y cae al idioma del navegador (o a "es" si tampoco es soportado)', () => {
    window.localStorage.setItem('gdp_locale', 'xx-invalid');
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ko-KR'); // coreano: no soportado
    render(
      <I18nProvider>
        <ProbeInner keys={['dashboard']} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('key-dashboard').textContent).toBe('Panel de control');
  });
});
