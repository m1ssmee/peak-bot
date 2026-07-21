# AI Shopping Stylist — "Pal"

A floating chat stylist for PeakPals, a casual western-wear store. One `<script>` tag on any page,
one Express backend, provider-agnostic LLM.

```
server/     Express app — chat API, catalog, llm, tag vocabulary
widget/     Preact source → builds to server/public/embed.js (single file)
data/       products.json + images/
scripts/    enrich.js (image → tags), test.js
test-store.html   fake product page showing the embed
```

## Setup

```bash
npm install
cp .env.example .env      # set LLM_PROVIDER, LLM_MODEL and the matching API key
npm run build             # builds widget → server/public/embed.js
npm start                 # http://localhost:3000
```

Then open `test-store.html` in a browser (any static server, or straight off disk — the
widget calls `localhost:3000`, which is already in the default `CORS_ORIGINS`).

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

## The embed snippet

```html
<script src="https://your-server.com/embed.js" data-product-id="p4"></script>
```

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
