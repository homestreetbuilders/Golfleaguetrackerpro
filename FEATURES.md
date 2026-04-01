# Fairway Command — The Ultimate League System
### Master Feature Specification | Home Street Builders | Ronald McCoy | April 2026

---

## TECHNICAL & DEPLOYMENT
- Repo: github.com/homestreetbuilders/golfleaguetrackerpro
- Deployed via Netlify — auto-deploys from main branch
- Authentication: Netlify Identity
- Netlify Functions: identity-signup.mts, set-role.mts
- Branding: Fairway Command — The Ultimate League System
- Colors: Gold #D4AF37 and Dark Green #1A4A2E
- Deployment workflow: commit to main → Netlify auto-deploys (no manual step)
- Do NOT use Netlify AI agent to commit directly — use Windsurf or manual push only

---

## AUTHENTICATION & ROLES
- Netlify Identity — login/signup screen on app load
- First user to sign up is auto-assigned Admin role (identity-signup serverless function)
- Subsequent signups default to Player role
- Three roles: Player, Score Admin (Scorer), Admin
- Admin can change any user's role from the User Roles section

---

## ROLE ACCESS MATRIX

| Feature / Section          | Player            | Score Admin        | Admin               |
|----------------------------|-------------------|--------------------|---------------------|
| Dashboard                  | View              | View               | Full                |
| Leaderboard (+ Live)       | View              | View               | Full + Set Mode     |
| Schedule                   | View              | View               | Manage              |
| Season Overview / Rules    | View              | View               | Edit                |
| Analytics — Own            | View + Print      | View + Print       | All                 |
| Analytics — All Players    | —                 | ✓                  | ✓                   |
| Payments                   | Own only          | —                  | Full                |
| Courses                    | View              | View               | Manage              |
| Settings / Handicap        | View              | View               | Full                |
| Instructions               | Player guide      | Score Admin guide  | Admin guide         |
| League Chat                | Read/Send         | Read/Send          | + Announce          |
| Enter Scores               | —                 | ✓                  | ✓                   |
| Print Scorecards           | —                 | ✓                  | ✓                   |
| Sub Scheduling             | —                 | —                  | ✓                   |
| Manage Players             | —                 | —                  | ✓                   |
| User Role Assignment       | —                 | —                  | ✓                   |
| Rainout / Reschedule       | View only         | —                  | ✓                   |

---

## DASHBOARD
- Personalized welcome with player name and role
- Upcoming tee time / next round at a glance
- Current standings snapshot (top 5)
- Recent scores summary
- Quick links to scorecard entry (Scorer/Admin)
- League announcements / news feed
- Weather widget for course location

---

## LEADERBOARD
- Season standings sorted by net score / points
- Toggle: Gross vs Net view
- Live leaderboard mode (Admin sets: Live or Batch)
- In Live mode: scores update in real time as entered
- In Batch mode: scores post after round is finalized
- Filter by week / date range
- Handicap index column visible
- Print / export leaderboard (PDF)

---

## SCORECARD ENTRY (Score Admin + Admin)
- 9-hole scorecard (primary league format)
- 18-hole scorecard (scramble / tournament events)
- Handicap stroke dots displayed on each hole based on player handicap
- Gross score entry per hole
- Net score auto-calculated
- Scorecard printable before and after entry
- Batch entry: enter all scores after round
- Live entry: scores visible on leaderboard as entered
- Scorecard locked after submission (Admin can unlock)

---

## HANDICAP SYSTEM
- Custom handicap formula configurable by Admin
- Default: (Gross Score − Course Par) averaged over last N rounds × difficulty factor
- Handicap index displayed on leaderboard and scorecards
- Handicap recalculates automatically after each round posted
- Admin can manually override a player's handicap
- Handicap history log per player

---

## SCHEDULE
- Season schedule builder — Admin sets dates, courses, tee times
- Weekly rounds auto-paired or manually assigned
- Pairing display: who plays with whom each week
- Sub scheduling: Admin marks a player as "sub needed," assigns substitute
- Rainout management: Admin marks rainout, reschedules, notifies players
- Scramble events and Tournament events clearly marked separately
- Players view upcoming schedule and past results

---

## SEASON OVERVIEW / RULES
- League rules and format displayed (Admin edits)
- Season dates, number of rounds, scoring format
- Handicap formula explanation
- Prize structure / payout info
- Tiebreaker rules

---

## PLAYER PROFILES & MANAGEMENT
- Player name, email, phone, handicap index
- Role assigned (Player / Score Admin / Admin)
- Round history and score log
- Attendance tracking (rounds played vs scheduled)
- Admin can add, edit, deactivate players
- Player can view and edit own profile

---

## ANALYTICS
- Player view: own stats — avg gross, avg net, best round, handicap trend
- Score Admin view: all player stats
- Admin view: full league analytics — participation, scoring trends, leaderboard history
- Charts: handicap over time, score distribution
- Export to PDF (player and admin)

---

## COURSES
- Course database: name, par per hole (9 or 18), slope, rating, address
- Admin can add / edit / delete courses
- Course assigned per scheduled round
- Scorecard template auto-populated from course par data

---

## PAYMENTS
- Player dues tracking: paid / unpaid status
- Admin records payments manually or marks as paid
- Player views own payment status
- Prize pool tracker — Admin sets prize amounts, records payouts
- Payment history log

---

## LEAGUE CHAT / MESSAGING
- In-app league chat visible to all members
- Players and Scorers can read and send messages
- Admin can post announcements (pinned at top)
- Push notifications for new announcements (optional)

---

## INSTRUCTIONS (Role-Based)
- Each role sees a tailored help/instructions section
- Player: how to view scores, leaderboard, schedule, profile
- Score Admin: how to enter scores, print scorecards, use live mode
- Admin: full system guide — setup, management, all features

---

## SCRAMBLE EVENTS
- Admin creates Scramble Event from Schedule section
- Clearly marked differently from weekly rounds on schedule
- Team assignments: 2–4 players per team
- 18-hole scorecard entry
- Gross and net team scoring calculated automatically
- Scoring Type selector: Best Ball, Stableford, or Stroke Play
- Scramble-specific results leaderboard for that event
- Players can view results and their team scorecard
- Score Admin can enter scores and print scramble scorecards

---

## TOURNAMENT EVENTS
- Admin creates tournament events from Schedule section
- Clearly marked differently from weekly rounds and scramble events
- Scoring Type selector: Best Ball, Stableford, or Stroke Play
- Tournament-specific leaderboard
- Live or Batch scoring mode set by Admin

---

## CORE FEATURES SUMMARY
1. League creation and multi-league management
2. Player registration and profile tracking
3. Schedule builder with automatic pairing
4. Real-time scoring and leaderboard updates
5. Handicap tracking and adjustments

## ADVANCED FUNCTIONALITY
1. AI-powered match pairing and fairness balancing
2. Live mobile scoring synced across all players
3. Weather integration and automatic rescheduling
4. Custom rule configurations per league
5. Dynamic playoff and tournament brackets

## FINANCIAL TOOLS
1. Online payment processing for dues and events
2. Prize pool tracking and automatic payouts
3. Sponsor integration and advertising slots
4. Expense tracking and reporting

## MOBILE & CLOUD INTEGRATION
1. Cross-platform mobile app (iOS & Android)
2. Cloud-based data syncing in real time
3. Push notifications for tee times and updates
4. In-app messaging and announcements

## PLAYER EXPERIENCE
1. Personal stats dashboard
2. Historical performance tracking
3. Shot tracking (optional premium feature)
4. Social features (chat, comments, highlights)

## ADMIN DASHBOARD
1. Full league analytics and insights
2. Custom report generation (PDF/Excel)
3. Bulk player management tools
4. Automated reminders and communications

## MONETIZATION OPTIONS
1. Subscription-based leagues
2. Premium feature unlocks
3. Advertising partnerships
4. Tournament hosting fees
