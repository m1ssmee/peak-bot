import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BANNER = 'DEMO-DATA — replace before launch';
const raw = readFileSync(fileURLToPath(new URL('../data/store-info.md', import.meta.url)), 'utf8');

// The banner never reaches the model — it would just confuse Pal about what's real.
// It stays in the file as the signal that these policies are invented.
export const isDemo = raw.startsWith(BANNER);
export const storeInfo = isDemo ? raw.slice(BANNER.length).trimStart() : raw;
export const DEMO_WARNING =
  `⚠️  data/store-info.md still carries the "${BANNER}" banner.\n` +
  '   Returns, shipping, sizes and contact details are INVENTED. Pal will quote them as fact.\n' +
  '   Replace with real policies before launch — see LAUNCH.md.';
