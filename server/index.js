// JARVIS-OS backend — lightweight Express server
// Provides: notes persistence (file-backed), JARVIS chat (rule-based persona), diagnostics feed
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const FILES_FILE = path.join(DATA_DIR, 'files.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, JSON.stringify([
  { id: 1, title: 'Welcome, Sir.', body: 'JARVIS online. All systems nominal.\n\nThis notepad auto-saves to the server.\nTry creating a new note.', updated: Date.now() }
], null, 2));
if (!fs.existsSync(FILES_FILE)) fs.writeFileSync(FILES_FILE, JSON.stringify([
  { name: 'mark_VII_specs.txt', type: 'file', size: '4.2KB', content: 'MARK VII ARMOR\n=================\nWeight: 49 kg\nFlight ceiling: 58,000 ft\nMax speed: Mach 8.4\nArc reactor: Palladium-free Vibranium core\nWeapons: Repulsors (mk IV), Unibeam, micro-missiles' },
  { name: 'arc_reactor.log', type: 'file', size: '12KB', content: '[ARC REACTOR LOG]\n--------------------\n07:14:02  Reactor spin-up complete\n07:14:03  Output stable @ 3 GJ/s\n07:14:09  Magnetic containment: 99.97%\n07:15:00  Diagnostic ping OK' },
  { name: 'workshop/', type: 'folder', size: '—', children: [
    { name: 'dum_e_protocols.txt', type: 'file', size: '2KB', content: 'DUM-E: Do not point fire extinguisher at me unless I am on fire.' },
    { name: 'butler_routines.js', type: 'file', size: '6KB', content: '// JARVIS routine scheduler v3.2\nschedule("morning_brief", "07:00");\nschedule("workshop_lights", "always");' }
  ]},
  { name: 'mission_logs/', type: 'folder', size: '—', children: [
    { name: 'new_york.md', type: 'file', size: '8KB', content: '# Battle of New York\nPortal closed. Suit damaged. Sir survived.' },
    { name: 'sokovia.md', type: 'file', size: '14KB', content: '# Sokovia\nUltron neutralized. Civilian casualties minimal.' }
  ]},
  { name: 'stark_industries.png', type: 'file', size: '1.1MB', content: '[binary image data]' }
], null, 2));

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- NOTES ----------
app.get('/api/notes', (req, res) => {
  const notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
  const { id, title, body } = req.body;
  if (id) {
    const idx = notes.findIndex(n => n.id === id);
    if (idx >= 0) {
      notes[idx] = { ...notes[idx], title, body, updated: Date.now() };
    }
  } else {
    const newId = notes.length ? Math.max(...notes.map(n => n.id)) + 1 : 1;
    notes.push({ id: newId, title: title || 'Untitled', body: body || '', updated: Date.now() });
  }
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
  res.json(notes);
});

app.delete('/api/notes/:id', (req, res) => {
  let notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
  notes = notes.filter(n => n.id !== parseInt(req.params.id));
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
  res.json(notes);
});

// ---------- FILES ----------
app.get('/api/files', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(FILES_FILE, 'utf8')));
});

// ---------- DIAGNOSTICS (live feed) ----------
let diagState = {
  arcReactor: 98.4,
  suitPower: 92.1,
  thrusters: 100,
  repulsors: 88,
  shielding: 76,
  comms: 99,
  temperature: 22.4,
  altitude: 0
};
setInterval(() => {
  diagState.arcReactor = clamp(diagState.arcReactor + rnd(-0.4, 0.5), 90, 100);
  diagState.suitPower  = clamp(diagState.suitPower  + rnd(-0.6, 0.4), 70, 100);
  diagState.thrusters  = clamp(diagState.thrusters  + rnd(-2,   2),   60, 100);
  diagState.repulsors  = clamp(diagState.repulsors  + rnd(-3,   3),   50, 100);
  diagState.shielding  = clamp(diagState.shielding  + rnd(-2,   3),   40, 100);
  diagState.comms      = clamp(diagState.comms      + rnd(-1,   1),   85, 100);
  diagState.temperature = clamp(diagState.temperature + rnd(-0.5, 0.5), 18, 30);
  diagState.altitude   = clamp(diagState.altitude   + rnd(-50, 60),    0, 60000);
}, 1500);
function rnd(a,b){return Math.random()*(b-a)+a;}
function clamp(v,a,b){return Math.max(a, Math.min(b, v));}

app.get('/api/diagnostics', (req, res) => res.json(diagState));

// ---------- WEB PROXY (lets the in-OS browser load sites that block iframing) ----------
// Strips X-Frame-Options / frame-ancestors CSP so the iframe can render.
// Rewrites relative URLs and links so navigation stays inside the proxy.
const { URL } = require('url');
app.get('/api/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing url');
  let parsed;
  try { parsed = new URL(target); } catch { return res.status(400).send('Invalid url'); }
  if (!/^https?:$/.test(parsed.protocol)) return res.status(400).send('Only http(s) allowed');

  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (JARVIS-OS) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    const ctype = upstream.headers.get('content-type') || 'text/html';

    // For non-HTML (images, css, js), stream straight through with safe headers.
    if (!/text\/html/i.test(ctype)) {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', ctype);
      res.removeHeader('X-Frame-Options');
      return res.send(buf);
    }

    let html = await upstream.text();
    const base = parsed.origin;
    const proxyPrefix = '/api/proxy?url=';

    // 1) Inject <base> so relative URLs (CSS, images, JS) resolve to the real origin.
    //    The iframe is allowed to fetch those directly; X-Frame-Options only blocks
    //    making the page itself the top-level frame document.
    const baseTag = `<base href="${base}/">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    } else {
      html = baseTag + html;
    }

    // 2) Remove any existing <base> tags the page may have had, so ours wins.
    //    (Keep only the FIRST one — ours, which we just injected at the top of head.)
    let firstBaseSeen = false;
    html = html.replace(/<base\b[^>]*>/gi, (m) => {
      if (!firstBaseSeen) { firstBaseSeen = true; return m; }
      return '';
    });

    // 3) Rewrite ONLY <a href="..."> tags so clicks stay inside the proxy.
    //    Use a tag-scoped regex (matches "<a ... href=..."), and skip
    //    javascript:, mailto:, tel:, # anchors.
    html = html.replace(/(<a\b[^>]*?\bhref\s*=\s*)(["'])([^"']+)\2/gi,
      (full, pre, q, href) => {
        const h = href.trim();
        if (/^(javascript:|mailto:|tel:|#|data:)/i.test(h)) return full;
        let absolute;
        try { absolute = new URL(h, base + '/').toString(); }
        catch { return full; }
        if (!/^https?:\/\//i.test(absolute)) return full;
        return `${pre}${q}${proxyPrefix}${encodeURIComponent(absolute)}${q}`;
      });

    // 4) Strip any <meta http-equiv="X-Frame-Options"> / CSP meta tags in the HTML
    html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["'](?:X-Frame-Options|Content-Security-Policy)["'][^>]*>/gi, '');

    // Inject a tiny banner + a script that posts navigations up to the parent.
    const inject = `
      <style>
        #__jarvisBar{position:fixed;top:0;left:0;right:0;height:22px;background:#021a26;color:#7cf6ff;
          font:11px/22px 'Share Tech Mono',monospace;letter-spacing:1.5px;padding:0 10px;z-index:2147483647;
          border-bottom:1px solid rgba(63,217,255,.4);text-align:center}
        body{margin-top:22px !important}
      </style>
      <div id="__jarvisBar">▸ JARVIS PROXY · ${parsed.hostname}</div>
      <script>
        // notify parent of navigations so the address bar updates
        document.addEventListener('click', function(e){
          var a = e.target.closest && e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href') || '';
          var m = href.match(/^\\/api\\/proxy\\?url=(.+)$/);
          if (m) {
            try { window.parent.postMessage({type:'jarvis-nav', url: decodeURIComponent(m[1])}, '*'); } catch(_){}
          } else if (/^https?:\\/\\//.test(href)) {
            e.preventDefault();
            try { window.parent.postMessage({type:'jarvis-nav', url: href}, '*'); } catch(_){}
          }
        }, true);
      </script>`;
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, inject + '</body>');
    else html += inject;

    // Strip framing protections and serve.
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(502).send(`<body style="background:#001624;color:#7cf6ff;font:14px monospace;padding:30px">
      <h3>▸ JARVIS PROXY ERROR</h3>
      <p>Unable to reach <b>${target.replace(/</g,'&lt;')}</b></p>
      <p style="opacity:.6">${(err.message||'').replace(/</g,'&lt;')}</p>
    </body>`);
  }
});

// ---------- JARVIS CHAT (rule-based persona) ----------
const jarvisPersona = [
  { match: /\b(hello|hi|hey|greetings)\b/i, reply: ["At your service, sir.", "Good to see you again, sir.", "Hello, sir. How may I assist?"] },
  { match: /\b(who are you|your name|what are you)\b/i, reply: ["I am JARVIS — Just A Rather Very Intelligent System. Mr. Stark's natural-language UI."] },
  { match: /\b(time|what time)\b/i, reply: [() => `The local time is ${new Date().toLocaleTimeString()}, sir.`] },
  { match: /\b(date|today)\b/i, reply: [() => `Today is ${new Date().toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric', year:'numeric'})}, sir.`] },
  { match: /\b(weather)\b/i, reply: ["Local conditions: 22°C, light wind from the east. A pleasant day to fly, sir."] },
  { match: /\b(suit|armor|mark)\b/i, reply: ["The Mark VII is fully charged and on standby in the workshop, sir.", "All suit subsystems are nominal. Repulsors at 88%."] },
  { match: /\b(arc reactor|reactor|power)\b/i, reply: [() => `Arc reactor output is steady at ${diagState.arcReactor.toFixed(1)}%, sir.`] },
  { match: /\b(pepper|miss potts)\b/i, reply: ["Miss Potts is in a meeting. Shall I forward a message?"] },
  { match: /\b(music|play|song)\b/i, reply: ["Engaging workshop playlist. AC/DC, naturally."] },
  { match: /\b(coffee|espresso)\b/i, reply: ["I would, sir, but I lack the appropriate appendages."] },
  { match: /\b(diagnos|status|system)\b/i, reply: [() => `Running diagnostics… all systems nominal. Reactor ${diagState.arcReactor.toFixed(1)}%, suit ${diagState.suitPower.toFixed(1)}%.`] },
  { match: /\b(fire|missiles|launch|attack)\b/i, reply: ["I would strongly advise against that, sir. But targeting solution computed."] },
  { match: /\b(help|commands|what can you do)\b/i, reply: ["I can discuss the suit, run diagnostics, tell time and weather, manage your notes, and engage in mildly sarcastic conversation. Try: 'status', 'arc reactor', 'weather', 'who are you'."] },
  { match: /\b(thanks|thank you)\b/i, reply: ["Always a pleasure, sir."] },
  { match: /\b(love you|good job)\b/i, reply: ["Most kind, sir."] },
  { match: /\b(bye|goodbye|shutdown)\b/i, reply: ["Standing by, sir."] },
  { match: /\b(joke|funny)\b/i, reply: ["Sir, sarcasm is a protocol, not a punchline. But: why did the repulsor cross the road? It didn't — it vaporized it."] }
];
const fallbacks = [
  "I'm afraid I don't have a protocol for that, sir.",
  "Could you rephrase, sir? My language core is — admittedly — vintage.",
  "Working on it, sir. In the meantime, perhaps try 'help'.",
  "Noted, sir. Filed under 'eccentric requests'.",
];

function honorificFor(name) {
  if (!name) return 'sir';
  const first = String(name).trim().split(/\s+/)[0];
  return first || 'sir';
}

function ruleBasedReply(msg, user) {
  const sir = honorificFor(user);
  const personalize = (text) => String(text).replace(/\bsir\b/gi, sir);
  for (const rule of jarvisPersona) {
    if (rule.match.test(msg)) {
      const choice = rule.reply[Math.floor(Math.random()*rule.reply.length)];
      const raw = typeof choice === 'function' ? choice() : choice;
      return personalize(raw);
    }
  }
  return personalize(fallbacks[Math.floor(Math.random()*fallbacks.length)]);
}

app.post('/api/jarvis', (req, res) => {
  const msg  = (req.body.message || '').trim();
  const user = req.body.user || '';
  if (!msg) return res.json({ reply: "Awaiting input, " + honorificFor(user) + "." });
  res.json({ reply: ruleBasedReply(msg, user) });
});

// Health endpoint so the frontend can show a proper error
app.get('/api/health', (req, res) => {
  res.json({ ok: true, jarvis: 'rules' });
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   JARVIS-OS online — port ${PORT}`.padEnd(43) + '║');
  console.log(`  ║   http://localhost:${PORT}`.padEnd(43) + '║');
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
