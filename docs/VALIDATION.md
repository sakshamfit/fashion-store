# Verification record

## Current refresh — September 30, 2026

Source integrated: `gireeshkumarreddy/VYRN/main` at `0ed4fb8e444f36bd1234053facf309f0bc2ecc71`. The current application is **Next.js / Postgres**, not the historical Worker/D1 build described below.

### Automated results

| Check                                | Result                                      |
| ------------------------------------ | ------------------------------------------- |
| `pnpm lint`                          | Passed                                      |
| `pnpm test:types`                    | Passed                                      |
| `pnpm build`                         | Passed; 13 static pages generated           |
| Production regression suite          | **90/90 passed in 1.9 minutes**             |
| Additional layout/font/control audit | **48/48 page/viewport combinations passed** |
| `git diff --check`                   | Passed                                      |

The regression suite contains 84 UI checks (14 scenarios at six sizes) and six request-origin/security helper tests. It ran against `next start`, not only the development server.

| Profile         | Viewport   |
| --------------- | ---------- |
| Small phone     | 320 × 568  |
| Phone           | 390 × 844  |
| Large phone     | 430 × 932  |
| Landscape phone | 844 × 390  |
| Tablet          | 768 × 1024 |
| Desktop         | 1440 × 900 |

The additional audit checked home, collection, product, contact, journal, article, checkout and order routes at each size. It found no document overflow, no unloaded Manrope fonts and no audited header/carousel/quantity controls below 44px. Most UI tests use reduced motion; intro preference changes and the carousel's ordinary-motion gesture/autoplay behavior are also checked.

### Verified UI behavior

- Centered mobile navigation, direct search, 44px controls and menu closure on navigation.
- Notch-safe viewport configuration without disabling pinch zoom.
- Shareable category/type/sort URLs, persistence across reload and invalid-filter recovery.
- Immediately usable touch categories; preserved desktop sequencing and reduced-motion bypass.
- Quick-add size selection, quantities, bag display and reload behavior using isolated API fixtures.
- Recoverable unavailable-storage states with retry, rather than endless bag loading.
- Product gallery, sizes and bounded size-guide/dialog layouts, including landscape scrolling.
- Readable checkout inputs, delivery choice, scrollable summary and disabled preview payments.
- Contact/newsletter confirmation and error states using intercepted requests, not real submissions.
- Responsive product image selection and optimized hero/editorial/campaign images.
- Intro skipping and immediate response to a changed reduced-motion preference.
- Actual self-hosted Manrope font loading, contained glass frame/label, five-item carousel looping, keyboard access, selected-state ownership and real captured mouse dragging.
- Native image dragging is suppressed in the carousel. Autoplay pauses for hover/focus and held touch gestures, and resumes after pointer cancellation.
- Preserved **Made by sakshamfit** footer credit and no detected client runtime/hydration errors in the automated cases.

A stale local generated CSS chunk was found after importing the new typography. The local `.next` build/cache was cleared, the new compiled CSS was verified, and the final tests/audit ran against regenerated styles. This was not hidden by forcing interactions or weakening the typography assertions.

### Real endpoint smoke checks

No API mocking was used for these local HTTP checks:

| Request                                                  | Observed response                                              |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| Store configuration                                      | 200, `paymentReady: false`                                     |
| Bag without `DATABASE_URL`                               | 503, recoverable unavailable message                           |
| Same-origin local checkout                               | 503, deliberate launch gate                                    |
| Public HTTPS Host + forwarded protocol + matching Origin | 503, deliberate launch gate rather than a false CSRF rejection |
| Cross-site checkout                                      | 403                                                            |
| Spoofed `X-Forwarded-Host` + attacker Origin             | 403                                                            |
| Invalid newsletter data                                  | 400                                                            |
| Invalid contact data                                     | 400                                                            |

The public HTTPS case was checked with `curl`, which preserves the explicit Host header. The application's public-origin helper rejects malformed/missing/cross-site origins and never treats `X-Forwarded-Host` as the destination authority.

### Limits and launch requirements

- No database URL was available. Real persisted bags, successful newsletter/contact writes and database-backed orders were **not** validated in this pass. UI persistence/submission checks use in-memory fixtures.
- Stripe remains deliberately disabled. No payment, real order, receipt or marketing email was created.
- Chromium 138 was used with Playwright 1.63.0 and viewport/touch emulation. This is not physical iPhone/Safari/Android acceptance testing or a real-device performance benchmark. Official browser downloads were unavailable in this environment; a provisioned executable was used through the documented configuration option.
- Final mobile/desktop screenshots were inspected after the Manrope/motion import. Screenshots, layout reports and traces are local ignored inspection artifacts, not production assets.
- Live sales still require merchant configuration, authoritative inventory, policy review, inventory reservations/fulfillment webhooks, receipts, abuse controls and retention decisions as listed in the README.

## Historical verification (before this refresh)

The following entries are retained as historical records only. References to Worker builds, a local preview database, successful writes or old carousel behavior are **not evidence of those capabilities being validated in the current environment**.

- TypeScript compilation passes with no errors.
- Production Worker build passed; final build runs during publication.
- Desktop, 390px phone and 768px tablet compositions inspected in the managed browser preview.
- Mobile category navigation reaches the correct filtered catalog.
- Quick add requires a size, saves selected variant, opens the bag, and updates the subtotal when quantity changes.
- Cart persistence was checked after a full reload.
- Low-to-high price sorting returns €79, €120, €140, €160, €170, €180, €240, €280.
- Product gallery front/back changes and size selection checked.
- Four-product selector changes the visible image, label and product link.
- Product navigation finishes at the destination with the viewport reset and the tile overlay removed.
- Newsletter signup confirmation checked using a synthetic address in the local preview database only.
- Payment CTA stays disabled without merchant configuration; no payment or order success was simulated.
- Reduced motion has source-level fallbacks for all large animations. No live device performance benchmark was performed.
- WebMCP registration is feature-detected. The preview browser reports modelContext unavailable, so runtime WebMCP validation could not be performed.

Live Stripe payments, transactional receipts, inventory fulfillment and commercial policy content require merchant setup and acceptance testing before public sales.

## September 29 correction pass

- Re-read the full supplied blueprint and master implementation prompt.
- Removed the separate CategoryStory section; one category section remains.
- Verified the centered VYRN opening and the settled hero/header; docking uses the measured header wordmark rectangle. Intro can be skipped and replays on a full homepage load; skip was checked to remove the overlay immediately without later timer reappearance.
- Replaced all screenshot-based image references in rendered routes with standalone HD assets. All 22 files and responsive variants are present; image integrity checks found no missing sources.
- Verified 390px and 768px responsive surfaces, including hero, categories, gallery, product grid, editorial and closing campaign. Desktop Studio photographs load and every collage card fits inside its section. No horizontal overflow in these inspected surfaces.
- Category sequence retains a fixed layout height, including when entering later sections directly by anchor. Verified editorial anchor settles at the intended 110px header clearance.
- Collection arrows advance the active piece. Local Hoodie filtering shows two results; ascending price sorting returns €120 then €160.
- Black-shell back-view selection changes to shell-back.webp. Selecting size M enables Add to bag; addition opens the cart with an updated €880 subtotal in the local test database.
- Product navigation activates the tile overlay and reaches the next product using its HD image.
- Editorial reveals all settle at opacity 1. The campaign renders three independently revealed image regions; copy is clear of decorative shapes on mobile.
- No live payment, external order or email was sent. Reduced motion is verified in source; real-device frame-rate measurements are not available.
