export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const raw = process.env.FEATURE_SHOT_TRACKING
  const enabled = ['1', 'true', 'yes', 'on'].includes(String(raw || '').trim().toLowerCase())

  return Response.json({
    shotTracking: enabled
  })
}

export const config = {
  path: '/api/features'
}
