import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos de servicio',
  description: 'Términos y condiciones de uso de GroundDesing Pro.',
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Legal
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Términos de Servicio</h1>
      <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 40, fontFamily: 'var(--font-mono)' }}>
        Última actualización: 30 de junio de 2026
      </p>

      {[
        {
          title: '1. Aceptación de los términos',
          body: 'Al acceder y utilizar GroundDesing Pro ("la Plataforma"), usted acepta quedar vinculado por estos Términos de Servicio. Si no está de acuerdo con alguno de estos términos, no utilice la Plataforma.',
        },
        {
          title: '2. Descripción del servicio',
          body: 'GroundDesing Pro es una plataforma SaaS para el diseño profesional de sistemas de puesta a tierra conforme a normas IEEE 80, IEEE 81 y otras normativas internacionales. La Plataforma proporciona herramientas de cálculo, generación de reportes PDF y gestión de proyectos de ingeniería.',
        },
        {
          title: '3. Uso responsable',
          body: 'Los resultados generados por la Plataforma son herramientas de apoyo al ingeniería profesional. El usuario es responsable de verificar los resultados con un ingeniero habilitado antes de su implementación en obras reales. GroundDesing Pro no asume responsabilidad por daños derivados del uso de los resultados sin verificación profesional.',
        },
        {
          title: '4. Planes y facturación',
          body: 'La Plataforma ofrece planes Community (gratuito), Individual y Professional. Los planes de pago se facturan mensualmente. Las cancelaciones aplican al término del período facturado. No se emiten reembolsos por períodos parciales.',
        },
        {
          title: '5. Propiedad intelectual',
          body: 'Todos los motores de cálculo, algoritmos, interfaces y contenidos de GroundDesing Pro son propiedad exclusiva de sus desarrolladores. Los reportes PDF generados son propiedad del usuario que los creó.',
        },
        {
          title: '6. Limitación de responsabilidad',
          body: 'La Plataforma se proporciona "tal como está". En ningún caso los desarrolladores serán responsables por daños indirectos, incidentales o consecuentes derivados del uso o incapacidad de uso de la Plataforma.',
        },
        {
          title: '7. Modificaciones',
          body: 'Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios materiales serán notificados con al menos 30 días de antelación por correo electrónico.',
        },
        {
          title: '8. Ley aplicable',
          body: 'Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa será resuelta ante los tribunales competentes de la ciudad de Santiago.',
        },
      ].map(s => (
        <section key={s.title} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{s.title}</h2>
          <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.8 }}>{s.body}</p>
        </section>
      ))}

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--line)', fontSize: 10, color: 'var(--faint)' }}>
        Consultas legales: <a href="mailto:legal@grounddesing.pro" style={{ color: 'var(--copper)', textDecoration: 'none' }}>legal@grounddesing.pro</a>
      </div>
    </div>
  );
}
