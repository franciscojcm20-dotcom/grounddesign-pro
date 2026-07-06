import type { FastifyInstance, FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';
import { sql } from '../db/client.ts';
import type { User } from '../db/client.ts';
import { parseBody } from '../lib/validate.ts';

const checkoutBodySchema = z.object({ plan: z.enum(['individual', 'professional']) });

const STRIPE_SECRET  = process.env.STRIPE_SECRET_KEY  ?? '';
const STRIPE_WEBHOOK = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const WEB_URL        = process.env.WEB_URL ?? 'http://localhost:3000';

// Price IDs — set in environment, these are placeholders
const PRICE_IDS: Record<string, string> = {
  individual:   process.env.STRIPE_PRICE_INDIVIDUAL   ?? 'price_individual_placeholder',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL ?? 'price_professional_placeholder',
};

const PLAN_MAP: Record<string, string> = {
  [PRICE_IDS['individual']!]:   'individual',
  [PRICE_IDS['professional']!]: 'professional',
};

function stripe() {
  if (!STRIPE_SECRET) throw new Error('STRIPE_SECRET_KEY no configurado');
  return new Stripe(STRIPE_SECRET, { apiVersion: '2026-06-24.dahlia' });
}

export async function billingRoutes(app: FastifyInstance) {

  // ── POST /api/v1/billing/checkout ──────────────────────────────────────────
  // Creates a Stripe Checkout session and returns the URL
  app.post('/checkout', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = parseBody(checkoutBodySchema, req, reply);
    if (!body) return;
    const { plan } = body;
    const priceId  = PRICE_IDS[plan];

    if (!priceId || priceId.includes('placeholder')) {
      return reply.code(503).send({ error: 'Stripe no configurado — añade STRIPE_SECRET_KEY y STRIPE_PRICE_* en .env' });
    }

    const { sub, email } = req.user as { sub: string; email: string };

    const session = await stripe().checkout.sessions.create({
      mode:               'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { user_id: sub, plan },
      success_url: `${WEB_URL}/dashboard?upgrade=success`,
      cancel_url:  `${WEB_URL}/pricing?upgrade=cancelled`,
    });

    return { url: session.url };
  });

  // ── POST /api/v1/billing/portal ────────────────────────────────────────────
  // Returns a Stripe Customer Portal URL for managing subscriptions
  app.post('/portal', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!STRIPE_SECRET) {
      return reply.code(503).send({ error: 'Stripe no configurado' });
    }
    const { sub } = req.user as { sub: string };
    const [user]  = await sql<{ stripe_customer_id: string | null }[]>`
      SELECT stripe_customer_id FROM users WHERE id = ${sub}
    `;
    if (!user?.stripe_customer_id) {
      return reply.code(400).send({ error: 'No tienes una suscripción activa de Stripe' });
    }
    const session = await stripe().billingPortal.sessions.create({
      customer:   user.stripe_customer_id,
      return_url: `${WEB_URL}/settings`,
    });
    return { url: session.url };
  });

  // ── POST /api/v1/billing/webhook ───────────────────────────────────────────
  // Stripe webhook — updates user plan on subscription events
  app.post('/webhook', async (req: FastifyRequest & { rawBody?: Buffer }, reply) => {
    if (!STRIPE_WEBHOOK) {
      return reply.code(503).send({ error: 'STRIPE_WEBHOOK_SECRET no configurado' });
    }
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) return reply.code(400).send({ error: 'Missing stripe-signature' });

    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(req.rawBody ?? Buffer.from(''), sig, STRIPE_WEBHOOK);
    } catch (err) {
      app.log.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    app.log.info({ type: event.type }, 'Stripe webhook received');

    if (event.type === 'checkout.session.completed') {
      const session  = event.data.object as Stripe.Checkout.Session;
      const userId   = session.metadata?.user_id;
      const plan     = session.metadata?.plan;
      const custId   = session.customer as string | null;

      if (userId && plan) {
        await sql`UPDATE users SET plan = ${plan} WHERE id = ${userId}`;
        if (custId) {
          await sql`UPDATE users SET stripe_customer_id = ${custId} WHERE id = ${userId}`;
        }
        app.log.info({ userId, plan }, 'User plan upgraded via Stripe');
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub    = event.data.object as Stripe.Subscription;
      const custId = sub.customer as string;
      // Downgrade to community when subscription is cancelled
      await sql`UPDATE users SET plan = 'community' WHERE stripe_customer_id = ${custId}`;
      app.log.info({ custId }, 'Subscription cancelled — downgraded to community');
    }

    return { received: true };
  });

  // ── GET /api/v1/billing/plans ──────────────────────────────────────────────
  // Returns plan metadata (public, no auth)
  app.get('/plans', async () => ({
    plans: [
      {
        id:       'community',
        name:     'Community',
        price:    0,
        currency: 'CLP',
        interval: null,
        features: ['3 proyectos', 'Todos los módulos IEEE', 'PDF con marca de agua'],
        cta:      'Empezar gratis',
        priceId:  null,
      },
      {
        id:       'individual',
        name:     'Individual',
        price:    29900,
        currency: 'CLP',
        interval: 'mes',
        features: ['Proyectos ilimitados', 'PDF sin marca de agua', 'Firma PE', 'Soporte por email'],
        cta:      'Suscribirse',
        priceId:  PRICE_IDS['individual'],
        available: !!STRIPE_SECRET && !PRICE_IDS['individual']!.includes('placeholder'),
      },
      {
        id:       'professional',
        name:     'Professional',
        price:    79900,
        currency: 'CLP',
        interval: 'mes',
        features: ['5 usuarios', 'API access', 'Normas IEC/RETIE', 'Soporte prioritario', 'Onboarding técnico'],
        cta:      'Contactar ventas',
        priceId:  PRICE_IDS['professional'],
        available: !!STRIPE_SECRET && !PRICE_IDS['professional']!.includes('placeholder'),
      },
    ],
  }));
}
