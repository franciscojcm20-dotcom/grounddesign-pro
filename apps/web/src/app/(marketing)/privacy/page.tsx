import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Política de privacidad y tratamiento de datos de GroundDesing Pro.',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ fontSize: 9, color: 'var(--copper)', fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Legal
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Política de Privacidad</h1>
      <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 40, fontFamily: 'var(--font-mono)' }}>
        Última actualización: 30 de junio de 2026
      </p>

      {[
        {
          title: '1. Datos que recopilamos',
          body: 'Recopilamos: (a) datos de cuenta: nombre, correo electrónico y contraseña cifrada; (b) datos de uso: proyectos creados, cálculos realizados y parámetros ingresados; (c) datos técnicos: dirección IP, tipo de navegador y sistema operativo para seguridad y diagnóstico.',
        },
        {
          title: '2. Uso de los datos',
          body: 'Sus datos se usan exclusivamente para: proveer el servicio de la Plataforma, mejorar los motores de cálculo, enviar comunicaciones relacionadas con su cuenta, y cumplir obligaciones legales. No vendemos ni compartimos sus datos personales con terceros con fines comerciales.',
        },
        {
          title: '3. Almacenamiento y seguridad',
          body: 'Los datos se almacenan en servidores con cifrado en reposo y en tránsito (TLS 1.3). Las contraseñas se almacenan únicamente como hash bcrypt (factor de costo 12). Realizamos backups diarios con retención de 30 días.',
        },
        {
          title: '4. Cookies',
          body: 'Usamos únicamente una cookie de sesión HttpOnly (token JWT) necesaria para la autenticación. No usamos cookies de rastreo, publicidad ni analítica de terceros.',
        },
        {
          title: '5. Sus derechos',
          body: 'Usted tiene derecho a: acceder a sus datos personales, rectificarlos, solicitar su eliminación, y oponerse a su tratamiento. Para ejercer estos derechos, contacte a privacidad@grounddesing.pro. Responderemos en un plazo máximo de 15 días hábiles.',
        },
        {
          title: '6. Eliminación de cuenta',
          body: 'Puede solicitar la eliminación permanente de su cuenta y todos sus datos enviando un correo a privacidad@grounddesing.pro. La eliminación se completará en 30 días, salvo obligaciones legales de retención.',
        },
        {
          title: '7. Cambios a esta política',
          body: 'Notificaremos cualquier cambio material a esta política por correo electrónico con al menos 15 días de antelación.',
        },
        {
          title: '8. Contacto',
          body: 'Para consultas sobre privacidad y protección de datos, contáctenos en privacidad@grounddesing.pro o a través del formulario de soporte en la Plataforma.',
        },
      ].map(s => (
        <section key={s.title} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{s.title}</h2>
          <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.8 }}>{s.body}</p>
        </section>
      ))}

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--line)', fontSize: 10, color: 'var(--faint)' }}>
        Contacto privacidad: <a href="mailto:privacidad@grounddesing.pro" style={{ color: 'var(--copper)', textDecoration: 'none' }}>privacidad@grounddesing.pro</a>
      </div>
    </div>
  );
}
