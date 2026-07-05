'use client';
import { useState } from 'react';
import Link from 'next/link';
import { API_BASE as BASE } from '@/lib/apiBase';

const PLANS = [
  {
    id: 'community', name: 'Community', price: 0, interval: null,
    color: 'var(--blue)', badge: null,
    features: ['3 proyectos', 'Todos los módulos IEEE 80/81', 'PDF con marca de agua', 'Historial de cálculos'],
    cta: 'Empezar gratis', ctaHref: '/register',
  },
  {
    id: 'individual', name: 'Individual', price: 29900, interval: 'mes',
    color: 'var(--warn)', badge: 'Más popular',
    features: ['Proyectos ilimitados', 'PDF profesional sin marca', 'Firma PE en reportes', 'Soporte por email', 'Guardar en proyecto ilimitado'],
    cta: 'Suscribirse', ctaHref: null,
  },
  {
    id: 'professional', name: 'Professional', price: 79900, interval: 'mes',
    color: 'var(--safe)', badge: null,
    features: ['5 usuarios incluidos', 'API access REST', 'Normas IEC 60364 / RETIE', 'Soporte prioritario', 'Onboarding técnico 1:1', 'Factura electrónica'],
    cta: 'Contactar ventas', ctaHref: 'mailto:ventas@grounddesing.pro',
  },
];

function fmtCLP(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

export function PricingClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function handleCheckout(planId: string) {
    setLoading(planId); setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/billing/checkout`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const body = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Error al iniciar pago');
      if (body.url) window.location.href = body.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(null); }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '56px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Planes y precios
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, letterSpacing: '-.02em' }}>
          Elige tu plan de GroundDesing Pro
        </h1>
        <p style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
          Motor IEEE propio en todos los planes. Sin dependencias externas de cálculo. Precios en CLP con IVA incluido.
        </p>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 4, padding: '10px 16px', fontSize: 11, color: 'var(--danger)', marginBottom: 24, textAlign: 'center' }}>
          {error}
          {error.includes('configurado') && (
            <span style={{ color: 'var(--faint)', display: 'block', marginTop: 4, fontSize: 10 }}>
              Añade STRIPE_SECRET_KEY y STRIPE_PRICE_* en el archivo .env de la API.
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {PLANS.map(plan => (
          <div key={plan.id} style={{
            background: 'var(--panel)', border: `1px solid ${plan.id === 'individual' ? plan.color + '44' : 'var(--line)'}`,
            borderRadius: 6, padding: '28px 24px', display: 'flex', flexDirection: 'column', position: 'relative',
            boxShadow: plan.id === 'individual' ? `0 0 24px ${plan.color}11` : 'none',
          }}>
            {plan.badge && (
              <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#000', fontSize: 9, fontWeight: 700, padding: '3px 12px', borderRadius: 10, letterSpacing: '.05em' }}>
                {plan.badge}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: plan.color, fontFamily: 'var(--font-mono)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {plan.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)', color: plan.price === 0 ? 'var(--dim)' : 'var(--text)' }}>
                  {plan.price === 0 ? 'Gratis' : fmtCLP(plan.price)}
                </span>
                {plan.interval && (
                  <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>/ {plan.interval}</span>
                )}
              </div>
            </div>

            <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: 'var(--dim)', lineHeight: 1.4 }}>
                  <span style={{ color: plan.color, flexShrink: 0, marginTop: 1, fontSize: 10 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {plan.ctaHref ? (
              <Link href={plan.ctaHref} style={{
                display: 'block', textAlign: 'center', padding: '10px 0',
                background: plan.id === 'community' ? 'var(--bg)' : plan.color,
                border: `1px solid ${plan.id === 'community' ? 'var(--line)' : plan.color}`,
                borderRadius: 3, color: plan.id === 'community' ? 'var(--dim)' : '#000',
                textDecoration: 'none', fontWeight: 700, fontSize: 11,
              }}>
                {plan.cta}
              </Link>
            ) : (
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: '100%', padding: '10px 0', background: plan.color,
                  border: 'none', borderRadius: 3, color: '#000',
                  fontWeight: 700, fontSize: 11, cursor: 'pointer',
                  opacity: loading === plan.id ? 0.6 : 1,
                }}
              >
                {loading === plan.id ? 'Redirigiendo…' : plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          <span>✓ Cancela cuando quieras</span>
          <span>✓ Pago seguro vía Stripe</span>
          <span>✓ Soporte en español</span>
          <span>✓ Motor IEEE sin dependencias externas</span>
        </div>
      </div>
    </div>
  );
}
