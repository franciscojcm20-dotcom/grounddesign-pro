'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { NORMATIVE_PROFILES, getNormativeProfile, type NormativeProfile } from '@gdp/engines-math';

interface NormativeProfileCtx {
  profile: NormativeProfile;
  profileId: string;
  setProfileId: (id: string) => void;
  profiles: NormativeProfile[];
}

const STORAGE_KEY = 'gdp-normative-profile';
const DEFAULT_PROFILE = NORMATIVE_PROFILES[0]!;

const Ctx = createContext<NormativeProfileCtx>({
  profile: DEFAULT_PROFILE,
  profileId: DEFAULT_PROFILE.id,
  setProfileId: () => {},
  profiles: NORMATIVE_PROFILES,
});

export function NormativeProfileProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileIdState] = useState(DEFAULT_PROFILE.id);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setProfileIdState(saved);
  }, []);

  const setProfileId = useCallback((id: string) => {
    setProfileIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <Ctx.Provider value={{ profile: getNormativeProfile(profileId), profileId, setProfileId, profiles: NORMATIVE_PROFILES }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNormativeProfile() {
  return useContext(Ctx);
}
