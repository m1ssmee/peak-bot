import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
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

const perMinute = rateLimit({ windowMs: 60_000, limit: 15, message: { error: 'Slow down a moment — try again in a minute.' } });
const perDay = rateLimit({ windowMs: 24 * 60 * 60_000, limit: 100, message: { error: 'Daily limit reached. Back tomorrow!' } });

app.post('/api/chat', cors(corsOpts), perMinute, perDay, async (req, res) => {
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
    console.error('chat failed:', err);
    res.status(500).json({ error: 'Something went wrong on our side. Try again?' });
  }
});

// Built widget + any static assets.
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));

// Product images; anything missing falls back to the placeholder so a fresh clone still looks right.
const IMAGES = fileURLToPath(new URL('../data/images/', import.meta.url));
app.use('/images', express.static(IMAGES), (req, res) => res.sendFile(IMAGES + 'placeholder.svg'));

// Demo policies are fine locally; shipping them to real customers needs an explicit opt-in.
if (isDemo && process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_DATA !== 'true') {
  console.error('\n' + DEMO_WARNING + '\n   Refusing to start in production. Set ALLOW_DEMO_DATA=true to override.\n');
  process.exit(1);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`stylist on http://localhost:${port}  (embed: /embed.js)`);
  if (isDemo) console.warn('\n' + DEMO_WARNING + '\n');
});
