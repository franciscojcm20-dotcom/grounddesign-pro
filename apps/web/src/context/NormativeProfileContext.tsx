'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { NORMATIVE_PROFILES, getNormativeProfile, getProfileForCountry, type NormativeProfile } from '@gdp/engines-math';
import { useAuth } from './AuthContext';
import { authApi } from '@/lib/auth';

interface NormativeProfileCtx {
  profile: NormativeProfile;
  profileId: string;
  setProfileId: (id: string) => void;
  profiles: NormativeProfile[];
  /** Declarado por la persona usuaria: la instalación cumple las condiciones de
   * protección (rgRelaxedConditions) que habilitan el límite rgRelaxed del perfil. */
  relaxedConditionsMet: boolean;
  setRelaxedConditionsMet: (met: boolean) => void;
}

const STORAGE_KEY = 'gdp-normative-profile';
const RELAXED_STORAGE_KEY = 'gdp-normative-relaxed-conditions-met';
const DEFAULT_PROFILE = NORMATIVE_PROFILES[0]!;

const Ctx = createContext<NormativeProfileCtx>({
  profile: DEFAULT_PROFILE,
  profileId: DEFAULT_PROFILE.id,
  setProfileId: () => {},
  profiles: NORMATIVE_PROFILES,
  relaxedConditionsMet: false,
  setRelaxedConditionsMet: () => {},
});

/**
 * Con sesión activa, la cuenta (base de datos) es la fuente de verdad: el país
 * fija el perfil por defecto (norma nacional verificada o IEEE 80/81 genérico),
 * con override manual y la declaración de condiciones de relajación persistidos
 * por usuario — consistente entre dispositivos. Sin sesión, se usa localStorage
 * por navegador, igual que antes.
 */
export function NormativeProfileProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [localProfileId, setLocalProfileId] = useState(DEFAULT_PROFILE.id);
  const [localRelaxed, setLocalRelaxed] = useState(false);

  useEffect(() => {
    if (user) return; // la cuenta manda cuando hay sesión — no pisar con lo guardado en este navegador
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setLocalProfileId(saved);
    const savedRelaxed = localStorage.getItem(RELAXED_STORAGE_KEY);
    if (savedRelaxed) setLocalRelaxed(savedRelaxed === 'true');
  }, [user]);

  const profileId = user
    ? (user.normativeProfileId ?? getProfileForCountry(user.countryCode).id)
    : localProfileId;
  const relaxedConditionsMet = user ? (user.rgRelaxedConditionsMet ?? false) : localRelaxed;

  const setProfileId = useCallback((id: string) => {
    if (user) {
      authApi.updateMe({ normativeProfileId: id }).then(d => setUser(d.user)).catch(() => {});
    } else {
      setLocalProfileId(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, [user, setUser]);

  const setRelaxedConditionsMet = useCallback((met: boolean) => {
    if (user) {
      authApi.updateMe({ rgRelaxedConditionsMet: met }).then(d => setUser(d.user)).catch(() => {});
    } else {
      setLocalRelaxed(met);
      localStorage.setItem(RELAXED_STORAGE_KEY, String(met));
    }
  }, [user, setUser]);

  return (
    <Ctx.Provider value={{
      profile: getNormativeProfile(profileId), profileId, setProfileId, profiles: NORMATIVE_PROFILES,
      relaxedConditionsMet, setRelaxedConditionsMet,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNormativeProfile() {
  return useContext(Ctx);
}
