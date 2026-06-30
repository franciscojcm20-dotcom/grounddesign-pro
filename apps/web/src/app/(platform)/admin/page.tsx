import type { Metadata } from 'next';
import { AdminClient } from './AdminClient';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Panel de administración — GroundDesing Pro',
};

export default function AdminPage() {
  return <AdminClient />;
}
