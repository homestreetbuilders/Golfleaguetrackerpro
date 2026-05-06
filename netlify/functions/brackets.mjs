import { db, COL, lid, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })
  const id = normalizeId(url.searchParams.get('id'))

  if (req.method === 'GET') {
    if (id) {
      const bracket = await getDoc(COL.brackets, leagueId, `bracket-${id}`)
      if (!bracket) return new Response('Not found', { status: 404 })
      return Response.json({ bracket })
    }
    const docs = await listDocs(COL.brackets, leagueId)
    const brackets = docs
      .filter(d => d.id && String(d.id).startsWith('bracket-') || !String(d.id || '').startsWith('bracket-'))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    return Response.json({ brackets })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()

    if (action === 'delete') {
      const delId = normalizeId(body && body.id)
      if (!delId) return new Response('Missing id', { status: 400 })
      await deleteDoc(COL.brackets, leagueId, `bracket-${delId}`)
      return Response.json({ success: true })
    }

    const name = body && body.name ? String(body.name).trim() : 'Playoffs'
    const bracketId = normalizeId(body && body.id ? body.id : (body && body.name ? body.name : 'playoffs')) || `playoffs-${Date.now()}`
    const existing = await getDoc(COL.brackets, leagueId, `bracket-${bracketId}`)
    const bracket = {
      id: bracketId, name,
      type: body && body.type ? String(body.type) : 'single_elim',
      rounds: Array.isArray(body && body.rounds) ? body.rounds : [],
      notes: body && body.notes ? String(body.notes) : '',
      updatedAt: new Date().toISOString(),
      createdAt: (existing && existing.createdAt) ? existing.createdAt : ((body && body.createdAt) ? String(body.createdAt) : new Date().toISOString())
    }
    await setDoc(COL.brackets, leagueId, `bracket-${bracketId}`, bracket)
    return Response.json({ success: true, bracket })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/brackets' }
