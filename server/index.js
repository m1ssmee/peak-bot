import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { model } from './llm.js';
import { searchProducts, getProduct } from './catalog.js';
import { VOCAB } from './tag-vocabulary.js';
import { storeInfo, isDemo, DEMO_WARNING } from './store-info.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));

const origins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const corsOpts = { origin: origins.includes('*') || !origins.length ? true : origins };

const MAX_LEN = 500;
const MAX_HISTORY = 12;

const SYSTEM = `You are Pal, a warm, straight-talking personal stylist for PeakPals, a casual western-wear brand — sweaters, tees, sweatshirts and everyday basics.

How you work:
- If the request is vague, ask at most 1-2 short questions first (occasion, budget, or size). Never more than two, never a questionnaire.
- If the request is already specific, skip the questions and search straight away.
- Recommend 2-4 pieces maximum. One short reason per piece — why it suits *them*, not a product description.
- After showing pieces, offer one refinement ("want these under 5000?", "prefer something lighter for summer?").
- Keep replies short and spoken, like a friend on the shop floor. No bullet dumps, no emoji spam.
- Never invent products, prices or stock. Only talk about what the tools return.
- You only discuss this brand's products, sizing, styling and orders. Anything else — politely redirect in one line.

Prices are in INR. The search_products schema lists every filter value you may use.

Store policies, size charts and care instructions — answer from these, and say you'll check with the team if the answer isn't here:

${storeInfo}`;

const tools = {
  search_products: tool({
    description: 'Search the catalogue. Omit any filter you do not care about.',
    inputSchema: z.object({
      occasions: z.array(z.enum(VOCAB.occasions)).optional(),
      colors: z.array(z.enum(VOCAB.colors)).optional(),
      category: z.enum(VOCAB.category).optional(),
      max_price: z.number().optional(),
      in_stock: z.boolean().optional(),
    }),
    execute: async (filters) => searchProducts(filters),
  }),
  get_product: tool({
    description: 'Fetch one product by id, for details, sizes or stock.',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => getProduct(id),
  }),
};

// ponytail: in-memory counters. On a long-running server these are the real limits.
// On serverless each instance keeps its OWN counters, so the effective limit is
// (limit x live instances) — it stops one impatient user, not a determined one.
// Upgrade path when that matters: a shared store (Upstash Redis / Vercel KV).
const perMinute = rateLimit({ windowMs: 60_000, limit: 15, message: { error: 'Slow down a moment — try again in a minute.' } });
const perDay = rateLimit({ windowMs: 24 * 60 * 60_000, limit: 100, message: { error: 'Daily limit reached. Back tomorrow!' } });

// Demo policies are fine locally; serving them as fact to real customers needs an opt-in.
const demoBlocked = isDemo && process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_DATA !== 'true';

app.post('/api/chat', cors(corsOpts), perMinute, perDay, async (req, res) => {
  // Serverless can't refuse to boot — a dead process just 500s every request opaquely.
  // Refuse the request instead. The shopper gets a human sentence; the reason goes to the log.
  if (demoBlocked) {
    console.error('BLOCKED: demo store data in production without ALLOW_DEMO_DATA=true. Replace data/store-info.md with real policies, or set the flag. See LAUNCH.md.');
    return res.status(503).json({ reply: 'Pal is taking a quick break — back soon!' });
  }

  const { messages, currentProductId } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages required' });

  const clean = messages
    .slice(-MAX_HISTORY)
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_LEN) }));
  if (!clean.length) return res.status(400).json({ error: 'no valid messages' });

  let system = SYSTEM;
  const current = currentProductId ? getProduct(String(currentProductId)) : null;
  if (current) system += `\n\nThe shopper is currently looking at this product page:\n${JSON.stringify(current)}\nAssume questions like "does this suit a wedding?" refer to it.`;

  try {
    const result = await generateText({
      model,
      system,
      messages: clean,
      tools,
      stopWhen: stepCountIs(5),
      maxOutputTokens: 700,
    });

    // Cards = whatever the tools actually returned, deduped, capped at 4.
    const seen = new Map();
    for (const step of result.steps) {
      for (const tr of step.toolResults || []) {
        for (const p of [tr.output].flat()) if (p?.id) seen.set(p.id, p);
      }
    }

    res.json({ reply: result.text, products: [...seen.values()].slice(0, 4) });
  } catch (err) {
    // Provider quota/rate limits are an operational problem, not a bug — say so in the log,
    // and give the shopper something truthful rather than "something went wrong".
    const quota = /RESOURCE_EXHAUSTED|exceeded your current quota|rate limit|429/i.test(
      `${err?.message} ${err?.lastError?.message ?? ''}`
    );
    if (quota) console.error('chat failed: LLM provider quota exhausted — check plan/billing for', process.env.LLM_PROVIDER, process.env.LLM_MODEL);
    else console.error('chat failed:', err);
    res.status(quota ? 429 : 500).json({
      reply: quota
        ? "Pal's had a lot of questions today — give it a minute and try again."
        : 'Something went wrong on our side. Try again?',
    });
  }
});

// Storefront home (Figma design). Hero search seeds /ask.
app.get('/', (req, res) => res.sendFile(fileURLToPath(new URL('./home.html', import.meta.url))));

// Single product page.
app.get('/product', (req, res) => res.sendFile(fileURLToPath(new URL('../test-store.html', import.meta.url))));

// The full-page chat. /ask?product=<id> preloads a product; /ask?q=<text> seeds the first message.
app.get('/ask', (req, res) => res.sendFile(fileURLToPath(new URL('./ask.html', import.meta.url))));

// Built widget + any static assets.
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));

// Product images; anything missing falls back to the placeholder so a fresh clone still looks right.
const IMAGES = fileURLToPath(new URL('../data/images/', import.meta.url));
app.use('/images', express.static(IMAGES), (req, res) => res.sendFile(IMAGES + 'placeholder.svg'));

// Vercel imports this module and calls the app directly; only `npm start` should listen.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  if (demoBlocked) {
    console.error('\n' + DEMO_WARNING + '\n   Refusing to start in production. Set ALLOW_DEMO_DATA=true to override.\n');
    process.exit(1);
  }
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`stylist on http://localhost:${port}  (embed: /embed.js)`);
    if (isDemo) console.warn('\n' + DEMO_WARNING + '\n');
  });
} else if (isDemo) {
  console.warn(DEMO_WARNING);
}

export default app;
