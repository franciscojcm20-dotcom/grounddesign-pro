import type { Metadata } from 'next';
import { ForgotPasswordClient } from './ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description: 'Envía un enlace de recuperación a tu correo electrónico.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
