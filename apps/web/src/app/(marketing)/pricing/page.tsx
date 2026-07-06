import type { Metadata } from 'next';
import { PricingClient } from './PricingClient';

export const metadata: Metadata = {
  title: 'Planes y precios — GroundDesign Pro',
  description: 'Community gratis · Individual CLP 29.900 · Professional CLP 79.900. Motor IEEE 80/81 en todos los planes.',
};

export default function PricingPage() {
  return <PricingClient />;
}
