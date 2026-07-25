import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../data/products.json', import.meta.url));

// ponytail: re-read the file per call — the catalogue is tiny, and it means enrich.js
// writes show up without a restart. Swap for a cache if the catalogue ever gets big.
const all = () => JSON.parse(readFileSync(FILE, 'utf8'));

const has = (arr, wanted) => wanted.some((w) => (arr || []).includes(w));

/**
 * The ONLY read path into the catalogue.
 * @param {{occasions?:string[], colors?:string[], category?:string, max_price?:number, in_stock?:boolean}} filters
 */
export function searchProducts(filters = {}) {
  const { occasions, colors, category, max_price, in_stock } = filters;
  return all()
    .filter((p) => {
      const t = p.tags || {};
      if (occasions?.length && !has(t.occasions, occasions)) return false;
      if (colors?.length && !has(t.colors, colors)) return false;
      if (category && t.category !== category) return false;
      if (max_price != null && p.price > max_price) return false;
      if (in_stock && p.stock <= 0) return false;
      return true;
    })
    .slice(0, 8);
}

export function getProduct(id) {
  return all().find((p) => p.id === id) || null;
}
