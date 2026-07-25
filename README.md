# PeakPals — AI Shopping Stylist ("Pal")

An AI stylist for **PeakPals**, a casual western-wear store. **Page-first**: the main surface is
**`/ask`**, a full-page chat that lives inside the store's own header and nav — a shopper types
what they want and Pal recommends pieces from the catalogue. A floating widget (`embed.js`) is
also built and kept as a *future second door* for embedding on third-party sites (see below).

- **Live:** https://peak-bot-beta.vercel.app
- **Repo:** github.com/m1ssmee/peak-bot (private)
- **Design source of truth:** the Figma file
  [Peakpals-Ai](https://www.figma.com/design/Ros5ui315aZPVUjAVQZCZd/Peakpals-Ai). The homepage is
  built from its "Assistant 6" frame; colours, type and spacing were extracted into
  `server/public/tokens.css` and imagery into `data/images/site/`. **Change the look in Figma
  first**, then re-extract — don't hand-drift the CSS.

## Layout

```
server/     Express app
  index.js        routes, chat API (tool-calling), demo-data tripwire, listen()-only-when-main
  llm.js          the ONLY file that imports a provider SDK (swap providers here)
  catalog.js      the ONLY door to the catalogue (reserved Shopify-adapter slot)
  tag-vocabulary.js   fixed tag vocabulary — the enrichment schema
  store-info.js   loads store-info.md, strips the DEMO-DATA banner, exports the tripwire
  home.html       storefront homepage (Figma design)
  ask.html        /ask shell (mounts ask.js)
  public/         tokens.css (design tokens + shared chrome) + built bundles (gitignored)
widget/     Preact source
  chat.jsx        shared conversation logic, product cards, composer, styles
  ask.jsx    → server/public/ask.js     (the /ask page)
  index.jsx  → server/public/embed.js   (the floating widget)
api/index.js      Vercel entry — re-exports the Express app as a serverless function
data/       products.json (the database), store-info.md (policies), images/ (+ images/site/)
scripts/    enrich.js (image → tags), test.js
test-store.html   the single product page, served at /product
```

## Pages

| Route | What it is |
|---|---|
| `/` | Storefront homepage (Figma design): hero + AI search, Best Sellers, Collections |
| `/product` | A single product page (demo) with an "Ask Pal about this item" button |
| `/ask` | Full-page chat, reached from the hero search or the nav |
| `/ask?product=<id>` | Chat with that product preloaded as context |
| `/ask?q=<text>` | Chat that auto-sends `<text>` as the first message (the hero search does this) |
| `/embed.js` | The floating-widget bundle, for embedding on other sites |

`/ask` is a *section of the store*, not a separate app: it links `/tokens.css` and repeats the
same header, so fonts, nav and brand match the shop. Only the area below the header is chat.
Both `/ask` and the widget import [widget/chat.jsx](widget/chat.jsx) — one conversation
implementation, two shells, built as two self-contained IIFE bundles.

## Local development

```bash
npm install
cp .env.example .env      # then set LLM_PROVIDER, LLM_MODEL and the matching API key
npm run build             # builds BOTH bundles → server/public/{embed.js,ask.js}
npm start                 # http://localhost:3000  (open it — the homepage is served at /)
```

`npm run dev` restarts the server on change (does **not** rebuild the widget — re-run
`npm run build` after editing anything under `widget/`). `node scripts/test.js` checks the
catalogue filters and that every tag in `products.json` is in-vocabulary.

## Swapping the LLM provider

The whole codebase talks to the model through [server/llm.js](server/llm.js) only. Switching is
**two lines** of `.env` plus that provider's key:

```
LLM_PROVIDER=openai        # anthropic | openai | google
LLM_MODEL=<model-id>
```

Keys: `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`. Both the chat
agent and `scripts/enrich.js` import the model from `llm.js`, so nothing else changes. Find
current model IDs at the provider's docs (Anthropic / OpenAI platform / Google AI Studio).

> Currently on **google / gemini-3.5-flash**. Google's free tier is ~20 requests/day per model —
> enable billing or the store goes quiet fast. See [LAUNCH.md](LAUNCH.md).

## Adding real products

Append to `data/products.json` (`tags: null` so enrichment fills them):

```json
{
  "id": "tsh-002", "name": "...", "description": "...", "price": 1299,
  "sizes": ["S","M","L"], "stock": 8,
  "images": ["/images/tsh-002.jpeg"], "url": "/products/...",
  "tags": null
}
```

IDs are prefixed by garment type (`swt-` sweater, `tsh-` tee, `tnk-` tank). Drop the photos in
`data/images/` matching the paths; missing images fall back to `placeholder.svg`. **Prices,
sizes, stock, descriptions and policies are facts — they come from the owner, never the model.**

## Enrichment (image → tags)

```bash
npm run enrich
```

For every product with `tags: null`: resizes up to 2 images to 1024px (sharp), sends them with
the description to the LLM, and asks for tags from the **fixed vocabulary** in
[server/tag-vocabulary.js](server/tag-vocabulary.js) — category, colors, fabric, fit, occasions,
season, style_vibe, formality, pairs_with. The vocabulary is compiled into the response schema,
so an off-list value can't come back. Writes after each product; logs a rough cost estimate.
The 5 seeded products are already tagged — this only runs on new, untagged ones.

## Deploying (Vercel)

**Push to `main` = redeploy.** `api/index.js` re-exports the Express app; `vercel.json` rewrites
every route to it, so production and local run the exact same code. `npm start` still runs a
normal long-lived server (`server/index.js` calls `listen()` only when it's the entry point).

Two things differ under serverless, both handled:

- **Rate limits are per-instance** — in-memory counters don't survive across instances. The
  provider spend cap is the real ceiling. See [LAUNCH.md](LAUNCH.md).
- **Nothing can "refuse to boot"** — locally the demo-data tripwire exits the process; serverless
  has no boot to fail, so `/api/chat` returns a friendly 503 instead.

Env vars live in Vercel → Project → Settings → Environment Variables (see
[HANDOVER.md](HANDOVER.md) for the full list). Don't set `PORT` (Vercel injects it) or `NODE_ENV`
(Vercel sets it to `production`).

## The embed widget (kept for later)

`embed.js` still builds and works, but the store doesn't use it — the homepage links to `/ask`
instead. It's kept deliberately as a **second door**: a one-line drop-in for a storefront you
don't control (e.g. a future Shopify theme) where you want chat without a page navigation.

```html
<script src="https://your-server.com/embed.js" data-product-id="swt-001"></script>
<script>window.AIStylist = { onAddToCart: (product) => myCart.add(product.id) };</script>
```

It derives the API URL from its own `src` and renders in a **shadow root** (host CSS can't reach
it, its CSS can't leak). Add the host origin to `CORS_ORIGINS` before using it cross-site.

## Reserved: Shopify

Everything reads the catalogue through [server/catalog.js](server/catalog.js), which exports
exactly `searchProducts(filters)` and `getProduct(id)`. To go live on real inventory, replace
that file's body with Shopify Storefront API calls mapped to the same product shape
(`id, name, description, price, sizes, stock, images, url, tags`). Nothing else imports the JSON.

## Guardrails in place

Rate limits 15 msg/min & 100/day per IP, messages truncated at 500 chars, history capped at the
last 12 turns, 700 max output tokens, CORS allowlist from `.env`, JSON body capped at 64 KB.
Pal **states** policy (from `store-info.md`) but never executes it — no discounts, no order
changes.
