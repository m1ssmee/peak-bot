# PRD — Peak Bot

Product requirements for **Peak Bot**, the AI shopping stylist. Written for someone new to the
project. Grounded in the repo as it stands today; every unknown business number is marked
**[OWNER TBD]** with the exact question to answer. Companion docs: [README.md](README.md) (how it
works), [HANDOVER.md](HANDOVER.md) (ops), [CLAUDE.md](CLAUDE.md) (conventions),
[LAUNCH.md](LAUNCH.md) (launch checklist), [peak-bot-status-and-roadmap.md](peak-bot-status-and-roadmap.md)
(phases).

## 1. Overview

Peak Bot is an embeddable AI shopping stylist for a single fashion brand. A shopper describes
what they want in plain language — an occasion, a colour, a budget — and **Pal**, the stylist
persona, recommends 2–4 real pieces from the brand's catalogue with one reason each, answers
sizing and store-policy questions, and offers a refinement. The reference build dresses **PeakPals**,
a casual western-wear store: a Figma-designed homepage whose hero search hands off into a
full-page chat at `/ask`. It runs as a small Express + Preact app on Vercel, is provider-agnostic
about which LLM it uses, and reads the catalogue through a single seam that a Shopify adapter will
later replace.

**Pitch:** guided, conversational shopping — the "talk to a stylist" experience of a flagship
store — at single-brand scale, in one script tag.

## 2. Problem & opportunity

Large guided-shopping experiences (e.g. Daydream) let shoppers describe intent and get curated
results instead of scrolling a grid and guessing at filters. A small brand can't build that, yet
its shoppers have the same needs: "something warm for college under ₹2,000", "does this suit a
wedding?", "what size am I?". Peak Bot packages that guided experience for one brand's catalogue —
the model does the interpreting and styling, the brand keeps control of facts and policy. The
opportunity is higher conversion and fewer abandoned "couldn't find it" sessions, plus a standing
record of what shoppers asked for that the store doesn't stock. Sizing of that opportunity for
this brand is **[OWNER TBD — what are current site conversion rate and monthly sessions?]**.

## 3. Users

**Shoppers (end users):**
- **Occasion shopper** — has an event and a vibe, not a product in mind ("wedding-guest, festive,
  under budget"). Pal maps intent → `occasions`/`colors`/`max_price` filters.
- **Size-anxious buyer** — won't commit without a confident size. Pal answers from the size chart
  and `fit` tags (see §5, Size guidance).
- **Support-seeker** — asks returns/shipping/care. Pal quotes `store-info.md` and nothing else.
- **Casual browser** — no goal; taps a starter prompt or a Best-Sellers/Collections tile.

**Store owner (admin user):** not a live dashboard user today. Administers by editing files —
`products.json` (facts), `store-info.md` (policy), `tag-vocabulary.js` (tag options) — and
running `npm run enrich`. See [HANDOVER.md](HANDOVER.md).

## 4. Goals & success metrics

Candidate metrics below; **no instrumentation ships in v1** (analytics is Phase 2 in the
[roadmap](peak-bot-status-and-roadmap.md)). Targets are the owner's to set — none are invented.

| Metric | Why it matters | Target |
|---|---|---|
| Chats per day | Adoption | **[OWNER TBD — what daily chat volume signals product-market fit for you?]** |
| Chat → card-click rate | Recommendations land | **[OWNER TBD — what click-through would you call "working"?]** |
| Add-to-cart from chat | Commercial value | **[OWNER TBD — what add-to-cart rate justifies keeping this on?]** |
| Unanswered-question rate | Catalogue/vocabulary gaps | **[OWNER TBD — what miss rate is acceptable before it needs tuning?]** |
| Support deflection | Fewer manual replies | **[OWNER TBD — what share of returns/shipping questions should Pal fully handle?]** |

## 5. Scope — shipped v1

Each feature's acceptance criteria are **true in the current code**.

- **The `/ask` chat experience.** Full-page chat inside the store's header/nav.
  - Empty state shows 3–4 tappable starter prompts; a first message replaces them.
  - Pal returns 2–4 product cards (image, name, INR price, View, Add-to-cart) plus a short reply;
    cards come only from what the tools returned, so they can't drift from the text.
  - After results, 2–3 refinement chips appear.
- **Homepage bar → /ask handoff + transition.** The hero search seeds the conversation.
  - Submitting navigates to `/ask?q=…` and auto-sends that text as the first message.
  - Where supported, the bar morphs into the composer via the View Transitions API; elsewhere a
    plain fast navigation. Never blocks navigation.
- **Product-page context.** `/ask?product=<id>` (and the widget's `data-product-id`).
  - The named product is injected as `currentProductId`; "does this suit a wedding?" resolves to it.
- **Enriched-catalogue search.** Two read-only tools: `search_products({occasions, colors,
  category, max_price, in_stock})` and `get_product(id)`.
  - Filters accept only in-vocabulary values (compiled from `tag-vocabulary.js`).
  - All catalogue reads go through `catalog.js`; nothing else touches `products.json`.
- **Store-info answers.** Returns, shipping, payments, care — quoted from `store-info.md` only.
  - Off-topic asks get a one-line redirect; Pal only discusses this brand's products, sizing,
    styling and orders.
- **Size guidance.** From the size chart in `store-info.md` plus each product's `fit` tag.
  - Given a measurement, Pal maps to a size and applies the fit note ("sweaters run generous, size
    down; tees run one size large").
- **Guardrails (see §6).** Rate limits, length caps, CORS, read-only tools.
  - 15 msg/min and 100/day per IP; messages truncated at 500 chars; history capped at 12 turns;
    700 max output tokens; JSON body capped at 64 KB.

## 6. Non-functional requirements

- **Security:** provider API key is server-side only (never in `embed.js`); `express-rate-limit`
  at 15/min + 100/day per IP; a provider-side spend cap is required before launch
  ([LAUNCH.md](LAUNCH.md)); CORS allowlist from env.
- **Honesty rules (load-bearing — see [CLAUDE.md](CLAUDE.md)):** facts (price, stock, sizes,
  policy) come from the owner, never the model; enrichment infers only what's visible in photos;
  Pal **states** policy but has **no tool that mutates** anything; it never invents products or
  policies — cards are real catalogue entries, policy is quoted from `store-info.md`.
- **Demo-data tripwire:** while `store-info.md` carries the `DEMO-DATA` banner the policies are
  invented; in production the server refuses to serve unless `ALLOW_DEMO_DATA=true`
  ([CLAUDE.md](CLAUDE.md)).
- **Accessibility & motion:** all transitions collapse under `prefers-reduced-motion: reduce`.
- **Mobile-first:** the chat is full-screen on phones; the widget renders in a shadow root so host
  CSS can't clash; layouts are responsive with no hover-only affordances.

## 7. Non-goals for v1

Deliberately out of scope:

- **No payments, refunds or order mutation in chat** — Pal has no write tools, by design.
- **No live stock** — `stock` is a static number in `products.json` until the Shopify adapter
  lands; it does not decrement on sale.
- **No WhatsApp / messaging channel** — web chat only. (`store-info.md` lists a WhatsApp number as
  demo contact info, not an integration.)
- **No vector search** — tag filtering is sufficient below ~500–1,000 SKUs; revisit past that.
- **No analytics/instrumentation, no conversation persistence, no streaming** — all Phase 2+.

## 8. Future phases

Detailed in [peak-bot-status-and-roadmap.md](peak-bot-status-and-roadmap.md); summarised here.

**Phase 1 — launch:** everything in [LAUNCH.md](LAUNCH.md) (real policies, real prices, billing,
CORS, spend cap). **Phase 2 — near-term conversational features:** streaming, an
unanswered-questions log, simple analytics, complete-the-look via `pairs_with`, a size-me flow,
inspo-photo search, in-chat wishlist, Hinglish tuning. **Phase 3 — Shopify commerce:** replace
`catalog.js`'s body with a Storefront adapter (retiring `products.json`), sync + webhooks so stock
self-updates, auto-enrichment, real cart/checkout, order-status handoff. **Phase 4 — harden:**
shared-store rate limiting, provider-down behaviour. **Phase 5 — scale:** back-in-stock/price-drop
opt-ins, reviews ingestion, returning-customer profiles, vector search, human handoff, the
`embed.js` second door.

## 9. Risks & mitigations

- **Hallucination.** Mitigated structurally: cards are built from tool output, tags are
  vocabulary-constrained, policy is quoted from one file, and facts never come from the model. The
  residual risk is Pal *phrasing* something wrong — covered by the pre-launch query gauntlet
  ([LAUNCH.md](LAUNCH.md)).
- **Abuse / runaway cost.** Rate limits cap requests but not tokens, and on serverless they're
  per-instance; the **provider spend cap is the real ceiling** and must be set (LAUNCH.md, §6).
- **Demo-data leakage.** The tripwire refuses production boot on demo policies; the residual risk
  is shipping with `ALLOW_DEMO_DATA=true` left on — call it out at launch.
- **Hosting tier at commercial launch.** Vercel free/Hobby + a free LLM tier (~20 req/day) will
  not serve real traffic; the store goes quiet fast. Upgrade plan + provider billing before any
  real launch.
- **Design drift.** The look must stay sourced from the Figma file; hand-editing `tokens.css`
  diverges the site from the design source of truth ([CLAUDE.md](CLAUDE.md)).

## 10. Open questions (answer-me list)

**Business (from §2 & §4):**
1. Current site conversion rate and monthly sessions? (opportunity sizing)
2. Daily chat volume that signals product-market fit?
3. Chat → card-click rate you'd call "working"?
4. Add-to-cart rate that justifies keeping this on?
5. Acceptable unanswered-question (miss) rate before tuning?
6. Share of returns/shipping questions Pal should fully handle (deflection target)?

**Launch-blocking (from [LAUNCH.md](LAUNCH.md)):**
7. Enable provider billing or switch provider — the free tier blocks the live store.
8. Replace `store-info.md` demo policies with real ones; remove `ALLOW_DEMO_DATA`.
9. Verify every price/size/stock in `products.json` against a real system.
10. Set `CORS_ORIGINS` to the real storefront domain; enable a provider spend cap.
11. Wire add-to-cart to a real cart (currently a no-op) and make product URLs resolve (currently
    404).
12. Rewrite product descriptions in brand voice, then re-run `npm run enrich`.
13. Move rate limiting to a shared store before public traffic.
14. Re-run the query gauntlet against final prompt/persona/policy wording.
