# Front Door

A UK property portal that verifies buyers and renters, scores their intent, and shares verified lead data with UK estate agents.

## What it does

1. **Buyer/renter side** — A person looking to buy or rent completes a verification flow (identity + financials) and answers intent questions. Front Door produces a score and a shareable verified profile.
2. **Agent side** — Estate agents are onboarded manually and invoiced separately. Once active, they get a dashboard of verified leads in their area with intent scores and can unlock full contact details for leads they want to pursue.

## MVP scope

- Estate agent signup (manual onboarding, no billing integration)
- Buyer/renter verification flow (ID check, financial proof, intent questionnaire)
- Intent score calculation with decay
- Knock and viewing confirmation flow
- Agent dashboard: browse verified leads, filter by area/score, unlock contact details
- Email/push notifications (new leads in area, knock alerts, viewing outcome requests)

## Stack

### Chosen stack (solo-founder, easy to host, proven)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Full-stack in one repo, file-based routing, API routes, easy Vercel deploy |
| Language | **TypeScript** | Catches bugs early, good DX |
| Database | **Supabase (Postgres)** | Managed Postgres, built-in auth, row-level security, free tier, UK region available |
| Auth | **Supabase Auth** | Email/password + magic link, JWT, integrates with RLS, no extra service |
| UI | **Tailwind CSS + shadcn/ui** | Fast to build, accessible components, no custom design system needed |
| ID Verification | **Onfido or Yoti** | UK-focused KYC, supports right-to-work and identity checks |
| Email | **Resend** | Simple API, good deliverability, free tier covers MVP |
| File storage | **Supabase Storage** | For proof-of-income docs, ID documents |
| Hosting | **Vercel** | Zero-config Next.js deploy, preview deployments, free tier |

### Why this over alternatives

- **Not a separate backend**: Next.js API routes / Server Actions handle all server logic — no Express, no separate Node service to deploy and maintain.
- **Not Firebase**: Supabase gives real Postgres with proper relations and SQL; easier to query and migrate as the model evolves.
- **Not a custom auth system**: Supabase Auth handles sessions, JWTs, and password resets for free.

## Project structure

```
front-door/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, signup, magic link pages
│   ├── (agent)/            # Agent-facing routes (dashboard, leads, billing)
│   ├── (buyer)/            # Buyer/renter verification flow
│   ├── api/                # API route handlers (webhooks, etc.)
│   └── layout.tsx
├── components/             # Shared UI components
├── lib/
│   ├── supabase/           # Supabase client (server + browser)
│   ├── scoring/            # Intent score logic
│   └── email/              # Resend templates
├── supabase/
│   ├── migrations/         # SQL migrations (run via Supabase CLI)
│   └── seed.sql
└── types/                  # Shared TypeScript types
```

## Core data model (simplified)

```sql
-- Two user types, both use Supabase Auth
profiles        (id, role: 'agent'|'buyer'|'renter', email, created_at)
agents          (id → profiles.id, agency_name, areas[], is_active boolean)
verifications   (id, profile_id, status, id_check_result, income_verified, docs_url[])
intent_scores   (id, profile_id, score 0–100, signals jsonb, computed_at)
activity_log    (id, profile_id, date, active boolean)  -- one row per day per user
knocks          (id, profile_id, property_address text, property_postcode text, agent_id, status, knocked_at, expires_at, confirmed_at)
viewings        (id, knock_id, outcome: 'booked'|'attended'|'no_action', outcome_at)
leads           (id, profile_id, agent_id, unlocked_at, price_range, move_date, postcode_area)
```

No separate properties table is needed for MVP — property address and postcode are stored directly on the knock.

## Intent score signals

Score is 0–100. Signals are grouped into **permanent** (never decay) and **activity-based** (subject to decay).

### Permanent signals

| Signal | Points |
|---|---|
| ID verification passed | +15 |
| Mortgage in principle OR employment contract OR proof of funds uploaded and verified | +25 |
| Viewing booked | +5 |
| Viewing booked and attended | +10 (replaces +5, not cumulative) |

### Move timeframe (permanent once set, updated if applicant changes their timeline)

| Timeframe | Points |
|---|---|
| 0–3 months | +20 |
| 3–6 months | +10 |
| 6+ months | +2 |

### Activity-based signals

| Signal | Points |
|---|---|
| 3 consecutive days active on the app | +2 |
| 7 consecutive days active on the app | +7 (replaces +2, not cumulative) |

### Score decay (activity signals only)

Decay applies only to activity-based signal points. ID, document, move timeframe, and viewing signals are permanent once earned.

| Inactivity | Decay |
|---|---|
| 3 consecutive days inactive | −2 |
| 7 consecutive days inactive | −7 (replaces −2, not cumulative) |

Score cannot decay below 0. Decay is recalculated nightly via a scheduled job.

## Knock and viewing flow

1. **Applicant logs a knock** on a property in the app (entering the address and postcode). A 2-hour countdown timer starts, visible to the applicant in their app and to the agent in their dashboard.
2. **Agent confirms within 2 hours** → viewing is logged, knock status set to `confirmed`.
3. **Timer expires with no agent response** → knock status set to `expired`, no score change, applicant is notified.
4. **5 days after a confirmed knock**, both the agent and the applicant receive a notification asking for the viewing outcome:
   - "Viewing booked"
   - "Viewing booked and attended"
   - "No further action"
5. **Score updates** based on the confirmed outcome (see permanent signals above). If neither party responds within 5 days of the outcome notification, no score change is applied.

The outcome notification is sent to both parties so either can confirm — first response wins. Conflicting responses (e.g. agent says "attended", applicant says "no action") should be flagged for manual review in an admin queue.

## Key flows

### Buyer/renter verification
1. Create account → email verify
2. Enter search intent (area, budget, timeline, buy/rent)
3. ID check via Onfido or Yoti (async webhook updates status)
4. Upload proof of funds / mortgage in principle / employment contract (Supabase Storage)
5. Score computed → shareable profile generated

### Agent signup
1. Create account → email verify
2. Business details + target postcode areas
3. Redirected to dashboard (access gated on `is_active = true`, set manually by admin)

### Agent dashboard
- Filter leads by area, score, move date, budget
- See anonymised summary of each lead (score, area, timeline)
- Pending knock alerts with 2-hour countdown timers
- "Unlock" a lead to see full contact details

## Scheduled jobs

- **Nightly score decay job**: recompute activity streaks and apply/remove decay for all active users
- **Knock expiry job**: every 5 minutes, expire knocks where `expires_at < now()` and status is still `pending`
- **Viewing outcome reminder**: 5 days after `confirmed_at`, send outcome request notifications to agent and applicant

Use Vercel Cron Jobs (free tier) or Supabase pg_cron for the nightly/5-day jobs.

## Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

## Development setup

```bash
npm install
npx supabase start          # local Supabase (Docker required)
npx supabase db push        # apply migrations
npm run dev                 # Next.js on :3000
```

## Compliance notes (UK-specific)

- Store personal data in Supabase EU/UK region (London: `eu-west-2` available)
- ICO registration required before storing personal data commercially
- GDPR: users must be able to delete their account and all associated data
- Financial promotions: avoid anything that reads as regulated financial advice
- Right to erasure: implement a delete-account flow that purges all PII from Supabase

## What to build first (suggested order)

1. Supabase project + auth + basic profile schema
2. Agent signup (manual onboarding, `is_active` flag)
3. Buyer verification flow (intent questionnaire first, ID check second)
4. Score computation + nightly decay job
5. Knock flow + expiry job
6. Agent dashboard with lead browsing, knock alerts, and unlock
7. Viewing outcome notifications + score update
8. Email notifications

## Out of scope for MVP

- Mobile app (responsive web only)
- AVM (automated valuation model)
- Direct integration with Rightmove/Zoopla listings
- Agent CRM features
- Referral / affiliate scheme
