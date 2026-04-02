function clean(v, maxLen) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Scaffold only: do not attempt to create real Stripe sessions unless keys are configured.
  if (!process.env.STRIPE_SECRET_KEY) {
    return new Response('Stripe not configured', { status: 501 })
  }

  // Intentionally minimal: we do not import stripe SDK here to keep this as safe scaffolding.
  // Once configured, replace this with Stripe Checkout Session creation.
  const body = await req.json().catch(() => null)
  const email = clean(body && body.email, 200)
  const amount = body && body.amount !== undefined ? Number(body.amount) : NaN
  const note = clean(body && body.note, 500)

  if (!email || !Number.isFinite(amount) || amount <= 0) {
    return new Response('Missing email or amount', { status: 400 })
  }

  return Response.json({
    success: false,
    scaffold: true,
    message: 'Stripe is configured but checkout creation is not implemented in scaffold mode.',
    email,
    amount,
    note
  })
}

export const config = {
  path: '/api/stripe-checkout'
}
