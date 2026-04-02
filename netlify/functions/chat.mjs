import { getStore } from '@netlify/blobs'

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase()
}

function cleanText(v, maxLen) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

async function listMessages(store, limit) {
  const { blobs } = await store.list({ prefix: 'msg-' }).catch(() => ({ blobs: [] }))
  const items = []
  for (const b of blobs || []) {
    const m = await store.get(b.key, { type: 'json' }).catch(() => null)
    if (m) items.push(m)
  }
  items.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
  const lim = Math.max(1, Math.min(500, limit || 200))
  return items.slice(Math.max(0, items.length - lim))
}

export default async (req) => {
  const store = getStore('chat')
  const url = new URL(req.url)
  const action = (url.searchParams.get('action') || '').toLowerCase()

  if (req.method === 'GET') {
    const limit = asInt(url.searchParams.get('limit')) || 200
    const messages = await listMessages(store, limit)
    const pinned = await store.get('pinned', { type: 'json' }).catch(() => null)
    return Response.json({ messages, pinned: pinned || null })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)

    if (action === 'send') {
      const user = cleanText(body && body.user, 80)
      const email = normalizeEmail(body && body.email)
      const msg = cleanText(body && body.msg, 2000)
      if (!user || !msg) return new Response('Missing user or msg', { status: 400 })

      const createdAt = new Date().toISOString()
      const key = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const record = { id: key, user, email: email || null, msg, createdAt }
      await store.setJSON(key, record)
      return Response.json({ success: true, message: record })
    }

    if (action === 'pin') {
      const text = cleanText(body && body.text, 2000)
      if (!text) return new Response('Missing text', { status: 400 })
      const pinned = {
        text,
        pinnedBy: body && body.pinnedBy ? String(body.pinnedBy) : null,
        pinnedAt: new Date().toISOString()
      }
      await store.setJSON('pinned', pinned)
      return Response.json({ success: true, pinned })
    }

    if (action === 'unpin') {
      await store.delete('pinned').catch(() => null)
      return Response.json({ success: true })
    }

    return new Response('Invalid action', { status: 400 })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/chat'
}
