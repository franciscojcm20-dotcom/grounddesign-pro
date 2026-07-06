import type { Metadata } from 'next';
import { OnboardingClient } from './OnboardingClient';

export const metadata: Metadata = {
  title: 'Bienvenido',
  description: 'Configura tu cuenta y conoce los módulos de GroundDesign Pro.',
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
