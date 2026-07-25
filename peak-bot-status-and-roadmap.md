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

### Phase 2 — Near-term conversational features
Independent of Shopify — most ship on the current stack. Roughly ordered by leverage:

- **Streaming replies** — token-by-token so long answers feel instant. Deliberately skipped so
  far; `/api/chat` returns `{ reply, products }` in one shot today.
- **Unanswered-questions log** — capture asks Pal couldn't satisfy (no match, off-catalogue,
  refusals). Doubles as a prompt-tuning list *and* lightweight market research: what shoppers want
  that we don't stock.
- **Simple analytics** — chats/day, top asks, product-card clicks, add-to-cart taps. Enough to
  see what's working without a heavy pipeline.
- **"Complete the look"** — use the existing `pairs_with` tags to suggest complementary pieces
  after a recommendation.
- **Size-me flow** — shopper gives measurements → map to the size chart (in `store-info.md`) plus
  the `fit` tags for a confident size call.
- **Inspo-photo search** — shopper uploads a reference photo; match against the catalogue on the
  visual tags enrichment already produces.
- **In-chat wishlist** — save pieces within a conversation to revisit or hand to the cart.
- **Hinglish tuning** — feed real transcripts back into the system prompt so Pal's register
  matches how shoppers actually type.

### Phase 3 — Real commerce (Shopify)
Swap `catalog.js`'s body for the Shopify Storefront adapter (the reserved slot) and **retire
`products.json`** behind it — inventory, prices and stock become live:

- **Catalogue sync + webhooks** so stock updates itself (no more static numbers).
- **Auto-enrichment of new products** — run the `enrich.js` step on ingest instead of by hand.
- **Real cart / checkout** — wire add-to-cart to the Shopify cart; build (or repoint) product
  pages so card links resolve.
- **Order-status handoff** — let Pal answer "where's my order?" via Shopify order lookup. Pal
  states, never mutates (see [CLAUDE.md](CLAUDE.md)).
- **Retire products** — mark discontinued items so they stop being recommended.

### Phase 4 — Harden for traffic
Move rate limiting to a shared store (Upstash Redis / Vercel KV) so limits hold across serverless
instances. Decide provider-down behaviour. Re-run the query gauntlet against final copy.

### Phase 5 — Scale
- **Back-in-stock & price-drop opt-ins** — shoppers subscribe in chat; notify on the event.
- **Reviews ingestion** — pull real customer reviews so Pal can cite genuine feedback
  ("reviewers say it runs large").
- **Returning-customer style profiles** — remember preferences across visits (needs conversation
  persistence + auth; persistence was deliberately skipped until there's a reason like this).
- **Vector search** — only once the catalogue passes ~500–1,000 SKUs and tag-filtering stops
  being enough. Not before.
- **Human handoff** — route hairy support cases to a person instead of guessing.
- **The `embed.js` second door** — turn on the widget for partner sites or a Shopify-theme
  placement.

## Guiding constraints (don't regress these)

Minimal code (YAGNI, stdlib/native first); one door each for catalogue (`catalog.js`) and model
(`llm.js`); tags from vocabulary, facts from the owner; the bot states policy but never executes
it; design changes start in Figma. See [CLAUDE.md](CLAUDE.md).
