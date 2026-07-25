# PeakPals AI Stylist — Status & Roadmap

High-level status and where this is headed. For operations see [HANDOVER.md](HANDOVER.md), for
the launch checklist see [LAUNCH.md](LAUNCH.md), for conventions see [CLAUDE.md](CLAUDE.md).

## Status — as of 2026-07-25

**A working demo, deployed and reskinned, not yet launch-ready.**

Done:

- **Page-first product.** `/ask` is a full-page chat inside the store; the homepage hero search
  seeds it (`/ask?q=…`). `/` is the storefront from the Figma design, `/product` a product page.
- **Provider-agnostic LLM** through `llm.js` — swap in two `.env` lines. Currently
  google / gemini-3.5-flash.
- **Catalogue behind one door** (`catalog.js`), 5 seeded PeakPals products, all enriched with
  in-vocabulary tags from their photos.
- **Reskinned to the Figma design** — tokens (Playfair Display + Poppins, monochrome palette) in
  `tokens.css`, real logo, hero crop matched, fonts loaded via `<link>`.
- **Premium homepage→/ask transition** via the native View Transitions API, reduced-motion aware,
  verified on desktop + mobile.
- **Deployed on Vercel** (push = redeploy); demo-data tripwire and per-instance rate-limit
  caveats handled and documented.
- **Docs for handover:** README, CLAUDE.md, HANDOVER.md, LAUNCH.md, this file.

Not done (the reason it's a demo, not a store):

- **Store data is invented.** `store-info.md` policies and the product prices/stock are demo
  values; `ALLOW_DEMO_DATA=true` is holding the tripwire open.
- **LLM is throttled.** Google free tier (~20 req/day) means the live store stops answering fast —
  billing not yet enabled.
- **Commerce is inert.** Add-to-cart is a no-op; product URLs 404; nothing writes an order.

## Roadmap

### Phase 1 — Make it a real store (unblock launch)
Everything in [LAUNCH.md](LAUNCH.md). The critical path: enable provider billing, replace
`store-info.md` with real policies (removing the DEMO-DATA banner + `ALLOW_DEMO_DATA`), verify
real prices/stock, lock `CORS_ORIGINS` to the storefront domain, set a provider spend cap.

### Phase 2 — Real commerce
Swap `catalog.js` for the Shopify Storefront adapter (the reserved slot) so inventory, prices and
stock are live and self-updating. Wire add-to-cart to the real cart. Build (or repoint) product
pages so card links resolve.

### Phase 3 — Harden for traffic
Move rate limiting to a shared store (Upstash Redis / Vercel KV) so limits hold across serverless
instances. Decide provider-down behaviour. Re-run the query gauntlet against final copy.

### Phase 4 — Grow the surface
Turn on the `embed.js` second door for partner/again-Shopify placements. Consider conversation
persistence and streaming replies (both deliberately skipped so far — add when there's a reason).

## Guiding constraints (don't regress these)

Minimal code (YAGNI, stdlib/native first); one door each for catalogue (`catalog.js`) and model
(`llm.js`); tags from vocabulary, facts from the owner; the bot states policy but never executes
it; design changes start in Figma. See [CLAUDE.md](CLAUDE.md).
