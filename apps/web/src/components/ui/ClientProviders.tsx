'use client';
import type { ReactNode } from 'react';
import { AuthProvider }    from '@/context/AuthContext';
import { ToastProvider }   from '@/context/ToastContext';
import { I18nProvider }    from '@/context/I18nContext';
import { CommandPalette }  from './CommandPalette';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
          <CommandPalette />
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
