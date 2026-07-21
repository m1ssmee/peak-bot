// The /ask section: full-page chat living *below* the shared store header in ask.html.
// Same conversation logic as the embeddable widget — see chat.jsx.
import { render } from 'preact';
import { useChat, Messages, Composer, sharedCss, STARTERS } from './chat.jsx';

// Same origin, so the API needs no prefix.
const PRODUCT_ID = new URLSearchParams(location.search).get('product');

const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const pageCss = `
* { box-sizing: border-box; }
html { height: 100%; }
/* header stays put, the chat fills whatever is left */
body { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: #faf7f4; }
.store-header { flex: none; }
#app { flex: 1; min-height: 0; display: flex; flex-direction: column; }

.scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.col { max-width: 720px; margin: 0 auto; padding: 28px 20px 8px; }

.hero { padding: 4vh 0 0; }
.hero h2 { margin: 0 0 8px; font-size: 28px; font-weight: normal; line-height: 1.25; }
.hero p { margin: 0 0 24px; color: #6b6b6b; font-size: 16px; line-height: 1.6; }
.starters { display: flex; flex-direction: column; gap: 10px; }
.starters button { text-align: left; padding: 15px 18px; border: 1px solid #e4dad0; background: #fff;
  color: #1d1d1d; font-size: 16px; line-height: 1.4; cursor: pointer; font-family: inherit; }
.starters button:hover { border-color: #7a2f3a; }

.ctx { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 20px; padding: 7px 14px 7px 7px;
  background: #fff; border: 1px solid #ece5de; border-radius: 999px; font-size: 13px; color: #6b6b6b;
  font-family: ${UI_FONT}; }
.ctx img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }

.bottom { flex: none; border-top: 1px solid #ece5de; background: #fff; padding-bottom: env(safe-area-inset-bottom); }
.bottom-in { max-width: 720px; margin: 0 auto; padding: 12px 20px; }
.note { max-width: 720px; margin: 0 auto; padding: 0 20px 10px; font-size: 11px; color: #a99; text-align: center;
  font-family: ${UI_FONT}; }

/* Messages inherit the store's serif; controls match the store's sans-serif nav and buttons. */
.pal-chips button, .pal-form input, .pal-form button,
.pal-card-acts a, .pal-card-acts button { font-family: ${UI_FONT}; }

@media (max-width: 560px) {
  .col { padding: 20px 16px 8px; }
  .bottom-in { padding-left: 16px; padding-right: 16px; }
  .hero { padding-top: 2vh; }
  .hero h2 { font-size: 23px; }
  .hero p { font-size: 15px; }
}
` + sharedCss;

function Ask() {
  const { turns, busy, send } = useChat({ productId: PRODUCT_ID });
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
