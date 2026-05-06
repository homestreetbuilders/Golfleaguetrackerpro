// firebase-config.mjs — Returns the Firebase web config from environment variables.
// This lets the frontend initialise Firebase without hardcoding credentials in source.
// The values here are the Firebase *web* API key (public by design) — security is
// enforced by Firebase Security Rules and Firebase Auth, not by keeping the key secret.

export default async () => {
  const required = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
  ]

  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    console.error('[firebase-config] Missing env vars:', missing.join(', '))
    return new Response(
      JSON.stringify({ error: 'Server misconfigured — missing env vars: ' + missing.join(', ') }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  }

  const apiKey = process.env.FIREBASE_API_KEY
  console.log('[firebase-config] FIREBASE_API_KEY length:', apiKey.length)
  console.log('[firebase-config] FIREBASE_API_KEY first8:', apiKey.slice(0, 8))
  console.log('[firebase-config] FIREBASE_API_KEY last4:', apiKey.slice(-4))

  return Response.json({
    apiKey:            process.env.FIREBASE_API_KEY,
    authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.FIREBASE_PROJECT_ID,
    storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.FIREBASE_APP_ID,
  })
}

export const config = { path: '/api/firebase-config' }
