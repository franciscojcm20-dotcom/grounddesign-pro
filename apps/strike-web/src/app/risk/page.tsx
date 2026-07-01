import type { Metadata } from 'next';
import { RiskClient } from './RiskClient';

export const metadata: Metadata = {
  title: 'Evaluación de Riesgo IEC 62305-2',
  description: 'Evaluación de riesgo por descargas atmosféricas per IEC 62305-2. Motor de Ingeniería Explicable con los 4 pilares: físico, matemático, normativo e ingenieril.',
};

export default function RiskPage() {
  return <RiskClient />;
}
