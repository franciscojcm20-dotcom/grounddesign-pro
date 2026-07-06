// tests/pdf.test.ts — Pruebas de humo para @gdp/pdf-engine (generación de PDF y DXF)
// Ejecución: node --experimental-strip-types --test tests/pdf.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateReportBuffer,
  generateGridDxf, generateRodDxf, generateStripDxf, generateRadialDxf, generateRingDxf, generateCombinedDxf,
  type ReportMeta, type ReportSection,
} from '../src/index.ts';

const META: ReportMeta = { projectName: 'Proyecto de prueba', engineer: 'Ing. QA' };

const SECTION: ReportSection = {
  title: 'Sección de prueba',
  norm: 'IEEE Std 80-2013',
  inputs: [{ label: 'ρ suelo', value: 110, unit: 'Ω·m' }],
  results: [{ label: 'Rg', value: '1.616', unit: 'Ω', highlight: true }],
  pass: true,
  passLabel: 'Rg = 1.616 Ω — CUMPLE',
  observations: ['Observación de prueba.'],
};

describe('generateReportBuffer — PDF', () => {
  it('genera un buffer con la firma binaria de un PDF (%PDF-)', async () => {
    const buffer = await generateReportBuffer({ meta: META, sections: [SECTION] });
    assert.ok(Buffer.isBuffer(buffer), 'debe devolver un Buffer');
    assert.ok(buffer.length > 500, 'el PDF generado no debería estar vacío/truncado');
    assert.strictEqual(buffer.subarray(0, 5).toString('latin1'), '%PDF-', 'debe iniciar con la firma de PDF');
  });

  it('genera un PDF válido con múltiples secciones', async () => {
    const buffer = await generateReportBuffer({
      meta: META,
      sections: [SECTION, { ...SECTION, title: 'Segunda sección', pass: false }],
    });
    assert.strictEqual(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
  });

  it('no lanza con secciones sin observations/norm (campos opcionales)', async () => {
    const minimal: ReportSection = { title: 'Mínima', inputs: [], results: [] };
    const buffer = await generateReportBuffer({ meta: META, sections: [minimal] });
    assert.strictEqual(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
  });

  it('genera portada + índice + capítulos con identificación completa del proyectista', async () => {
    const meta: ReportMeta = {
      ...META,
      projectCode: 'GDP-TEST-01',
      company: 'Consultora QA SpA',
      engineerTitle: 'Ingeniero Civil Eléctrico',
      engineerLicense: 'Licencia SEC Clase A N°12345',
      location: 'Santiago, Chile',
      norm: 'IEEE Std 80-2013',
    };
    const buffer = await generateReportBuffer({ meta, sections: [SECTION, { ...SECTION, title: 'Otra sección' }] });
    assert.strictEqual(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
    // Portada (1) + índice (2) + al menos una página de cálculo (3)
    assert.ok(buffer.length > 2000, 'un informe con portada e índice no debería ser tan pequeño');
  });

  it('acepta un logo PNG válido en data URL y no lanza', async () => {
    // PNG 1×1 transparente (válido, mínimo)
    const png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const buffer = await generateReportBuffer({
      meta: { ...META, logoDataUrl: `data:image/png;base64,${png1x1}` },
      sections: [SECTION],
    });
    assert.strictEqual(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
  });

  it('ignora un logo corrupto sin abortar el informe', async () => {
    const buffer = await generateReportBuffer({
      meta: { ...META, logoDataUrl: 'data:image/png;base64,QUJDRA==' }, // base64 válido pero no es un PNG
      sections: [SECTION],
    });
    assert.strictEqual(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
  });

  it('un informe con muchos capítulos pagina y no lanza (índice multi-página de cálculo)', async () => {
    const sections = Array.from({ length: 15 }, (_, i) => ({ ...SECTION, title: `Capítulo ${i + 1}` }));
    const buffer = await generateReportBuffer({ meta: META, sections });
    assert.strictEqual(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
  });
});

describe('Generadores DXF — estructura mínima válida', () => {
  const expectValidDxf = (dxf: string, label: string) => {
    assert.ok(dxf.includes('SECTION'), `${label}: debe contener al menos una SECTION`);
    assert.ok(dxf.includes('ENTITIES'), `${label}: debe contener la sección ENTITIES`);
    assert.match(dxf, /\bEOF\b/, `${label}: debe terminar con marcador EOF`);
  };

  it('generateGridDxf produce DXF válido para una malla rectangular', () => {
    const dxf = generateGridDxf({
      largo: 40, ancho: 30, nConductoresL: 7, nConductoresW: 5, nVarillas: 12, longVarilla: 3,
      proyecto: 'Test', norm: 'IEEE 80',
    });
    expectValidDxf(dxf, 'generateGridDxf');
  });

  it('generateRodDxf produce DXF válido para electrodos en paralelo', () => {
    const dxf = generateRodDxf({ n: 4, L: 3, spacing: 6, proyecto: 'Test' });
    expectValidDxf(dxf, 'generateRodDxf');
  });

  it('generateStripDxf produce DXF válido para conductor horizontal', () => {
    const dxf = generateStripDxf({ L: 20, h: 0.6, proyecto: 'Test' });
    expectValidDxf(dxf, 'generateStripDxf');
  });

  it('generateRadialDxf produce DXF válido para sistema radial', () => {
    const dxf = generateRadialDxf({ n: 8, L: 20, proyecto: 'Test' });
    expectValidDxf(dxf, 'generateRadialDxf');
  });

  it('generateRingDxf produce DXF válido para anillo perimetral', () => {
    const dxf = generateRingDxf({ largo: 30, ancho: 20, proyecto: 'Test' });
    expectValidDxf(dxf, 'generateRingDxf');
  });

  it('generateCombinedDxf produce DXF válido para malla + picas', () => {
    const dxf = generateCombinedDxf({
      largo: 40, ancho: 30, nConductoresL: 7, nConductoresW: 5,
      nRods: 12, rodLength: 3, proyecto: 'Test',
    });
    expectValidDxf(dxf, 'generateCombinedDxf');
  });
});
