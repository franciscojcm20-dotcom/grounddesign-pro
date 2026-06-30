import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = { title: 'Panel de trabajo' };

export default function DashboardPage() {
  return <DashboardClient />;
}
