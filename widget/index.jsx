// Embeddable widget: floating bubble + panel, mounted in a shadow root on a host page.
// The conversation itself lives in chat.jsx, shared with the /ask page.
import { render } from 'preact';
import { useState } from 'preact/hooks';
import { useChat, Messages, Composer, sharedCss, GREETING } from './chat.jsx';

const script = document.currentScript || document.querySelector('script[src*="embed.js"]');
const API = new URL(script.src).origin;
const PRODUCT_ID = script.getAttribute('data-product-id') || null;

// Design tokens are redeclared on :host because a shadow root can't see the page's
// tokens.css. Values match tokens.css. The @import pulls the brand fonts on the host page.
const shellCss = `
/* The widget renders in a shadow root on third-party pages, so it loads its own fonts.
   @font-face/@import always register at document level, so this reaches the shadow tree.
   Weights match what the widget actually uses: Playfair 400/500, Poppins 300/400/500. */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Poppins:wght@300;400;500&display=swap');
:host {
  all: initial;
  --c-bg: #ffffff; --c-text: #333333; --c-ink: #000000; --c-muted: #9f9f9f;
  --c-surface: #f7f7f7; --c-line: rgba(0,0,0,0.17); --c-search-border: #d4d4d4; --c-white: #ffffff;
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
* { box-sizing: border-box; font-family: var(--font-body); }
.bubble { position: fixed; right: 20px; bottom: 20px; width: 56px; height: 56px; border-radius: 50%;
  border: 0; cursor: pointer; background: var(--c-ink); color: var(--c-white); font-size: 24px; line-height: 1;
  box-shadow: 0 6px 20px rgba(0,0,0,.25); z-index: 2147483000; }
.panel { position: fixed; right: 20px; bottom: 88px; width: 360px; height: 560px; max-height: calc(100vh - 110px);
  background: var(--c-bg); border-radius: 6px; box-shadow: 0 12px 40px rgba(0,0,0,.22); display: flex;
  flex-direction: column; overflow: hidden; z-index: 2147483000; color: var(--c-text); }
.head { padding: 14px 16px; background: var(--c-ink); color: var(--c-white); display: flex; justify-content: space-between; align-items: center; }
.head h3 { margin: 0; font-family: var(--font-display); font-size: 17px; font-weight: 500; letter-spacing: .04em; }
.head small { opacity: .75; font-size: 11px; display: block; font-weight: 400; font-family: var(--font-body); }
.head button { background: none; border: 0; color: var(--c-white); font-size: 20px; cursor: pointer; line-height: 1; padding: 0 4px; }
.log { flex: 1; overflow-y: auto; padding: 14px; background: var(--c-bg); }
.foot { padding: 10px; border-top: 1px solid var(--c-line); background: var(--c-white); }
@media (max-width: 480px) {
  .panel { right: 0; bottom: 0; width: 100vw; height: 100dvh; max-height: none; border-radius: 0; }
}
` + sharedCss;

function App() {
  const [open, setOpen] = useState(false);
  const { turns, busy, send } = useChat({ api: API, productId: PRODUCT_ID });

  return (
    <div>
      {open && (
        <div class="panel" role="dialog" aria-label="Ask Pal">
          <div class="head">
            <h3>Pal<small>your personal stylist</small></h3>
            <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div class="log">
            {turns.length === 0 && <div class="pal-msg pal-bot">{GREETING}</div>}
            <Messages api={API} turns={turns} busy={busy} onChip={send} />
          </div>
          <div class="foot"><Composer busy={busy} onSend={send} /></div>
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
style.textContent = shellCss;
root.appendChild(style);
render(<App />, root);
