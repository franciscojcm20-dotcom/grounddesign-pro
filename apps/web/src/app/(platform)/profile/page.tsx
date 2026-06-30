import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = { title: 'Mi perfil' };

export default function ProfilePage() {
  return <ProfileClient />;
}
