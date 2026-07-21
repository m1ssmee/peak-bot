// node scripts/test.js — the smallest thing that fails if catalogue filtering or the tag vocab breaks.
import assert from 'node:assert/strict';
import { searchProducts, getProduct } from '../server/catalog.js';
import { VOCAB, MULTI } from '../server/tag-vocabulary.js';
import { storeInfo, isDemo, DEMO_WARNING } from '../server/store-info.js';

assert.equal(getProduct('swt-001').name, 'PP Monogram Knit Sweater — Charcoal');
assert.equal(getProduct('nope'), null);

const all = searchProducts();
assert.equal(all.length, 5);
assert.ok(all.every((p) => p.images.length > 0 && p.id && p.url));

// every filter returns only matching products, and never crashes on an untagged one
const tagged = all.filter((p) => p.tags);
assert.equal(searchProducts({ category: 'sweater' }).length, 3);
assert.ok(searchProducts({ category: 'sweater' }).every((p) => p.tags.category === 'sweater'));
assert.ok(searchProducts({ occasions: ['lounge'] }).every((p) => p.tags.occasions.includes('lounge')));
assert.ok(searchProducts({ colors: ['black'] }).every((p) => p.tags.colors.includes('black')));
assert.ok(searchProducts({ in_stock: true }).every((p) => p.stock > 0));
assert.ok(searchProducts({ max_price: 1000 }).every((p) => p.price <= 1000));
assert.equal(searchProducts({ category: 'jeans' }).length, 0); // nothing in the catalogue matches
assert.equal(searchProducts({ category: 'sweater', max_price: 500 }).length, 0);

// every tag already in the catalogue is in-vocabulary
for (const p of tagged) {
  for (const [k, v] of Object.entries(p.tags)) {
    for (const val of [v].flat()) assert.ok(VOCAB[k]?.includes(val), `${p.id}: ${k}="${val}" not in vocabulary`);
    assert.equal(Array.isArray(v), MULTI.includes(k), `${p.id}: ${k} arity`);
  }
}

// vocabulary itself stays well-formed
assert.ok(MULTI.every((k) => k in VOCAB));
assert.ok(Object.values(VOCAB).every((list) => list.length && new Set(list).size === list.length));

// the banner is stripped before the prompt ever sees it
assert.ok(!storeInfo.includes('DEMO-DATA'), 'demo banner leaked into the prompt text');
assert.ok(storeInfo.startsWith('# Returns'), 'store-info.md lost its first section to the strip');

console.log(`ok — ${all.length} products, ${tagged.length} tagged`);
if (isDemo) console.warn('\n' + DEMO_WARNING + '\n');
