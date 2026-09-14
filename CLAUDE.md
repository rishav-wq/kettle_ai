# Kettle

Everyday AI video courses in Hindi for Indians over 40. Mobile-first PWA. One Next.js app, MongoDB on Atlas, deployed on Render. Solo engineer, so every choice favors one person being able to run it.

## Rules that are not obvious from the code

- **Viewer state is the spine.** `src/lib/viewer.ts` resolves `anonymous | free | gold` plus the tenant once per request. Every gating decision, popup, and nav item is a function of it. No page decides access on its own.
- **Every tenant-scoped query goes through `withTenant()`.** `src/lib/db/scope.ts` hands you a handle that narrows every read and stamps every write with the tenant; `src/lib/db/collections.ts` classifies each collection. Never take a tenant id from the client. `bypass` is for the seed script and the payment webhook only.
- **Nothing outside `src/lib/db` imports the MongoDB driver.** This is the rule that replaced row-level security, and it is now the whole of the isolation guarantee. Postgres refused another tenant's rows itself, so a forgotten filter returned nothing; MongoDB returns everything. `npm run check:tenancy` proves the scoped path holds, but it cannot see a raw driver call made elsewhere — hence the rule.
- **Row-level security is FORCEd**, so it applies to the table owner too. A missing `set_config` returns zero rows rather than all rows. If a page shows nothing unexpectedly, that is usually why.
- **Every route handler** parses input with a schema from `src/lib/security/validators.ts`, checks `assertSameOrigin` on mutations, and rate limits with `src/lib/security/rate-limit.ts`. Webhooks skip origin checks and verify a signature instead.
- **Pine on white.** Text and controls are Pine `#00311F`; the ground is white. Milk `#F0EEE6` is a secondary surface only. Every grey is a tint of pine. Components use the semantic tokens in `globals.css` (`ink`, `paper`, `fill`, `line`, `wash`), never raw hex. No gradients. Large blocks are outlined, not filled; only controls (buttons, tabs, avatars, step numbers) are solid pine.
- **Night mode is opt-in only.** The Night chip sets `data-theme="dark"`. The stylesheet deliberately does not follow `prefers-color-scheme`, because a dark screen in daylight on a cheap phone is the wrong default for this audience. Do not add the media query back.
- **Devanagari leading.** Hindi never renders below `line-height: 1.34` for headings or `1.5` for body. Use the `.dv` class or `lang="hi"`. Latin leading crushes matras.
- **Bilingual copy uses `<T hi en />`** from `src/components/bilingual.tsx`. It renders both languages and switches on `<html lang>` with CSS, so it works in server components with no flash and needs no language passed in. `<TN>` is the same for copy containing elements — a sentence with a link in it, where the link sits in a different place in each language.
- **An attribute cannot be hidden by language, so it has to choose.** `pick(lang, hi, en)` from `src/lib/pick.ts` is for placeholder, aria-label and alt. Server components get `lang` from `getLang()`; client components get it from `useLang()`, provided once in the root layout. **`pick` lives in `src/lib/pick.ts` and nowhere else**: it started life in the client module beside `useLang`, where every server caller type-checked, built, and then threw "Attempted to call pick() from the server" at request time. Neither `tsc` nor `next build` catches that.
- **The hero demo is the one exception.** It types its question a character at a time, so the text is state rather than markup and CSS cannot hide the other language. It picks a script up front in `src/components/hero-typing-demo.tsx`.
- **The policy pages are bilingual too, and say which version governs.** A translated policy with no rule for disagreement is worse than none. `Governing` in `src/app/legal/parts.tsx` carries that line; both versions still need the same legal review, and every TO CONFIRM is still outstanding.
- **Page metadata stays English.** Titles and descriptions are for search engines and browser tabs, and are not switched.
- **Video audio is Hinglish, text comes in two full tracks.** One shoot per lesson, no English re-record. The `*Hi` fields are written in that same spoken register: Devanagari with English loanwords left in Latin, as in "Resume बनाइए". The `*En` fields are plain English. So mixed-script lines are normal here, not an exception, which is why the type is Anek: both faces load Devanagari and Latin, so one line renders in one family instead of colliding two. Captions must be written by hand; automatic captioning fails on code-switched speech.
- **Type floor.** Body text is 17px on phones, 20px with `data-textsize="big"`. Tap targets never drop below 44px.
- **Lessons never store a YouTube ID.** They reference `video_assets`; `src/lib/video/embed.ts` is the only place that knows about providers. A ref starting with `TODO` renders as "video being added".
- **Exactly four lessons are free.** The seed script refuses any other count.
- **Social proof must be real — with one declared exception.** The joiners popup reads from actual memberships and names actual people; testimonials and the teacher block come from `content/kettle-site.json` and render with an EXAMPLE chip until they are real. Never fabricate a signup or a testimonial. The audience is scam-targeted and the product teaches scam avoidance.
- **The exception is `FLOOR` in `src/components/landing.tsx`.** Rishav set the landing strip's learner, lesson and minute figures as floors on 2026-09-14, so those three are asserted rather than counted: the floor shows with a `+` until the real number passes it, then the real number takes over. This is a deliberate decision, not a bug — do not "fix" it back to counting. It is also the only place in the product where a displayed number is not measured, and it should stay that way. The free-lesson tile carries no `+`, because exactly four lessons are free and `4+` could never become true.
- **Unfilled landing content is flagged, not faked.** `content/kettle-site.json` holds the teacher, testimonials and FAQ. Any entry with `"placeholder": true` renders with a dashed border and an EXAMPLE chip so it cannot ship unnoticed. Replace with real people and real photographs, then drop the flag.
- **No urgency, ever.** No countdown, no "offer ends", no struck-through price. Most comparable products do this; it is the visual grammar of the scams our first course warns about.
- **Entitlement flips only from the server.** Payment success is confirmed by the Razorpay webhook writing to `memberships`. The client polls `/api/payments/status`, it never asserts. `/api/payments/simulate` stands in for the webhook locally and refuses to exist once real keys are set or in production.
- **Sessions are documents, not signed tokens.** The cookie holds an opaque secret; the database holds only its SHA-256 hash. That makes revocation and account deletion real. `src/lib/auth/session.ts` is one of the few places that touches the database outside `withTenant()`, because the tenant is not known until the session is read.
- **Secrets resolve on use, not on import.** `getAuthSecret()` and the SMS sender are lazy, because `next build` evaluates every route with `NODE_ENV=production` before secrets are necessarily in scope. A module-level throw breaks the build; a lazy one still refuses a real request.
- **Swapping the SMS provider is one file.** `src/lib/auth/sms.ts` holds the interface, the dev sender that prints to the log, and the MSG91 implementation. India needs DLT registration per template per language.
- **`DATABASE_URL` is required everywhere, including locally.** MongoDB has no in-process equivalent of the embedded Postgres this used to run, so there is no zero-setup path any more: a clean checkout needs an Atlas connection string before `npm run dev` will serve a page. It must name a database, or the driver quietly uses one called `test`.

## Layout

- `src/app` routes. `/kit` is the component kit, not linked from the product.
- `src/components/ui` the reusable pieces. `src/components/app-shell.tsx` is the frame every signed-in screen uses: one column with a bottom bar on phones, a fixed sidebar and a content area from `lg` (1024px) up. Pass `width="wide"` for catalog-style pages, the default `"reading"` for everything else.
- **Two layouts, one tree.** Phone first, then `lg:` overrides. Never a separate desktop route or component. A phone column centred in a desktop window reads as unfinished, so from `lg` the landing page goes two-column and the app grows a sidebar.
- `src/lib/db/documents.ts` the whole data model as document types. `src/lib/db/indexes.ts` is what replaced the migrations: applied on every connection, it carries the uniqueness constraints the app's correctness depends on — one phone to one account, one receipt to one charge, one progress document per lesson.
- `content/kettle-content.json` is the course source of truth in v0. `npm run db:seed` loads it. `content/kettle-site.json` is the landing page content and is read at request time, no seed needed.
- `src/components/landing.tsx` holds the landing sections; `src/app/page.tsx` is mostly the ordering decision, which is the part that matters. The order follows verified patterns from thirteen comparable products, with two departures noted in the file.
- `src/components/logo.tsx` is the kettle mark, inline so it inherits `currentColor`. `scripts/make-demo-art.mjs` regenerates the placeholder course and portrait art; delete it when real photographs land.

## Commands

```
npm run dev          # needs DATABASE_URL; indexes are applied on connect
npm run db:seed      # load content/kettle-content.json
npm run db:ping      # prove the cluster is reachable, without printing secrets
npm run build        # what Vercel runs
npm run typecheck && npm run lint
npm run check:tenancy # proves tenant isolation through the scoped handle
npm run smoke -- http://localhost:3080 <path-to-dev-log>   # walks the whole product
```

## Verifying

`scripts/check-rls.ts` proves a query with no tenant set sees nothing, that one tenant cannot read or write another's rows, and that global content stays visible. `scripts/smoke.mjs` drives a running server the way a browser would, with a cookie jar and real origin headers: it signs in with the code from the dev log, onboards, completes the four free lessons, checks the fifth is refused, pays through the simulated webhook, and confirms the lock lifts. It also probes what must fail, including a forged webhook signature and a cross-origin write. Run both before any deploy.
