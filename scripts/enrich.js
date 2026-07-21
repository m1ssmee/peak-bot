import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import { generateObject } from 'ai';
import { model } from '../server/llm.js';
import { VOCAB, MULTI } from '../server/tag-vocabulary.js';

const FILE = fileURLToPath(new URL('../data/products.json', import.meta.url));
const IMAGES = fileURLToPath(new URL('../data/images/', import.meta.url));

// The vocabulary IS the schema — the model physically cannot return an off-list value.
const schema = z.object(
  Object.fromEntries(
    Object.entries(VOCAB).map(([k, values]) => [k, MULTI.includes(k) ? z.array(z.enum(values)).min(1) : z.enum(values)])
  )
);

// ponytail: rough $/million tokens for the log line only. Edit here if your provider differs.
const IN = 3;
const OUT = 15;

async function shrink(webPath) {
  const file = IMAGES + webPath.split('/').pop();
  if (!existsSync(file)) return null;
  return sharp(file).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}

const products = JSON.parse(readFileSync(FILE, 'utf8'));
const todo = products.filter((p) => !p.tags);
console.log(`${todo.length} of ${products.length} products need tags — using ${process.env.LLM_PROVIDER}/${process.env.LLM_MODEL}`);

let cost = 0;
for (const [i, p] of todo.entries()) {
  const images = (await Promise.all((p.images || []).slice(0, 2).map(shrink))).filter(Boolean);

  const { object, usage } = await generateObject({
    model,
    schema,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Tag this casual western-wear product for a styling assistant. Judge from the photos where they disagree with the copy.\n\nName: ${p.name}\nDescription: ${p.description}\nPrice: INR ${p.price}` },
          ...images.map((image) => ({ type: 'image', image })),
        ],
      },
    ],
  });

  p.tags = object;
  writeFileSync(FILE, JSON.stringify(products, null, 2) + '\n'); // save as we go — a crash loses one product, not the run
  cost += ((usage.inputTokens || 0) * IN + (usage.outputTokens || 0) * OUT) / 1e6;
  console.log(`[${i + 1}/${todo.length}] ${p.id} ${p.name} — ${images.length} image(s), ${object.category}/${object.occasions.join('+')} — running est. $${cost.toFixed(4)}`);
}

console.log(todo.length ? `done. estimated cost $${cost.toFixed(4)}` : 'nothing to do.');
