// backup-blobs.mjs — Read all Netlify Blobs data and write to league-data-backup.json
// READ ONLY — no writes or deletes.

import { getStore, listStores } from '@netlify/blobs'
import { writeFileSync } from 'fs'

const SITE_ID = 'fbd27904-cba5-4f48-9e5e-34803c41bbf2'
const TOKEN   = process.env.NETLIFY_AUTH_TOKEN || 'nfc_sEBsz9Uw7qEp2fYaK6Wpb985vBMBYtcS4adf'
const LEAGUE_ID = 'kelleys-heroes'

// All known store base names (league-scoped + global)
const LEAGUE_STORES = [
  'players',
  'scores',
  'schedule',
  'teams',
  'pairings',
  'courses',
  'match-scorecards',
  'scorecard-locks',
  'side-game-optins',
  'side-games-ledger',
  'league-settings',
  'handicap-config',
  'handicap-overrides',
  'handicap-history',
  'payments',
  'payment-settings',
  'announcements',
  'chat',
  'ai-pairing',
  'brackets',
]

const GLOBAL_STORES = [
  'leagues',
  'user-roles',
]

async function dumpStore(storeName, opts = {}) {
  const store = getStore({ name: storeName, siteID: SITE_ID, token: TOKEN })
  const result = {}
  try {
    const { blobs } = await store.list(opts.prefix ? { prefix: opts.prefix } : {})
    for (const blob of blobs) {
      try {
        result[blob.key] = await store.get(blob.key, { type: 'json' })
      } catch (e) {
        // Fall back to raw text if not valid JSON
        try {
          result[blob.key] = await store.get(blob.key)
        } catch (e2) {
          result[blob.key] = `[error reading: ${e2.message}]`
        }
      }
    }
    console.log(`  ✓ ${storeName}: ${blobs.length} key(s)`)
  } catch (e) {
    console.log(`  ✗ ${storeName}: ${e.message}`)
  }
  return result
}

async function main() {
  console.log(`Backing up Netlify Blobs for site ${SITE_ID}, league: ${LEAGUE_ID}`)
  console.log()

  const backup = {
    exportedAt: new Date().toISOString(),
    siteId: SITE_ID,
    leagueId: LEAGUE_ID,
    global: {},
    league: {},
  }

  // Global stores
  console.log('Global stores:')
  for (const name of GLOBAL_STORES) {
    backup.global[name] = await dumpStore(name)
  }

  // League-scoped stores
  console.log('\nLeague stores:')
  for (const base of LEAGUE_STORES) {
    const storeName = `${base}-${LEAGUE_ID}`
    backup.league[base] = await dumpStore(storeName)
  }

  // Try to discover any additional stores via listStores
  try {
    console.log('\nDiscovering additional stores...')
    const { stores } = await listStores({ siteID: SITE_ID, token: TOKEN })
    const known = new Set([
      ...GLOBAL_STORES,
      ...LEAGUE_STORES.map(b => `${b}-${LEAGUE_ID}`)
    ])
    for (const s of stores) {
      if (!known.has(s.name)) {
        console.log(`  Found extra store: ${s.name}`)
        backup.extra = backup.extra || {}
        backup.extra[s.name] = await dumpStore(s.name)
      }
    }
  } catch (e) {
    console.log(`  (listStores not available or failed: ${e.message})`)
  }

  const outPath = new URL('../league-data-backup.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
  writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf8')
  console.log(`\nBackup written to: ${outPath}`)

  // Summary
  const globalKeys = Object.values(backup.global).reduce((n, s) => n + Object.keys(s).length, 0)
  const leagueKeys = Object.values(backup.league).reduce((n, s) => n + Object.keys(s).length, 0)
  console.log(`Total keys: ${globalKeys} global, ${leagueKeys} league-scoped`)
}

main().catch(e => { console.error(e); process.exit(1) })
