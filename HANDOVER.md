# HANDOVER

Everything a new maintainer needs to take this over. Companion docs:
[README.md](README.md) (full detail), [CLAUDE.md](CLAUDE.md) (conventions), [LAUNCH.md](LAUNCH.md)
(pre-launch checklist).

- **Live:** https://peak-bot-beta.vercel.app  ·  **Repo:** github.com/m1ssmee/peak-bot (private)
- **Design:** Figma [Peakpals-Ai](https://www.figma.com/design/Ros5ui315aZPVUjAVQZCZd/Peakpals-Ai)

## Architecture (the whole thing in 15 lines)

- Node + Express, plain JS, ES modules. Preact widget built by Vite.
- **`server/index.js`** — Express app: page routes, `POST /api/chat`, rate limits, CORS, the
  demo-data tripwire. Calls `listen()` only when run directly (so Vercel can import it).
- **`api/index.js`** — re-exports that app as a Vercel serverless function; `vercel.json`
  rewrites every route to it. Prod and local run identical code.
- **`POST /api/chat`** runs the LLM with two read-only tools, `search_products` and
  `get_product`, capped at 700 output tokens, and returns `{ reply, products[] }`.
- **`server/llm.js`** — the only file that imports a provider SDK (Vercel AI SDK). Reads
  `LLM_PROVIDER` / `LLM_MODEL` from env and returns a model instance.
- **`server/catalog.js`** — the only door to the catalogue (`searchProducts`, `getProduct`),
  reading `data/products.json`. Reserved slot for a Shopify adapter.
- **`server/store-info.js`** — loads `data/store-info.md`, strips the demo banner, exports the
  tripwire (`isDemo`).
- **Frontend:** `home.html` (`/`), `test-store.html` (`/product`), `ask.html` + `ask.js` (`/ask`),
  `embed.js` (widget). Shared chat logic in `widget/chat.jsx`; design tokens in
  `server/public/tokens.css`.

## Run it locally

```bash
npm install
cp .env.example .env        # fill in the values below
npm run build               # builds server/public/{embed.js,ask.js}
npm start                   # http://localhost:3000
node scripts/test.js        # catalogue + vocabulary self-check
```

Edited anything in `widget/`? Re-run `npm run build`. `npm run dev` only restarts the server.

## Environment variables — and where each lives

Set in **local `.env`** (gitignored, copy from `.env.example`) AND in **Vercel → Project →
Settings → Environment Variables** (Production). They are independent — changing one does not
change the other.

| Var | Local `.env` | Vercel | Notes |
|---|---|---|---|
| `LLM_PROVIDER` | `google` | `google` | `anthropic` \| `openai` \| `google` |
| `LLM_MODEL` | `gemini-3.5-flash` | `gemini-3.5-flash` | provider-specific model id |
| `GOOGLE_GENERATIVE_AI_API_KEY` | your key | set (sensitive) | or `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` to match the provider |
| `ALLOW_DEMO_DATA` | `true` (to run demo) | `true` | override for the demo-data tripwire; remove once `store-info.md` is real |
| `CORS_ORIGINS` | `http://localhost:3000,...` | `https://peak-bot-beta.vercel.app` | comma-separated allowlist for `/api/*` |
| `NODE_ENV` | unset (dev) | `production` (Vercel sets it) | **don't set on Vercel by hand** |
| `PORT` | optional, `3000` | **do not set** | Vercel injects it |

After changing a Vercel env var you must **redeploy** for it to take effect (Deployments → ⋯ →
Redeploy), or just push a commit.

## Deploy flow

**Push to `main` → Vercel auto-builds and redeploys.** That's it. Build command is `npm run
build`; the function bundles `data/**`, `server/home.html`, `server/ask.html`, `test-store.html`
via `vercel.json`'s `includeFiles`. Commit authors must use a GitHub-verified email or Vercel's
Hobby plan rejects the deploy as "collaboration".

## Add + enrich a product

1. Append an entry to `data/products.json` with `tags: null` and **real** price/sizes/stock
   (facts come from the owner — see [CLAUDE.md](CLAUDE.md)).
2. Drop photos in `data/images/` matching the `images` paths (prefix ids: `swt-`/`tsh-`/`tnk-`).
3. `npm run enrich` — tags every untagged product from its photos + description, using the fixed
   vocabulary in `tag-vocabulary.js`. Re-run whenever you rewrite a description.
4. `node scripts/test.js` to confirm tags are in-vocabulary; commit; push.

## OPEN ITEMS

Blocking / launch-critical (full detail in [LAUNCH.md](LAUNCH.md)):

- [ ] **Provider billing** — Google free tier is ~20 req/day; the live store goes quiet almost
      immediately. Enable billing or switch provider. **This is the top blocker.**
- [ ] **Demo data is live** — `store-info.md` still has the `DEMO-DATA` banner; returns/shipping/
      sizes/contact are invented and `ALLOW_DEMO_DATA=true` is letting them through. Replace with
      real policies and remove the flag.
- [ ] **Verify every price/size/stock** in `products.json` against a real system; stock is static
      and never decrements.
- [ ] **`CORS_ORIGINS`** = the real storefront domain in prod (currently the vercel.app URL).
- [ ] **Provider spend cap** enabled in the provider console (the real ceiling on serverless).
- [ ] **Rate limits** are per-instance in memory — move to Upstash Redis / Vercel KV before
      public launch, or accept the spend cap as the limit.
- [ ] **Add-to-cart is a no-op** — `widget/chat.jsx` only `console.log`s; on `/ask` nothing sets
      `window.AIStylist.onAddToCart`. Wire it to a real cart or drop the button.
- [ ] **Product URLs 404** — cards link to `/products/<slug>`, which don't exist. Build those
      pages or change the link target.
- [ ] **Product descriptions** are drafts from photos, not brand copy. Rewriting them means
      re-running `npm run enrich` (descriptions feed enrichment).
- [ ] **Re-run the query gauntlet** against the final prompt/persona/`store-info.md` wording.

Known-good / not blocking:

- Persona rename **Meera → Pal is complete** (swept; no "Meera" remains anywhere).
- The `embed.js` widget is intentionally unused by the store — kept as a future second door
  (see README). It still builds and works.
- The homepage→/ask morph uses the native View Transitions API; browsers without it get a plain
  fast navigation (progressive enhancement, not a bug).
