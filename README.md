# KES Ops

Internal management app for KES Cafe — orders, running costs, and profit.
Separate from the public marketing site but lives in the same repo (`frontend/ops`).
Login only, no registration. Vietnamese UI, mobile-first.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn (base-nova)
- Neon Postgres · Drizzle ORM
- Auth: iron-session (encrypted cookie) + bcryptjs. Route guard in `src/proxy.ts`.

## Profit model (important)

Profit is **COGS-based**. Each product has a **cost price (giá vốn)**; the app
computes `Doanh thu − Giá vốn = Lợi nhuận gộp − Chi phí vận hành = Lợi nhuận ròng`.

The **expense log is overhead only** (rent, salary, utilities, marketing).
**Do not** log ingredient purchases as expenses — ingredient cost is already
counted per drink via giá vốn, so logging it again would double-count.

## Local development

```bash
cd frontend/ops
npm install
cp .env.example .env.local     # then fill in DATABASE_URL + SESSION_SECRET
npm run db:migrate             # create tables in Neon
npm run db:seed                # seed the 23 SKUs + the shared login
npm run dev                    # http://localhost:3000
```

Env (`.env.local`, gitignored):

- `DATABASE_URL` — Neon **pooled** connection string.
- `SESSION_SECRET` — ≥32 chars. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Login: `kescafe2026` / `Kes2026@` (single shared account, seeded).

## Scripts

- `npm run dev` / `build` / `start`
- `npm run typecheck` · `npm run lint`
- `npm run db:generate` — new migration from schema changes
- `npm run db:migrate` — apply migrations · `db:push` — push schema directly
- `npm run db:seed` — idempotent (users upserted; products only seeded when empty)

## Deploy — served at kescafe.vercel.app/ops (Multi-Zone)

This app is a **Next.js Multi-Zone**: its own Vercel deployment (with
`basePath: "/ops"`), surfaced under `/ops` of the marketing site via a rewrite.
The two stay isolated — an ops build failure can't take the public site down.

**Step 1 — deploy the ops app (its own Vercel project)**

1. Vercel → **Add New Project** → import the **same repo** (`KES-Frontend`).
2. **Root Directory** → `ops`. Framework auto-detects as Next.js.
3. **Environment Variables** → `DATABASE_URL` (same Neon string) +
   `SESSION_SECRET`. Deploy.
4. Note the deployment URL, e.g. `https://kescafe-ops.vercel.app`. Visiting its
   root 404s by design — the app lives under `/ops` (basePath).

**Step 2 — route /ops from the marketing site**

5. In the **marketing** Vercel project → Settings → Environment Variables → add
   `OPS_ORIGIN = https://kescafe-ops.vercel.app` (the Step-1 URL, no trailing
   slash). Redeploy the marketing project.
6. Done: `https://kescafe.vercel.app/ops` now serves this app.

**Notes**

- The DB is already migrated + seeded (same Neon) — no post-deploy DB step.
- `next.config.ts` here lists the marketing origin in
  `serverActions.allowedOrigins` (server actions arrive via the proxy). If the
  marketing site moves to a custom domain, add that domain there too.
- The marketing project never builds `ops/` (`.vercelignore` + tsconfig/eslint/
  vitest excludes), so the two builds are independent.

## First run

1. Log in.
2. **Sản phẩm** → set the **giá vốn** for each drink (profit needs it).
3. **Đơn hàng → Đơn mới** to take orders; **Chi phí** for overhead.
4. **Tổng quan** shows revenue, COGS, gross, overhead and net by day/week/month.
