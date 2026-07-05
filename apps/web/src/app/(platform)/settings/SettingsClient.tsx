'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n, type Locale, LOCALES } from '@/context/I18nContext';
import { useToast } from '@/context/ToastContext';
import { useNormativeProfile } from '@/context/NormativeProfileContext';
import { AuthGuard } from '@/components/ui/AuthGuard';

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid var(--line)', gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
        {description && <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 3,
        color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 10,
        padding: '6px 10px', cursor: 'pointer', outline: 'none',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--copper)' : 'var(--line)',
        position: 'relative', transition: 'background .2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 20 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
      }} />
    </button>
  );
}

function SettingsContent() {
  const { user }          = useAuth();
  const { locale, setLocale, t } = useI18n();
  const toast             = useToast();
  const { profile, profileId, setProfileId, profiles } = useNormativeProfile();

  const [emailNotif, setEmailNotif] = useState(true);
  const [pdfAttach,  setPdfAttach]  = useState(false);
  const [saved, setSaved]           = useState(false);

  function save() {
    localStorage.setItem('gdp_email_notif', String(emailNotif));
    localStorage.setItem('gdp_pdf_attach',  String(pdfAttach));
    setSaved(true);
    toast.success(t('saved'));
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ padding: '28px 40px', maxWidth: 680 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 28 }}>{t('settings')}</h1>

      {/* Account info */}
      <section style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
          {t('account')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--copper-soft)', border: '1px solid var(--copper)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: 'var(--copper)',
          }}>
            {user?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{user?.email}</div>
          </div>
          <div style={{
            marginLeft: 'auto', fontSize: 9.5, padding: '3px 10px', borderRadius: 10,
            background: 'var(--warn-soft)', border: '1px solid var(--warn)', color: 'var(--warn)',
            textTransform: 'uppercase', letterSpacing: '.05em',
          }}>
            {user?.plan ?? 'community'}
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
          {t('preferences')}
        </div>

        <SettingRow label={t('lang')} description={t('langDesc')}>
          <Select
            value={locale}
            onChange={v => setLocale(v as Locale)}
            options={LOCALES.map(l => ({ value: l.value, label: `${l.flag}  ${l.label}` }))}
          />
        </SettingRow>

        <SettingRow label={t('norm')} description={t('normDesc')}>
          <Select
            value={profileId}
            onChange={setProfileId}
            options={profiles.map(p => ({ value: p.id, label: p.label }))}
          />
        </SettingRow>
        <div style={{ fontSize: 9.5, color: 'var(--faint)', lineHeight: 1.5, marginTop: -6, marginBottom: 4 }}>
          {profile.standard} — Rg crítico ≤ {profile.rgCritical} Ω · Rg general ≤ {profile.rgGeneral} Ω
        </div>
      </section>

      {/* Notifications */}
      <section style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
          {t('notifications')}
        </div>

        <SettingRow label={t('weeklyDigest')} description={t('weeklyDigestDesc')}>
          <Toggle checked={emailNotif} onChange={setEmailNotif} />
        </SettingRow>

        <SettingRow label={t('attachPdf')} description={t('attachPdfDesc')}>
          <Toggle checked={pdfAttach} onChange={setPdfAttach} />
        </SettingRow>
      </section>

      <button onClick={save} style={{
        background: saved ? 'var(--safe)' : 'var(--copper)', border: 'none', color: '#fff',
        fontWeight: 700, fontSize: 11, padding: '10px 24px', borderRadius: 3, cursor: 'pointer',
        transition: 'background .2s',
      }}>
        {saved ? t('saved') : t('saveChanges')}
      </button>
    </div>
  );
}

export function SettingsClient() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
