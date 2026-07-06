'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { NORMATIVE_PROFILES, getNormativeProfile, type NormativeProfile } from '@gdp/engines-math';

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

export function NormativeProfileProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileIdState] = useState(DEFAULT_PROFILE.id);
  const [relaxedConditionsMet, setRelaxedConditionsMetState] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setProfileIdState(saved);
    const savedRelaxed = localStorage.getItem(RELAXED_STORAGE_KEY);
    if (savedRelaxed) setRelaxedConditionsMetState(savedRelaxed === 'true');
  }, []);

  const setProfileId = useCallback((id: string) => {
    setProfileIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const setRelaxedConditionsMet = useCallback((met: boolean) => {
    setRelaxedConditionsMetState(met);
    localStorage.setItem(RELAXED_STORAGE_KEY, String(met));
  }, []);

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
