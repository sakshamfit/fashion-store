# VYRN upstream refresh — 2026-09-30

## Reviewed snapshot

- Source: https://github.com/gireeshkumarreddy/VYRN
- Branch: `main`
- Latest fetched commit: `0ed4fb8e444f36bd1234053facf309f0bc2ecc71`
- Initial snapshot reviewed: `310a95fdaf951e5e3903cebd1339402819c7dc5f`
- Local baseline: `14bdaca938b6b82e191c696a2bf9f258d855ff43`
- Target project: `sakshamfit/fashion-store`

The upstream snapshot was fetched into this existing checkout without deleting the repository, changing its remote, switching branches or replacing local work.

The baseline already contained the initial snapshot's storefront pages, product catalog, editorial content, motion code and full-resolution/responsive photographs. In that first comparison, the store provider/styles differed only by the local **Made by sakshamfit** credit.

Upstream then published **Set the site in Manrope and refine motion** (`0ed4fb8`) during this refresh. That latest commit was fetched and its storefront updates were integrated:

- Self-hosted Manrope variable fonts, preload, typography tuning, and the SIL Open Font License.
- Staggered hero camera flashes and changing cloth details.
- Alternating top/bottom image-mask reveals.
- Right-to-left looping collection glides, a fixed glass frame/label, and captured pointer dragging.
- The Studio closing-image reveal.

These changes were adapted to retain the hydration fixes, reactive reduced-motion preferences, optimized imagery, keyboard access, mobile tap targets and bounded layouts. Product data and existing photographs remain unchanged.

## Adaptations retained

Upstream uses Vinext, Cloudflare Workers, D1, and platform-specific connector/build tooling. This project was already adapted to Next.js App Router, Vercel and Neon/Postgres. Replacing its server files or dependencies with upstream would undo that deployment adaptation. The new typography and motion were integrated independently of these infrastructure differences.

This refresh therefore retains:

- Next.js/pnpm scripts and the existing Postgres schema/migrations.
- Environment-variable configuration and deliberately disabled live commerce.
- The local footer attribution.
- All upstream creative assets, products, routes and editorial art direction.

No Cloudflare deployment migration, D1 data import, connector authorization setup, or generated build output was added.

## Improvements on the working branch

- Phone/tablet navigation with a centered wordmark, direct search, and 44px controls.
- Swipeable category filters with shareable/reload-safe category/type/sort URLs.
- Immediate category browsing for touch and reduced-motion visitors.
- Narrow-screen gallery/grid fixes and responsive image sizing.
- Notch-safe navigation, bounded dialogs, scrollable landscape sheets and 16px form fields.
- Explicit bag-storage failure/retry states instead of indefinite loading.
- Hydration-safe reveal/heading handling and reduced-motion updates.
- Correct public request origins, secure cookies and checkout return URLs behind a reverse proxy, without accepting cross-site or spoofed forwarded-host requests.
- A native-resolution WebP hero texture derivative; the original PNG is preserved.
- Native image-drag suppression and independent hover/focus/touch-gesture autoplay guards.
- Repeatable responsive UI and request-origin regression tests.

## Reviewing future upstream changes

```sh
git fetch --no-tags https://github.com/gireeshkumarreddy/VYRN.git main
git diff --stat HEAD FETCH_HEAD
git diff HEAD FETCH_HEAD -- app components lib public docs
```

Review frontend changes selectively, preserving this project's responsive improvements, credit and Next.js/Postgres adapters. Do not blindly replace the deployment or database files; switching to Cloudflare requires an explicit hosting and data-migration plan.
