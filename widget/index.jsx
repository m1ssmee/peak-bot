import { render } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

const script = document.currentScript || document.querySelector('script[src*="embed.js"]');
const API = new URL(script.src).origin;
const PRODUCT_ID = script.getAttribute('data-product-id') || null;

const CHIPS = ['Something warmer', 'More oversized', 'Show me tees'];
const inr = (n) => (n == null ? '—' : '₹' + n.toLocaleString('en-IN')); // price is null until the catalogue is filled in

const css = `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.bubble { position: fixed; right: 20px; bottom: 20px; width: 56px; height: 56px; border-radius: 50%;
  border: 0; cursor: pointer; background: #7a2f3a; color: #fff; font-size: 24px; line-height: 1;
  box-shadow: 0 6px 20px rgba(0,0,0,.25); z-index: 2147483000; }
.bubble:hover { background: #642530; }
.panel { position: fixed; right: 20px; bottom: 88px; width: 360px; height: 560px; max-height: calc(100vh - 110px);
  background: #fff; border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.22); display: flex; flex-direction: column;
  overflow: hidden; z-index: 2147483000; color: #222; }
.head { padding: 14px 16px; background: #7a2f3a; color: #fff; display: flex; justify-content: space-between; align-items: center; }
.head h3 { margin: 0; font-size: 15px; font-weight: 600; }
.head small { opacity: .8; font-size: 11px; display: block; font-weight: 400; }
.head button { background: none; border: 0; color: #fff; font-size: 20px; cursor: pointer; line-height: 1; padding: 0 4px; }
.log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #faf7f4; }
.msg { max-width: 85%; padding: 9px 12px; border-radius: 12px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; }
.msg.user { align-self: flex-end; background: #7a2f3a; color: #fff; border-bottom-right-radius: 3px; }
.msg.bot { align-self: flex-start; background: #fff; border: 1px solid #eee; border-bottom-left-radius: 3px; }
.cards { display: flex; flex-direction: column; gap: 8px; }
.card { display: flex; gap: 10px; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 8px; }
.card img { width: 64px; height: 84px; object-fit: cover; border-radius: 6px; background: #efe7dd; flex: none; }
.card .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.card .name { font-size: 13px; font-weight: 600; line-height: 1.3; }
.card .price { font-size: 13px; color: #555; }
.card .oos { font-size: 11px; color: #a33; }
.card .acts { display: flex; gap: 6px; margin-top: auto; }
.card a, .card button { font-size: 11px; padding: 5px 9px; border-radius: 6px; cursor: pointer; border: 1px solid #7a2f3a;
  background: #fff; color: #7a2f3a; text-decoration: none; font-weight: 600; }
.card button.primary { background: #7a2f3a; color: #fff; }
.card button[disabled] { opacity: .45; cursor: not-allowed; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips button { font-size: 12px; padding: 6px 10px; border-radius: 999px; border: 1px solid #d9cfc5;
  background: #fff; color: #7a2f3a; cursor: pointer; }
.chips button:hover { background: #f3ece6; }
.form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #eee; background: #fff; }
.form input { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 9px 11px; font-size: 14px; outline: none; min-width: 0; }
.form input:focus { border-color: #7a2f3a; }
.form button { border: 0; background: #7a2f3a; color: #fff; border-radius: 8px; padding: 0 14px; cursor: pointer; font-size: 14px; }
.form button[disabled] { opacity: .5; }
.dots { align-self: flex-start; color: #999; font-size: 13px; padding: 4px 2px; }
@media (max-width: 480px) {
  .panel { right: 0; bottom: 0; width: 100vw; height: 100vh; max-height: none; border-radius: 0; }
}
`;

function Card({ p }) {
  const oos = p.stock <= 0;
  return (
    <div class="card">
      <img src={API + p.images[0]} alt={p.name} />
      <div class="info">
        <div class="name">{p.name}</div>
        <div class="price">{inr(p.price)}</div>
        {oos && <div class="oos">Out of stock</div>}
        <div class="acts">
          <a href={p.url} target="_blank" rel="noopener">View</a>
          <button
            class="primary"
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

function App() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [turns, setTurns] = useState([
    { role: 'assistant', content: "Hi, I'm Pal. Tell me what you're after — an occasion, a colour, a budget — and I'll pull a few pieces.", products: [] },
  ]);
  const logRef = useRef();

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [turns, busy, open]);

  async function send(content) {
    if (!content.trim() || busy) return;
    const next = [...turns, { role: 'user', content: content.slice(0, 500), products: [] }];
    setTurns(next);
    setText('');
    setBusy(true);
    try {
      const r = await fetch(API + '/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(-12).map(({ role, content }) => ({ role, content })),
          currentProductId: PRODUCT_ID,
        }),
      });
      const data = await r.json();
      setTurns([...next, { role: 'assistant', content: data.reply || data.error || 'Sorry, try that again?', products: data.products || [] }]);
    } catch {
      setTurns([...next, { role: 'assistant', content: "I couldn't reach the shop just now — try again in a moment.", products: [] }]);
    }
    setBusy(false);
  }

  const last = turns[turns.length - 1];
  const showChips = !busy && last.role === 'assistant' && last.products?.length > 0;

  return (
    <div>
      {open && (
        <div class="panel" role="dialog" aria-label="AI stylist chat">
          <div class="head">
            <h3>Pal<small>your personal stylist</small></h3>
            <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div class="log" ref={logRef}>
            {turns.map((t, i) => (
              <>
                <div key={i} class={'msg ' + (t.role === 'user' ? 'user' : 'bot')}>{t.content}</div>
                {t.products?.length > 0 && (
                  <div class="cards">{t.products.map((p) => <Card key={p.id} p={p} />)}</div>
                )}
              </>
            ))}
            {busy && <div class="dots">Pal is looking…</div>}
            {showChips && (
              <div class="chips">{CHIPS.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div>
            )}
          </div>
          <form class="form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input
              value={text}
              maxLength={500}
              placeholder="What's the occasion?"
              aria-label="Message"
              onInput={(e) => setText(e.currentTarget.value)}
            />
            <button disabled={busy || !text.trim()}>Send</button>
          </form>
        </div>
      )}
      <button class="bubble" onClick={() => setOpen(!open)} aria-label="Chat with a stylist">{open ? '×' : '✦'}</button>
    </div>
  );
}

// Shadow DOM: the host site's CSS can't reach in, ours can't leak out.
const host = document.createElement('div');
document.body.appendChild(host);
const root = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = css;
root.appendChild(style);
render(<App />, root);
