# KES Ops

Internal management app for KES Cafe — orders, running costs, and profit.
Standalone app in its own repo, deployed as its own Vercel project (separate
from the public marketing site). Login only, no registration. Vietnamese UI,
mobile-first.

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
cd kes-ops
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

## Deploy (own repo + own Vercel project)

This is a standalone app in its own git repo, served at its own domain root.

1. Push this repo to GitHub (e.g. a new `KES-Ops` repo).
2. Vercel → **Add New Project** → import that repo. **Root Directory** = repo
   root (default); framework auto-detects as Next.js.
3. **Environment Variables** → `DATABASE_URL` (Neon pooled string) +
   `SESSION_SECRET`. Deploy.
4. The app is live at `https://<project>.vercel.app` (log in at `/login`).
   Add a custom domain later under the project's Domains if you want.

The DB is already migrated + seeded on Neon, so there's no post-deploy DB step.
Fully independent of the marketing site — separate repo, separate build.

## First run

1. Log in.
2. **Sản phẩm** → set the **giá vốn** for each drink (profit needs it).
3. **Đơn hàng → Đơn mới** to take orders; **Chi phí** for overhead.
4. **Tổng quan** shows revenue, COGS, gross, overhead and net by day/week/month.
