# Pre-launch checklist

Nothing here is optional. Every unchecked box is something a real customer can be told wrongly.

- [ ] **`data/store-info.md` contains real policies** — the `DEMO-DATA — replace before launch`
      banner is deleted. While that line exists, returns windows, shipping fees, size charts and
      the WhatsApp number are invented, and Pal states them to customers as fact. The server
      and `scripts/test.js` both warn on every run until it's gone.

- [ ] **Every price, size and stock value in `data/products.json` verified against the real
      system.** Current values came from a chat message, not an inventory feed. Stock is a static
      number — it does not decrement on sale, so a sold-out item will keep being recommended
      until someone edits the file.

- [ ] **Product descriptions in the brand's own voice.** The persona name "Pal" is settled, but
      all five product descriptions are still drafts written from photographs, not brand copy.
      Descriptions also feed enrichment, so rewriting them means re-running `npm run enrich`.

- [ ] **`CORS_ORIGINS` set to the real storefront domain** in the production `.env`. The current
      value is localhost only; an empty or `*` value lets any site call the API on your budget.

- [ ] **Spend cap enabled at the provider.** Chat is unmetered per conversation beyond the rate
      limits (15/min, 100/day per IP) — those cap requests, not tokens. Set a hard monthly cap in
      the Google AI Studio / Anthropic / OpenAI console for whichever provider `.env` points at.
      **On serverless this is the only real ceiling** — see the next box.

- [ ] **Rate limits moved to a shared store.** `express-rate-limit` counts in memory. On Vercel
      every warm instance keeps its own counters, so "100/day per IP" is really "100/day per IP
      *per instance*", and Vercel scales instances out under load. A determined caller gets past
      it. Swap `MemoryStore` for Upstash Redis / Vercel KV before this is public, or accept that
      the provider spend cap is your actual limit.

- [ ] **Widget console fallback removed** — [widget/index.jsx:70](widget/index.jsx#L70) logs to
      `console.log` when the host page hasn't set `window.AIStylist.onAddToCart`. Kept
      deliberately for demo. On a live store, add-to-cart must be wired to the real cart or the
      button silently does nothing.

- [ ] **50-query gauntlet re-run after the final prompt edits.** Any change to the system prompt,
      the persona, or `store-info.md` changes behaviour across the board — including refusals and
      off-topic redirects. Re-run it against the final wording, not an earlier draft.

## Also worth checking

- `.env` is gitignored and the production key is not the one used in development.
- The API key is server-side only — confirm it never appears in `server/public/embed.js`.
- Decide what happens when the LLM provider is down. Right now `/api/chat` returns a 500 and the
  widget shows "I couldn't reach the shop just now".
