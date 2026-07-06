import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from '@/components/ui/ClientProviders';

export const metadata: Metadata = {
  title: {
    default: 'GroundDesign Pro',
    template: '%s — GroundDesign Pro',
  },
  description: 'Plataforma SaaS para diseño profesional de sistemas de puesta a tierra. Motor IEEE 80-2013 / 81-2012 propio. 7 módulos de cálculo, reportes PDF, gestión de proyectos.',
  keywords: ['puesta a tierra', 'grounding', 'earthing', 'IEEE 80', 'IEEE 81', 'resistividad', 'Wenner', 'Schlumberger'],
  authors: [{ name: 'GroundDesign Pro' }],
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'GroundDesign Pro',
    title: 'GroundDesign Pro — Diseño de puesta a tierra IEEE',
    description: 'Motor IEEE 80/81 propio. 7 módulos de cálculo, reportes PDF profesionales, gestión de proyectos.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
