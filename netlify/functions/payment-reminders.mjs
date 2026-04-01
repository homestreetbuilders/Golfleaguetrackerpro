import { getStore } from '@netlify/blobs'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export default async (req) => {
  const store = getStore('payment-reminders')

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const toEmail = normalizeEmail(body && body.toEmail)
    const sentBy = normalizeEmail(body && body.sentBy)
    const scope = body && body.scope ? String(body.scope) : 'individual'
    const message = body && body.message ? String(body.message) : null

    if (!toEmail) {
      return new Response('Missing toEmail', { status: 400 })
    }

    const key = `reminder-${toEmail}-${Date.now()}`
    const record = {
      toEmail,
      scope,
      message,
      sentBy: sentBy || null,
      sentAt: new Date().toISOString()
    }

    await store.setJSON(key, record)
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const toEmail = normalizeEmail(url.searchParams.get('toEmail'))
    const { blobs } = await store.list({ prefix: toEmail ? `reminder-${toEmail}-` : undefined }).catch(() => ({ blobs: [] }))

    const reminders = []
    for (const blob of blobs || []) {
      const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
      if (data) reminders.push(data)
    }

    reminders.sort((a, b) => String(b.sentAt || '').localeCompare(String(a.sentAt || '')))
    return Response.json({ reminders })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/payment-reminders'
}
