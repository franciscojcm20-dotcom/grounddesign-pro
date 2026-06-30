import type { Metadata } from 'next';
import './globals.css';
import { Topbar }      from '@/components/ui/Topbar';
import { Sidebar }     from '@/components/ui/Sidebar';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'GroundDesing Pro',
  description: 'Diseño profesional de sistemas de puesta a tierra — IEEE 80/81',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Topbar />
          <div style={{ display: 'flex', height: 'calc(100vh - 44px)' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto' }}>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
