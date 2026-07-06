import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/grounddesign';

export const sql = postgres(DATABASE_URL, { max: 10 });

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  plan: 'community' | 'individual' | 'professional';
  country_code: string | null;
  normative_profile_id: string | null;
  rg_relaxed_conditions_met: boolean;
  created_at: Date;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CalcResult {
  id: string;
  project_id: string;
  module: string;
  inputs: unknown;
  outputs: unknown;
  norm: string | null;
  created_at: Date;
}
