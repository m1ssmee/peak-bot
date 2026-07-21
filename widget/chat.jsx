// Everything the /ask page and the embeddable widget have in common: conversation
// state, the fetch, product cards, message rendering, composer, and their styles.
// The two entry points differ only in shell and how they mount.
import { useState, useRef, useEffect } from 'preact/hooks';

export const GREETING = "Hi, I'm Pal. Tell me what you're after — an occasion, a colour, a budget — and I'll pull a few pieces.";
export const STARTERS = [
  'Something warm for college',
  'Help me find my size',
  'What goes with a charcoal sweater?',
  'Show me something under ₹1,000',
];
export const CHIPS = ['Something warmer', 'More oversized', 'Show me tees'];

export const inr = (n) => (n == null ? '—' : '₹' + n.toLocaleString('en-IN'));

const MAX_LEN = 500;
const MAX_HISTORY = 12;

/** Conversation state + the one network call. `api` is '' for same-origin pages. */
export function useChat({ api = '', productId = null } = {}) {
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);

  async function send(content) {
    if (!content.trim() || busy) return;
    const next = [...turns, { role: 'user', content: content.slice(0, MAX_LEN), products: [] }];
    setTurns(next);
    setBusy(true);
    try {
      const r = await fetch(api + '/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content })),
          currentProductId: productId,
        }),
      });
      const data = await r.json();
      setTurns([...next, { role: 'assistant', content: data.reply || data.error || 'Sorry, try that again?', products: data.products || [] }]);
    } catch {
      setTurns([...next, { role: 'assistant', content: "I couldn't reach the shop just now — try again in a moment.", products: [] }]);
    }
    setBusy(false);
  }

  return { turns, busy, send };
}

export function Card({ api = '', p }) {
  const oos = p.stock <= 0;
  return (
    <div class="pal-card">
      <img src={api + p.images[0]} alt={p.name} loading="lazy" />
      <div class="pal-card-info">
        <div class="pal-card-name">{p.name}</div>
        <div class="pal-card-price">{inr(p.price)}</div>
        {oos && <div class="pal-card-oos">Out of stock</div>}
        <div class="pal-card-acts">
          <a href={p.url} target="_blank" rel="noopener">View</a>
          <button
            class="pal-primary"
            disabled={oos}
            onClick={() => (window.AIStylist?.onAddToCart || ((x) => console.log('add to cart', x)))(p)}
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}

/** Message history. Auto-scrolls to the newest message. */
export function Messages({ api = '', turns, busy, onChip }) {
  const endRef = useRef();
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [turns, busy]);

  const last = turns[turns.length - 1];
  const showChips = !busy && last?.role === 'assistant' && last.products?.length > 0;

  return (
    <>
      {turns.map((t, i) => (
        <div key={i}>
          <div class={'pal-msg ' + (t.role === 'user' ? 'pal-user' : 'pal-bot')}>{t.content}</div>
          {t.products?.length > 0 && (
            <div class="pal-cards">{t.products.map((p) => <Card key={p.id} api={api} p={p} />)}</div>
          )}
        </div>
      ))}
      {busy && <div class="pal-dots">Pal is looking…</div>}
      {showChips && (
        <div class="pal-chips">{CHIPS.map((c) => <button key={c} onClick={() => onChip(c)}>{c}</button>)}</div>
      )}
      <div ref={endRef} />
    </>
  );
}

export function Composer({ busy, onSend, placeholder = "What's the occasion?" }) {
  const [text, setText] = useState('');
  return (
    <form
      class="pal-form"
      onSubmit={(e) => { e.preventDefault(); onSend(text); setText(''); }}
    >
      <input
        value={text}
        maxLength={MAX_LEN}
        placeholder={placeholder}
        aria-label="Message"
        onInput={(e) => setText(e.currentTarget.value)}
      />
      <button disabled={busy || !text.trim()} aria-label="Send">Send</button>
    </form>
  );
}

// Styles for the shared pieces. Each shell adds its own layout on top.
// Prefixed so they stay inert if a host page ever loads them outside a shadow root.
export const sharedCss = `
.pal-msg { max-width: 85%; padding: 10px 13px; border-radius: 14px; font-size: 15px; line-height: 1.5;
  white-space: pre-wrap; margin-bottom: 10px; }
.pal-user { margin-left: auto; background: #7a2f3a; color: #fff; border-bottom-right-radius: 4px; }
.pal-bot { margin-right: auto; background: #fff; border: 1px solid #ece5de; border-bottom-left-radius: 4px; }
.pal-cards { display: flex; flex-direction: column; gap: 8px; margin: 0 0 12px; }
.pal-card { display: flex; gap: 12px; background: #fff; border: 1px solid #ece5de; border-radius: 12px; padding: 10px; }
.pal-card img { width: 72px; height: 94px; object-fit: cover; border-radius: 8px; background: #efe7dd; flex: none; }
.pal-card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.pal-card-name { font-size: 14px; font-weight: 600; line-height: 1.3; }
.pal-card-price { font-size: 14px; color: #555; }
.pal-card-oos { font-size: 12px; color: #a33; }
.pal-card-acts { display: flex; gap: 8px; margin-top: auto; padding-top: 6px; }
.pal-card-acts a, .pal-card-acts button { font-size: 12px; padding: 7px 12px; border-radius: 8px; cursor: pointer;
  border: 1px solid #7a2f3a; background: #fff; color: #7a2f3a; text-decoration: none; font-weight: 600;
  font-family: inherit; }
.pal-card-acts button.pal-primary { background: #7a2f3a; color: #fff; }
.pal-card-acts button[disabled] { opacity: .45; cursor: not-allowed; }
.pal-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.pal-chips button { font-size: 13px; padding: 8px 14px; border-radius: 999px; border: 1px solid #d9cfc5;
  background: #fff; color: #7a2f3a; cursor: pointer; font-family: inherit; }
.pal-chips button:active { background: #f3ece6; }
.pal-dots { color: #999; font-size: 14px; padding: 4px 2px 12px; }
.pal-form { display: flex; gap: 8px; }
.pal-form input { flex: 1; border: 1px solid #ddd; border-radius: 10px; padding: 12px 14px; font-size: 16px;
  outline: none; min-width: 0; font-family: inherit; background: #fff; color: #222; }
.pal-form input:focus { border-color: #7a2f3a; }
.pal-form button { border: 0; background: #7a2f3a; color: #fff; border-radius: 10px; padding: 0 18px;
  cursor: pointer; font-size: 15px; font-weight: 600; font-family: inherit; }
.pal-form button[disabled] { opacity: .5; }
`;
