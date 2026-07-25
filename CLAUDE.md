# CLAUDE.md — conventions for this project

Read this before changing anything. These are load-bearing rules, not style preferences.
For what the product is, see [PRD.md](PRD.md); for architecture and how-to-run, see
[HANDOVER.md](HANDOVER.md); for what's unfinished, see [LAUNCH.md](LAUNCH.md).

## The catalogue has exactly one door

`server/catalog.js` is the **only** module that reads product data. It exports two functions —
`searchProducts(filters)` and `getProduct(id)` — and nothing else may touch `products.json`
directly. This is a **reserved Shopify-adapter slot**: the day the store goes live on real
inventory, `catalog.js`'s body is swapped for Shopify Storefront API calls and every caller
keeps working. `data/products.json` is the database *until then*. Don't add a second read path.

## Tags vs. facts — two different sources, never mixed

- **Tags** (category, colors, fabric, fit, occasions, season, style_vibe, formality, pairs_with)
  come from `server/tag-vocabulary.js` **only**. That vocabulary is compiled into the enrichment
  response schema, so the model physically cannot return an off-list value. If you need a new
  tag value, add it to the vocabulary — never write a raw string into `products.json`.
- **Facts** (price, stock, fabric content, sizes, policies) come from the **owner**, never the
  model. Enrichment (`scripts/enrich.js`) may infer only what is *visible in the product photos*.
  It must not invent prices, stock, or measurements. When adding products, leave `tags: null`
  and fill the facts by hand.

## The bot states policy — it never executes it

Pal quotes returns windows, shipping, sizing and care **from `data/store-info.md`** (the sole
policy source) and nothing else. It has **no tools that change anything**: no discounts, no
price overrides, no order edits, no inventory writes. The only tools are `search_products` and
`get_product`, both read-only. Keep it that way — a stylist that can mutate orders is a
liability, not a feature.

## The demo-data tripwire

`data/store-info.md` starts with a `DEMO-DATA — replace before launch` banner. While that line
exists, `store-info.js` sets `isDemo = true`. The policies below it (returns, shipping, sizes,
WhatsApp number) are **invented**, and Pal will state them to customers as fact.

- **Local + `NODE_ENV=production`** without `ALLOW_DEMO_DATA=true` → the server **refuses to
  boot** (`process.exit(1)`). This is intentional: it stops fake policies reaching real shoppers.
- **Serverless** has no boot to fail, so `/api/chat` returns a friendly **503** ("Pal is taking a
  quick break") and logs the real reason.
- `ALLOW_DEMO_DATA=true` (set on Vercel) is the explicit "yes, I know it's demo data" override
  that keeps the demo running. Deleting the banner from `store-info.md` is what actually fixes it.

Don't "fix" a demo-data 503 by hard-coding around the check. Either set the flag (demo) or
replace `store-info.md` with real policies (launch).

## Keep the code minimal

This project is deliberately small and was reviewed for over-engineering. Hold the line:

- **YAGNI** — no speculative features, no config for values nobody sets, no interface with one
  implementation. The Shopify slot is the *only* sanctioned abstraction-for-later.
- **Stdlib / platform first** — reach for Node stdlib and native browser features before adding a
  dependency or hand-rolling. Example: the homepage→/ask animation uses the native View
  Transitions API, not a library.
- **One source of truth** — design tokens live once in `tokens.css`; the model is reached only
  through `llm.js`; the catalogue only through `catalog.js`. Don't duplicate these.
- Mark deliberate shortcuts with a `// ponytail:` comment naming the ceiling and the upgrade
  path (there are a few already — grep for them).
- Non-trivial logic leaves one runnable check behind. `scripts/test.js` is that check; extend it
  rather than adding a framework.

## Design changes start in Figma

The look comes from the Figma file (see README). Extract tokens/assets from there; don't
hand-drift `tokens.css` and let it diverge from the design source of truth.
