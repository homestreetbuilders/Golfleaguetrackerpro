import { db, COL, lid, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeEmail(v) { return String(v || '').trim().toLowerCase() }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function cleanText(v, maxLen) { const s = String(v || '').trim(); return s.length > maxLen ? s.slice(0, maxLen) : s }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })
  const action = (url.searchParams.get('action') || '').toLowerCase()

  if (req.method === 'GET') {
    const limit = asInt(url.searchParams.get('limit')) || 200
    const lim = Math.max(1, Math.min(500, limit))

    const docs = await listDocs(COL.chat, leagueId)
    const messages = docs
      .filter(d => d.id && String(d.id).startsWith('msg-'))
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
    const sliced = messages.slice(Math.max(0, messages.length - lim))

    const pinned = await getDoc(COL.chat, leagueId, 'pinned')
    return Response.json({ messages: sliced, pinned: pinned || null })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)

    if (action === 'send') {
      const user = cleanText(body && body.user, 80)
      const email = normalizeEmail(body && body.email)
      const msg = cleanText(body && body.msg, 2000)
      if (!user || !msg) return new Response('Missing user or msg', { status: 400 })

      const createdAt = new Date().toISOString()
      const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const record = { id, user, email: email || null, msg, createdAt }
      await setDoc(COL.chat, leagueId, id, record)
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
      await setDoc(COL.chat, leagueId, 'pinned', pinned)
      return Response.json({ success: true, pinned })
    }

    if (action === 'unpin') {
      await deleteDoc(COL.chat, leagueId, 'pinned')
      return Response.json({ success: true })
    }

    return new Response('Invalid action', { status: 400 })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/chat' }
