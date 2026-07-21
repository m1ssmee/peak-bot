# AI Shopping Stylist — "Pal"

An AI stylist for PeakPals, a casual western-wear store. Page-first: the primary surface is
**`/ask`**, a full-page chat that lives inside the store's own header and nav. The same chat also
builds as a floating widget (`embed.js`) for embedding on third-party sites.

```
server/     Express app — chat API, catalog, llm, tag vocabulary, ask.html
  public/   store.css (shared chrome) + built bundles
widget/     Preact source
  chat.jsx    shared conversation logic, cards, composer, styles
  ask.jsx     → server/public/ask.js    (the /ask page)
  index.jsx   → server/public/embed.js  (the floating widget)
data/       products.json + images/ + store-info.md
scripts/    enrich.js (image → tags), test.js
test-store.html   demo product page
```

## Pages

| Route | What it is |
|---|---|
| `/` | The shop (demo product page) |
| `/ask` | Full-page chat, reached from the nav |
| `/ask?product=<id>` | Same, with that product preloaded as context |
| `/embed.js` | The floating widget bundle, for other sites |

`/ask` is a *section of the store*, not a standalone app: it links `/store.css` and repeats the
same header markup, so the fonts, nav and brand match the shop. Only the area below the header is
chat. `data-product-id` on the widget and `?product=` on the page feed the same
`currentProductId` field.

Both surfaces import [widget/chat.jsx](widget/chat.jsx) — one conversation implementation, two
shells. They build as two separate self-contained IIFE bundles, so the shared code is duplicated
*in the output* (~8 kB each); that is the price of the widget staying dependency-free on a host
page.

## Setup

```bash
npm install
cp .env.example .env      # set LLM_PROVIDER, LLM_MODEL and the matching API key
npm run build             # builds widget → server/public/embed.js
npm start                 # http://localhost:3000
```

Then open <http://localhost:3000> — the server serves `test-store.html` at the root, so you
get the demo storefront with the widget already on it.

`npm run dev` restarts the server on change. `node scripts/test.js` checks the catalogue
filters and that every tag in `products.json` is in-vocabulary.

## Swapping the LLM provider

Edit **two lines** of `.env`:

```
LLM_PROVIDER=openai        # anthropic | openai | google
LLM_MODEL=<model-id>
```

…plus that provider's API key (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` /
`GOOGLE_GENERATIVE_AI_API_KEY`). Nothing else changes: `server/llm.js` is the only file
that imports a provider SDK, and both the chat agent and `scripts/enrich.js` import the
model from there.

Current model IDs:

| Provider  | Where to find model IDs |
|-----------|-------------------------|
| Anthropic | https://docs.anthropic.com/en/docs/about-claude/models |
| OpenAI    | https://platform.openai.com/docs/models |
| Google    | https://ai.google.dev/gemini-api/docs/models |

## Linking to the chat (this store)

```html
<a href="/ask">Ask Pal</a>
<a href="/ask?product=swt-001">Ask Pal about this item</a>
```

That's the whole integration for pages on the same origin. The demo store does exactly this —
an "Ask Pal" nav item and a button on the product page.

## The embed snippet (other sites)

```html
<script src="https://your-server.com/embed.js" data-product-id="swt-001"></script>
```

For a storefront you don't control, or where you want chat without a page navigation.
`data-product-id` is optional — when present it's sent as `currentProductId` so Pal
knows which product page the shopper is on. The widget derives the API URL from its own
`src`, renders inside a **shadow root** (host CSS can't reach it, its CSS can't leak), and
needs no other markup.

Hook add-to-cart into your own cart:

```html
<script>
  window.AIStylist = { onAddToCart: (product) => myCart.add(product.id) };
</script>
```

Add your site's origin to `CORS_ORIGINS` in `.env` before going live.

## Adding real products

Append to `data/products.json`:

```json
{
  "id": "tsh-002", "name": "...", "description": "...", "price": 1299,
  "sizes": ["S","M","L"], "stock": 8,
  "images": ["/images/tsh-002.jpeg"], "url": "/products/...",
  "tags": null
}
```

IDs are prefixed by garment type — `swt-` sweater, `tsh-` tee, `tnk-` tank — and match the
image filenames. Drop the photos in `data/images/`. Missing images fall back to
`placeholder.svg`, so nothing breaks before the photography lands. Leave `tags: null` —
enrichment fills it.

## Running enrichment

```bash
npm run enrich
```

For every product with no tags: resizes up to 2 images to 1024px on the long edge (sharp),
sends them with the description to the LLM, and asks for tags from the fixed vocabulary in
[server/tag-vocabulary.js](server/tag-vocabulary.js) — category, colors, fabric, fit,
occasions, season, style_vibe, formality, pairs_with. The vocabulary is compiled into the
response schema, so an off-list value can't come back. Writes after each product and logs
progress plus a running cost estimate (rates are two consts at the top of `enrich.js`, they're rough).

All five catalogue products currently ship untagged, so the first `npm run enrich` tags the
whole store. Until it runs, `search_products` matches nothing and Pal has nothing to show.

## Deploying (Vercel)

`api/index.js` exports the Express app as a serverless function; `vercel.json` rewrites every
route to it, so production and local run the exact same code. `npm start` still runs a normal
long-lived server — `server/index.js` only calls `listen()` when it is the entry point.

Two things genuinely differ under serverless, both handled:

- **Rate limits are per-instance.** In-memory counters don't survive across instances. See
  [LAUNCH.md](LAUNCH.md) — the provider spend cap is the real ceiling until you add a shared store.
- **Nothing can "refuse to boot".** Locally, demo data + `NODE_ENV=production` without
  `ALLOW_DEMO_DATA=true` exits the process. Serverless has no boot to fail, so `/api/chat`
  returns a 503 explaining why instead of crashing opaquely.

## Swapping in Shopify later

Everything reads the catalogue through [server/catalog.js](server/catalog.js), which exports
exactly two functions:

```js
searchProducts({ occasions, colors, category, max_price, in_stock })  // → array of products
getProduct(id)                                                        // → product | null
```

Replace the file's body with Shopify Storefront API calls, map their response to the same
product shape (`id, name, description, price, sizes, stock, images, url, tags`), and the chat
tools, the widget cards and enrichment all keep working. Nothing else imports the JSON file.

## Limits already in place

Rate limits 15 msg/min and 100/day per IP, messages truncated at 500 chars, history capped
at the last 12 turns, 700 max output tokens, CORS allowlist from `.env`, JSON body capped
at 64kb.
