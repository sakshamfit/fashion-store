# Deploy VYRN

VYRN is a standard Next.js (App Router) application with server endpoints for cart, newsletter, contact, checkout and order lookup. It stores data in Postgres and deploys to Vercel. A static host such as GitHub Pages cannot run the endpoints.

## Install and develop

Use Node.js 22.13 or later and the pinned pnpm version, 11.25.0.

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local   # then set DATABASE_URL
pnpm dev
```

Without `DATABASE_URL` the storefront still renders, but cart, newsletter and contact requests return a 503 "temporarily unavailable" response.

## Deploy to Vercel

1. Import the GitHub repository in Vercel. The framework preset is detected as Next.js; no build or output overrides are needed (`pnpm build`, `.next`).
2. In the project's **Storage** tab (or the Marketplace), add a **Neon Postgres** database and connect it to the project. This sets `DATABASE_URL` / `POSTGRES_URL` for you. Any other Postgres connection string also works if you set `DATABASE_URL` manually.
3. Deploy. The four tables (`carts`, `checkout_sessions`, `messages`, `subscribers`) are created automatically with `CREATE TABLE IF NOT EXISTS` on the first request. The same schema is in `drizzle/0000_*.sql` if you prefer to apply it yourself (`psql "$DATABASE_URL" -f drizzle/0000_*.sql`). Edit `db/schema.ts` and run `pnpm db:generate` to produce new migrations.

## Payments and configuration

Payments are disabled by default. Paid checkout requires merchant configuration and the launch work listed in the root README. After that work is complete, add these in Vercel **Settings -> Environment Variables**:

- `STRIPE_SECRET_KEY`: your Stripe secret key
- `COMMERCE_ENABLED`: `true`

Do not commit Stripe keys, database URLs, or `.env*` files. `.env.example` contains safe placeholders only.

## Included files

- `app/`, `components/`, `lib/`: every storefront page, animation and server endpoint.
- `public/assets/`: all website images, including full-resolution HD WebP images and responsive variants.
- `source-assets/hd/`: all 22 original HD PNG photographs for future editing.
- `db/`, `drizzle/`: schema and SQL migration.
- `docs/`: image prompts, dimensions and prior validation notes.

## Migrating from the Cloudflare version

Earlier revisions targeted Cloudflare Workers + D1 (Vinext/Vite). That setup has been removed; existing D1 data is not migrated automatically.
