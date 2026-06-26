/* Alex — floating AI companion widget (real streaming backend).
   Self-contained: include <script src=".../assets/alex-widget.js"></script> once per page.
   Talks about all precious metals (gold, silver, platinum, palladium), in Bulgarian. */
(function () {
  if (window.__alexWidget) return;
  window.__alexWidget = true;

  var ENDPOINT = 'https://alex-finance.onrender.com/api/ask-alex/stream';
  // No hardcoded portfolio — the visitor hasn't entered positions, so we must not
  // claim they hold anything. Only topic focus + tone are set here.
  var PROFILE = {
    focus: 'precious_metals',
    notes: 'Темата е благородни метали. Фокусирай отговорите върху злато, сребро, платина и паладий — реални лихви, DXY, инфлация, покупки на централни банки, индустриално търсене (соларни панели, електроника, автокатализатори) и геополитическа премия. ВАЖНО: не разполагаш с портфейла на потребителя — НЕ предполагай и НЕ твърди, че той държи конкретни позиции (злато, GLD и т.н.), освен ако сам не ти ги каже в разговора. Отговаряй на български. Обяснявай и образовай, но не давай персонализирани инвестиционни съвети.'
  };

  var html =
    '<button id="alex-toggle" aria-label="Отвори Alex" style="position:fixed;bottom:22px;right:22px;z-index:99999;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#e7cd8a,#d9b25a);box-shadow:0 6px 22px rgba(217,178,90,.45);font-size:23px;display:flex;align-items:center;justify-content:center;transition:transform .2s">💬</button>' +
    '<div id="alex-panel" style="display:none;position:fixed;bottom:88px;right:22px;z-index:99998;width:370px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 120px);border-radius:16px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.5);background:#0d0f13;border:1px solid rgba(217,178,90,.28);flex-direction:column">' +
      '<div style="padding:14px 16px;background:rgba(217,178,90,.07);border-bottom:1px solid rgba(217,178,90,.16);display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#e7cd8a,#d9b25a);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#1a1408">A</div>' +
          '<div><div style="font-size:13.5px;font-weight:700;color:#e8d5a3">Alex</div><div style="font-size:10.5px;color:rgba(217,178,90,.65)">Метали &amp; пазари · AI компаньон</div></div>' +
        '</div>' +
        '<button id="alex-close" aria-label="Затвори" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:4px">✕</button>' +
      '</div>' +
      '<div id="alex-feed" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px">' +
        '<div style="background:rgba(217,178,90,.06);border:1px solid rgba(217,178,90,.13);border-radius:12px;padding:12px 14px;font-size:12.5px;color:rgba(232,213,163,.92);line-height:1.55">Здравей, аз съм <b>Alex</b>. Питай ме за <b>златото, среброто, платината или паладия</b> — цени, макро двигатели, реални лихви, инфлация, централни банки. Обяснявам, не давам персонализирани съвети.</div>' +
      '</div>' +
      '<div id="alex-chips" style="display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 8px"></div>' +
      '<div style="padding:12px;border-top:1px solid rgba(255,255,255,.07)">' +
        '<div style="display:flex;gap:8px;align-items:flex-end;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 12px">' +
          '<textarea id="alex-input" rows="1" placeholder="Питай за металите…" style="flex:1;background:none;border:none;color:#e8d5a3;resize:none;font-size:13px;outline:none;font-family:inherit;line-height:1.4;max-height:90px"></textarea>' +
          '<button id="alex-send" aria-label="Изпрати" style="background:#d9b25a;border:none;border-radius:8px;padding:5px 13px;color:#1a1408;font-size:15px;font-weight:700;cursor:pointer">→</button>' +
        '</div>' +
        '<div style="font-size:10px;color:rgba(255,255,255,.3);margin-top:7px;text-align:center">Образователно · не е инвестиционен съвет</div>' +
      '</div>' +
    '</div>';

  var box = document.createElement('div');
  box.id = 'alex-widget';
  box.innerHTML = html;

  function mount() { document.body.appendChild(box); init(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var open = false;
  var history = [];

  function toggle() {
    open = !open;
    var p = document.getElementById('alex-panel');
    var t = document.getElementById('alex-toggle');
    p.style.display = open ? 'flex' : 'none';
    t.style.transform = open ? 'scale(.9)' : 'none';
    if (open) setTimeout(function () { document.getElementById('alex-input').focus(); }, 60);
  }
  window.alexToggle = toggle;
  window.alexAsk = function (q) { if (!open) toggle(); document.getElementById('alex-input').value = q; send(); };

  function clean(t) {
    // strip Alex's internal meta-annotations so end users see a clean reply
    t = t.replace(/\[SESSION_INSIGHT:[\s\S]*?\]/g, '');
    t = t.replace(/\[[A-Z][A-Z_]{2,}:[\s\S]*?\]/g, '');   // any closed [TAG: ...]
    t = t.replace(/\[[A-Z][A-Z_]{2,}:[\s\S]*$/, '');      // unclosed tag mid-stream
    return t.replace(/\n{3,}/g, '\n\n').trim();
  }

  function bubble(role, text) {
    var feed = document.getElementById('alex-feed');
    var d = document.createElement('div');
    if (role === 'user') d.style.cssText = 'align-self:flex-end;max-width:84%;background:rgba(255,255,255,.06);border-radius:12px 12px 2px 12px;padding:10px 13px;font-size:12.5px;color:rgba(255,255,255,.88);line-height:1.5';
    else d.style.cssText = 'align-self:flex-start;max-width:92%;background:rgba(217,178,90,.06);border:1px solid rgba(217,178,90,.13);border-radius:12px 12px 12px 2px;padding:10px 13px;font-size:12.5px;color:rgba(232,213,163,.92);line-height:1.55;white-space:pre-wrap';
    d.textContent = text;
    feed.appendChild(d);
    feed.scrollTop = feed.scrollHeight;
    return d;
  }

  async function send() {
    var input = document.getElementById('alex-input');
    var msg = (input.value || '').trim();
    if (!msg) return;
    input.value = '';
    history.push({ role: 'user', content: msg });
    bubble('user', msg);
    var el = bubble('alex', '…');
    var feed = document.getElementById('alex-feed');
    var slow = setTimeout(function () { if (el.textContent === '…') el.textContent = 'Свързвам се с Alex… (първата заявка може да отнеме момент)'; }, 7000);
    var full = '';
    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, profile: PROFILE, companion_mode: true, skip_grounding: false })
      });
      clearTimeout(slow);
      el.textContent = '';
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var buf = '';
      while (true) {
        var r = await reader.read();
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop();
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('data:') !== 0) continue;
          try {
            var ev = JSON.parse(line.slice(5).trim());
            if (ev.type === 'delta') {
              full += ev.text || '';
              var atBottom = (feed.scrollHeight - feed.scrollTop - feed.clientHeight) < 60;
              el.textContent = clean(full);
              if (atBottom) feed.scrollTop = feed.scrollHeight;   // stick only if user is already at the bottom
            }
          } catch (e) {}
        }
      }
      var reply = clean(full);
      history.push({ role: 'assistant', content: reply });
      el.textContent = reply || '(няма отговор — опитай пак)';
    } catch (e) {
      clearTimeout(slow);
      el.textContent = 'Грешка във връзката — опитай пак.';
    }
  }

  function init() {
    document.getElementById('alex-toggle').onclick = toggle;
    document.getElementById('alex-close').onclick = toggle;
    document.getElementById('alex-send').onclick = send;
    var inp = document.getElementById('alex-input');
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    var chips = ['Какво движи златото днес?', 'Злато или сребро?', 'Защо платината поскъпва?', 'Обясни реалните лихви'];
    var cb = document.getElementById('alex-chips');
    chips.forEach(function (q) {
      var c = document.createElement('button');
      c.textContent = q;
      c.style.cssText = 'font-size:11px;color:#d7dbe2;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);padding:5px 10px;border-radius:14px;cursor:pointer';
      c.onclick = function () { document.getElementById('alex-input').value = q; send(); };
      cb.appendChild(c);
    });
    // open by default (desktop only, so it doesn't cover the whole mobile screen)
    if (window.innerWidth >= 720) toggle();
  }
})();
