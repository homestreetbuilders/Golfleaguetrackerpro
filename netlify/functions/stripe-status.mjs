export default async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const configured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY)
  return Response.json({ configured })
}

export const config = {
  path: '/api/stripe-status'
}
