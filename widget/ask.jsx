// The /ask section: full-page chat below the shared store header in ask.html.
// Same conversation logic as the embeddable widget — see chat.jsx.
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { useChat, Messages, Composer, sharedCss, STARTERS } from './chat.jsx';

const params = new URLSearchParams(location.search);
const PRODUCT_ID = params.get('product');
const SEED = (params.get('q') || '').trim(); // from the home hero search

const pageCss = `
html { height: 100%; }
/* header stays put, the chat fills the rest */
body { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: var(--c-bg); }
.store-header { flex: none; border-bottom: 1px solid var(--c-line); }
#app { flex: 1; min-height: 0; display: flex; flex-direction: column; }

.scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.col { max-width: 760px; margin: 0 auto; padding: 32px 24px 8px; }

.hero { padding: 6vh 0 0; }
.hero h2 { margin: 0 0 10px; font-family: var(--font-display); font-weight: 400; font-size: 40px; line-height: 1.2; color: var(--c-text); }
.hero p { margin: 0 0 26px; color: var(--c-muted); font-size: 17px; line-height: 1.6; }
.starters { display: flex; flex-direction: column; gap: 10px; }
.starters button { text-align: left; padding: 16px 18px; border: 1px solid var(--c-search-border); background: var(--c-white);
  color: var(--c-text); font-size: 16px; line-height: 1.4; cursor: pointer; font-family: var(--font-body); transition: border-color .15s; }
.starters button:hover { border-color: var(--c-ink); }

.ctx { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 20px; padding: 7px 15px 7px 7px;
  background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 999px; font-size: 13px; color: var(--c-text); font-family: var(--font-body); }
.ctx img { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }

.bottom { flex: none; border-top: 1px solid var(--c-line); background: var(--c-white); padding-bottom: env(safe-area-inset-bottom); }
.bottom-in { max-width: 760px; margin: 0 auto; padding: 14px 24px; }
.note { max-width: 760px; margin: 0 auto; padding: 0 24px 12px; font-size: 11px; color: var(--c-muted); text-align: center; font-family: var(--font-body); }

@media (max-width: 560px) {
  .col { padding: 22px 16px 8px; }
  .bottom-in { padding-left: 16px; padding-right: 16px; }
  .hero { padding-top: 3vh; }
  .hero h2 { font-size: 28px; }
}

/* Arrival: each message slides up as it's sent; the typing indicator fades in
   just after, so a seeded query reads as "message sent → Pal starts typing". */
@media (prefers-reduced-motion: no-preference) {
  .pal-msg { animation: pal-msg-in .32s cubic-bezier(.2, .7, .2, 1) both; }
  .pal-dots { animation: pal-fade-in .3s ease .14s both; }
  .hero { animation: pal-fade-in .3s ease both; }
}
@media (prefers-reduced-motion: reduce) {
  .pal-msg { animation: pal-fade-in .18s ease both; }
}
@keyframes pal-msg-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes pal-fade-in { from { opacity: 0; } to { opacity: 1; } }
` + sharedCss;

function Ask() {
  const { turns, busy, send } = useChat({ productId: PRODUCT_ID });
  const seeded = useRef(false);

  // A query handed over from the home hero search becomes the first message.
  useEffect(() => {
    if (SEED && !seeded.current) { seeded.current = true; send(SEED); }
  }, []);

  const empty = turns.length === 0;

  return (
    <>
      <div class="scroll">
        <div class="col">
          {PRODUCT_ID && (
            <div class="ctx">
              <img src={`/images/${PRODUCT_ID}.jpeg`} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              Asking about this item
            </div>
          )}

          {empty ? (
            <div class="hero">
              <h2>What are you looking for?</h2>
              <p>Tell me an occasion, a colour or a budget and I'll pull a few pieces.</p>
              <div class="starters">
                {STARTERS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
              </div>
            </div>
          ) : (
            <Messages turns={turns} busy={busy} onChip={send} />
          )}
        </div>
      </div>

      <div class="bottom">
        <div class="bottom-in"><Composer busy={busy} onSend={send} placeholder="Ask Pal anything…" /></div>
        <div class="note">Pal only knows PeakPals products, sizing and orders.</div>
      </div>
    </>
  );
}

const style = document.createElement('style');
style.textContent = pageCss;
document.head.appendChild(style);
render(<Ask />, document.getElementById('app'));
