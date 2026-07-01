import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Strike Ground Design', template: '%s — Strike Ground Design' },
  description: 'Plataforma mundial de ingeniería en protección contra rayos. Motor de Ingeniería Explicable: IEC 62305, NFPA 780, IEEE 998.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
