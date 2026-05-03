# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fairway Command** is a golf league tracking PWA (Progressive Web App). It is a vanilla JavaScript single-page application with Netlify serverless functions as the backend.

- **Frontend:** Single HTML file (`index.html`) + `app.js`, no framework, no build step
- **Backend:** 40+ serverless functions in `netlify/functions/` (.mjs modules)
- **Storage:** Netlify Blobs (schemaless key-value JSON store, no database/ORM)
- **Auth:** Netlify Identity
- **Deployment:** Netlify (auto-deploys from GitHub main branch)

## Development Commands

```bash
# Install dependencies (only @netlify/blobs)
npm install

# Run locally with Netlify Dev (required for functions + Identity)
npx netlify dev

# Deploy to Netlify
npx netlify deploy --prod
```

No build step, no bundler, no test runner. The app deploys directly as static files.

## Architecture

### Frontend (`index.html` + `app.js`)

- **All views are in a single `index.html`** — sections are hidden/shown via CSS classes, not routing
- **`app.js`** handles view navigation, DOM manipulation, API calls, and role-based UI visibility
- No framework, no state management library — the DOM is the source of truth for UI state
- **Role-based access** (admin / scorer / player) is enforced both in the HTML (visibility) and in serverless functions (authorization)

### Serverless Functions (`netlify/functions/`)

Each `.mjs` file is a standalone API endpoint. The URL pattern is:
```
/api/{function-name}?leagueId={id}&action={action}&...
```

Key functions:
- `identity-signup.mjs` — First signup becomes admin, subsequent signups become player
- `scores.mjs` — Score submission and retrieval
- `finalize-week.mjs` — Locks scorecards and recalculates handicaps
- `handicap-formula.mjs` — Configurable handicap calculation (best N of last N rounds)
- `pairings.mjs` / `ai-pairing.mjs` — Match pairing engine
- `schedule.mjs` — Weekly schedule and rainout management
- `payments.mjs` — Dues and payment tracking
- `players.mjs` — Player roster management

### Data Storage Pattern (Netlify Blobs)

All data is multi-tenant, scoped by `leagueId`. Store names follow the pattern `{resource}-{leagueId}`, e.g., `scores-abc123`, `players-abc123`. Keys within a store follow patterns like `week-{N}`, `player-{email}`, `payment-{email}-{timestamp}`.

There are no migrations or schema files — all records are schemaless JSON.

### Authentication Flow

1. Netlify Identity handles signup/login
2. `identity-signup.mjs` fires on new user creation
3. First user in the system → assigned `admin` role
4. All subsequent users → assigned `player` role
5. Admins can promote users to `scorer` or `admin` via the Roles UI

## Branding / Style

- Colors: Gold `#D4AF37`, Dark Green `#1A4A2E`, accent green `#3DA06B`
- Fonts: Bebas Neue (headings), Barlow / Barlow Condensed (body)
- All CSS is inline in `index.html` (no external stylesheet)
