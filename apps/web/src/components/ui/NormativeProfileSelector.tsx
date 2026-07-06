'use client';
import { useState } from 'react';
import { useNormativeProfile } from '@/context/NormativeProfileContext';
import { useI18n } from '@/context/I18nContext';
import { inputStyle } from './CalcShared';

/**
 * Selector de perfil normativo (país/norma) que determina los límites de
 * referencia de resistencia de puesta a tierra usados en los semáforos de
 * cumplimiento de cada módulo. La física de las fórmulas no cambia — solo
 * el criterio de cumplimiento (Rg crítico/general) según la norma elegida.
 */
export function NormativeProfileSelector() {
  const { profile, profileId, setProfileId, profiles, relaxedConditionsMet, setRelaxedConditionsMet } = useNormativeProfile();
  const { t } = useI18n();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
        <span>{t('normativeProfile')}</span>
        <button type="button" onClick={() => setShowInfo(s => !s)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', fontSize: 10, padding: 0,
        }}>{showInfo ? '▾' : '▸'} {t('normativeProfileReference')}</button>
      </div>
      <select
        style={inputStyle}
        value={profileId}
        onChange={e => setProfileId(e.target.value)}
      >
        {profiles.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {showInfo && (
        <div style={{
          marginTop: 4, padding: '6px 8px', background: 'var(--bg)', border: '1px solid var(--line)',
          borderRadius: 3, fontSize: 8.5, color: 'var(--faint)', lineHeight: 1.5,
        }}>
          <div style={{ color: 'var(--dim)', marginBottom: 2 }}>{profile.standard}</div>
          <div>Rg {t('rgCriticalWord')} ≤ {profile.rgCritical} Ω · Rg {t('rgGeneralWord')} ≤ {profile.rgGeneral} Ω{profile.touchVoltageMaxV ? ` · U${t('touchVoltageWord')} ≤ ${profile.touchVoltageMaxV} V` : ''}</div>
          <div style={{ marginTop: 4 }}>{profile.notes}</div>
        </div>
      )}
      {profile.rgRelaxed !== undefined && (
        <label style={{
          display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 6, padding: '6px 8px',
          background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={relaxedConditionsMet}
            onChange={e => setRelaxedConditionsMet(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span style={{ fontSize: 9, color: 'var(--dim)', lineHeight: 1.5 }}>
            {t('rgRelaxedCheckbox')} ({t('rgRelaxedUpTo')} {profile.rgRelaxed} Ω)
            {profile.rgRelaxedConditions && (
              <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 2 }}>{profile.rgRelaxedConditions}</div>
            )}
          </span>
        </label>
      )}
    </div>
  );
}
