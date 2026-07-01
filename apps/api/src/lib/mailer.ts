import nodemailer from 'nodemailer';

/* ── Transporter ──────────────────────────────────────────────────────────── */
function createTransport() {
  // Production: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
  // Development: uses Ethereal (auto-captured, no real delivery)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Dev: log-only transport — prints to console, no SMTP needed
  return nodemailer.createTransport({ jsonTransport: true });
}

const transport = createTransport();
const FROM = process.env.FROM_EMAIL ?? 'GroundDesing Pro <noreply@grounddesing.pro>';
const WEB  = process.env.WEB_URL    ?? 'http://localhost:3000';

/* ── Templates ────────────────────────────────────────────────────────────── */
function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Courier New',monospace;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#141820;border:1px solid #1e2533;border-radius:6px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(180deg,#141820,#0f1117);padding:24px 32px;border-bottom:1px solid #1e2533;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;">
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 2L11 12" stroke="#E07A23" stroke-width="1.8"/>
                    <path d="M5 12L17 12" stroke="#E07A23" stroke-width="2.2"/>
                    <path d="M7 15.5L15 15.5" stroke="#E07A23" stroke-width="1.4" opacity=".7"/>
                    <path d="M9 19L13 19" stroke="#E07A23" stroke-width="1" opacity=".45"/>
                    <circle cx="11" cy="2" r="1.5" fill="#E07A23"/>
                  </svg>
                </td>
                <td style="font-size:14px;font-weight:700;color:#e2e8f0;letter-spacing:.04em;">
                  GroundDesing<span style="color:#E07A23;">Pro</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #1e2533;">
            <p style="margin:0;font-size:10px;color:#4a5568;line-height:1.6;">
              Motor IEEE propio · Sin dependencias externas de cálculo<br>
              IEEE Std 80-2013 · IEEE Std 81-2012 · GroundDesing Pro
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Mailer API ───────────────────────────────────────────────────────────── */
export async function sendPasswordReset(opts: { to: string; name: string; token: string }) {
  const url  = `${WEB}/reset-password?token=${opts.token}`;
  const html = baseHtml('Restablece tu contraseña — GroundDesing Pro', `
    <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#e2e8f0;">Restablece tu contraseña</h1>
    <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;line-height:1.7;">
      Hola ${opts.name.split(' ')[0]},
    </p>
    <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;line-height:1.7;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no la solicitaste, puedes ignorar este mensaje con seguridad.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#E07A23;border-radius:4px;">
          <a href="${url}" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:.04em;">
            Restablecer contraseña →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:10px;color:#4a5568;line-height:1.6;">
      O copia y pega este enlace en tu navegador:
    </p>
    <p style="margin:0 0 20px;font-size:10px;color:#E07A23;word-break:break-all;line-height:1.6;">
      ${url}
    </p>
    <p style="margin:0;font-size:10px;color:#4a5568;line-height:1.6;">
      El enlace expira en <strong style="color:#94a3b8;">1 hora</strong>. Después de eso deberás solicitar uno nuevo.
    </p>
  `);

  const info = await transport.sendMail({
    from: FROM,
    to:   opts.to,
    subject: 'Restablece tu contraseña — GroundDesing Pro',
    html,
    text: `Restablece tu contraseña de GroundDesing Pro: ${url}\n\nEl enlace expira en 1 hora.`,
  });

  // In dev (jsonTransport), log the email to console
  if (!process.env.SMTP_HOST) {
    console.info('[mailer] password-reset email (dev — not sent):', {
      to: opts.to, resetUrl: url,
      // @ts-expect-error jsonTransport puts envelope here
      message: info.message ? JSON.parse(info.message as string) : undefined,
    });
  }

  return info;
}

export async function sendWelcome(opts: { to: string; name: string }) {
  const html = baseHtml('Bienvenido a GroundDesing Pro', `
    <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#e2e8f0;">¡Bienvenido, ${opts.name.split(' ')[0]}!</h1>
    <p style="margin:0 0 16px;font-size:12px;color:#94a3b8;line-height:1.7;">
      Tu cuenta en <strong style="color:#e2e8f0;">GroundDesing Pro</strong> está lista. Tienes acceso al plan <strong style="color:#93c5fd;">Community</strong> con todos los módulos de cálculo IEEE disponibles.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      ${[
        ['⚡', 'Resistividad Wenner', 'IEEE 81-2012'],
        ['🌍', 'Modelo N capas', 'Wait (1954)'],
        ['⬡', 'Resistencia de malla', 'IEEE 80-2013 §14'],
        ['⏚', 'GPR — Potencial de tierra', 'IEEE 80-2013 §15'],
      ].map(([icon, label, norm]) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1e2533;font-size:11px;color:#94a3b8;">
            ${icon} ${label}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #1e2533;font-size:10px;color:#4a5568;text-align:right;font-family:'Courier New',monospace;">
            ${norm}
          </td>
        </tr>
      `).join('')}
    </table>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="background:#E07A23;border-radius:4px;">
          <a href="${WEB}/dashboard" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:.04em;">
            Ir al panel →
          </a>
        </td>
      </tr>
    </table>
  `);

  const info = await transport.sendMail({
    from: FROM,
    to:   opts.to,
    subject: '¡Bienvenido a GroundDesing Pro!',
    html,
    text: `Bienvenido ${opts.name} a GroundDesing Pro. Accede en: ${WEB}/dashboard`,
  });

  if (!process.env.SMTP_HOST) {
    console.info('[mailer] welcome email (dev — not sent):', { to: opts.to });
  }

  return info;
}
