/* ═══════════════ JARVIS-OS · Apps ═══════════════ */

/* ─── 1. JARVIS Terminal ─── */
OS.apps.jarvis = {
  name:'jarvis', title:'J.A.R.V.I.S.', icon:'◆', w:540, h:420, singleton:true,
  build(root) {
    const userName  = OS.user || 'Guest';
    const honorific = userHonorific(userName);
    const slug      = userSlug(userName);
    const hour      = new Date().getHours();
    const partOfDay = hour < 5 ? 'evening' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    root.innerHTML = `
      <div class="term">
        <div class="term-log" id="jvLog">
          <div class="sys">[ J.A.R.V.I.S. v9.3 conversational interface · admin: <b>${escapeHtml(userName)}</b> · type "help" ]</div>
          <div class="jv">▸ Good ${partOfDay}, ${escapeHtml(honorific)}. All systems are at your disposal.</div>
        </div>
        <div class="term-input">
          <span class="p">${escapeHtml(slug)}@workshop ~&gt;</span>
          <input id="jvIn" autocomplete="off" placeholder="say something..." />
        </div>
      </div>`;
    const log = root.querySelector('#jvLog');
    const inp = root.querySelector('#jvIn');
    setTimeout(()=>inp.focus(),100);

    async function send() {
      const msg = inp.value.trim();
      if (!msg) return;
      inp.value = '';
      log.innerHTML += `<div class="me">› ${escapeHtml(msg)}</div>`;
      log.scrollTop = log.scrollHeight;
      const pendId = 'p'+Date.now();
      log.innerHTML += `<div class="sys" id="${pendId}">▸ <em>processing…</em></div>`;
      log.scrollTop = log.scrollHeight;
      try {
        const res = await fetch('/api/jarvis',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ message: msg, user: userName })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const r = await res.json();
        document.getElementById(pendId).remove();
        await typeOut(log, '▸ ' + r.reply);
      } catch(e) {
        document.getElementById(pendId).remove();
        const err = document.createElement('div');
        err.className = 'jv';
        err.style.color = '#ff5a6f';
        err.innerHTML = `▸ Connection failed, ${escapeHtml(honorific)}. <span style="opacity:.7">(${escapeHtml(e.message||String(e))})</span>`;
        log.appendChild(err);
      }
      log.scrollTop = log.scrollHeight;
    }
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  }
};

function typeOut(parent, text) {
  return new Promise(res => {
    const d = document.createElement('div'); d.className='jv'; parent.appendChild(d);
    let i = 0;
    const tick = () => {
      d.textContent = text.slice(0, i++);
      parent.scrollTop = parent.scrollHeight;
      if (i <= text.length) setTimeout(tick, 14 + Math.random()*18); else res();
    };
    tick();
  });
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

/* ─── 2. File Explorer ─── */
OS.apps.files = {
  name:'files', title:'FILES', icon:'▤', w:560, h:380,
  async build(root, win) {
    const files = await fetch('/api/files').then(r=>r.json());
    let stack = [{name:'/', children: files}];
    function render() {
      const cur = stack[stack.length-1];
      const path = '/' + stack.slice(1).map(s=>s.name).join('');
      root.innerHTML = `
        <div class="file-path">📁 STARK://${path}</div>
        <div class="files" id="fls"></div>
        <div id="fv" style="margin-top:10px"></div>`;
      const fls = root.querySelector('#fls');
      if (stack.length > 1) {
        const up = document.createElement('div'); up.className='file-item';
        up.innerHTML = `<div class="ic">↑</div><div class="nm">..</div>`;
        up.addEventListener('dblclick', ()=>{stack.pop();render();});
        up.addEventListener('click', ()=>{stack.pop();render();});
        fls.appendChild(up);
      }
      cur.children.forEach(f => {
        const el = document.createElement('div'); el.className='file-item';
        const ic = f.type==='folder'?'📁':(f.name.endsWith('.png')||f.name.endsWith('.jpg')?'🖼':'📄');
        el.innerHTML = `<div class="ic">${ic}</div><div class="nm">${f.name}</div>`;
        el.addEventListener('click', () => {
          if (f.type === 'folder') { stack.push(f); render(); }
          else {
            root.querySelector('#fv').innerHTML = `<div class="file-path">▸ ${f.name} · ${f.size}</div><div class="file-viewer">${escapeHtml(f.content||'(binary)')}</div>`;
          }
        });
        fls.appendChild(el);
      });
    }
    render();
  }
};

/* ─── 3. Notes (server-backed) ─── */
OS.apps.notes = {
  name:'notes', title:'NOTEPAD', icon:'✎', w:600, h:400,
  async build(root) {
    root.innerHTML = `
      <div class="notes-wrap">
        <div class="notes-list" id="nList"></div>
        <div class="notes-edit">
          <input id="nTitle" placeholder="Title..." />
          <textarea id="nBody" placeholder="Type your notes, sir..."></textarea>
          <div class="row">
            <span id="nMeta"></span>
            <span>
              <button class="btn" id="nSave">Save</button>
              <button class="btn danger" id="nDel">Delete</button>
            </span>
          </div>
        </div>
      </div>`;
    let notes = [], cur = null;
    const list = root.querySelector('#nList');
    const t = root.querySelector('#nTitle');
    const b = root.querySelector('#nBody');
    const m = root.querySelector('#nMeta');
    async function load() {
      notes = await fetch('/api/notes').then(r=>r.json());
      renderList();
      if (notes.length && !cur) select(notes[0]);
    }
    function renderList() {
      list.innerHTML = `<div class="new" id="nNew">＋ NEW NOTE</div>` +
        notes.map(n=>`<div class="it ${cur&&cur.id===n.id?'sel':''}" data-id="${n.id}">${escapeHtml(n.title||'Untitled')}</div>`).join('');
      list.querySelector('#nNew').addEventListener('click', () => { cur = null; t.value=''; b.value=''; m.textContent='(unsaved)'; renderList(); });
      list.querySelectorAll('.it').forEach(el => el.addEventListener('click', () => select(notes.find(n=>n.id==el.dataset.id))));
    }
    function select(n) { cur = n; t.value = n.title; b.value = n.body; m.textContent = 'updated ' + new Date(n.updated).toLocaleString(); renderList(); }
    root.querySelector('#nSave').addEventListener('click', async () => {
      const payload = { id: cur?cur.id:undefined, title: t.value, body: b.value };
      notes = await fetch('/api/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
      cur = notes.find(n => n.title === t.value) || notes[notes.length-1];
      m.textContent = '✓ saved · ' + new Date().toLocaleTimeString();
      renderList();
    });
    root.querySelector('#nDel').addEventListener('click', async () => {
      if (!cur) return;
      notes = await fetch('/api/notes/'+cur.id, {method:'DELETE'}).then(r=>r.json());
      cur = null; t.value=''; b.value=''; m.textContent='deleted';
      renderList();
    });
    load();
  }
};

/* ─── 4. Calculator ─── */
OS.apps.calc = {
  name:'calc', title:'CALCULATOR', icon:'∑', w:280, h:380,
  build(root) {
    root.innerHTML = `
      <div class="calc">
        <div class="calc-disp"><div class="hist" id="cHist"></div><div id="cDisp">0</div></div>
        <div class="calc-grid">
          <button class="ac" data-k="C">AC</button>
          <button class="op" data-k="±">±</button>
          <button class="op" data-k="%">%</button>
          <button class="op" data-k="/">÷</button>
          <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>
          <button class="op" data-k="*">×</button>
          <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>
          <button class="op" data-k="-">−</button>
          <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>
          <button class="op eq" data-k="=">=</button>
          <button data-k="0" style="grid-column:span 2">0</button>
          <button data-k=".">.</button>
          <button class="op" data-k="+">+</button>
        </div>
      </div>`;
    const disp = root.querySelector('#cDisp');
    const hist = root.querySelector('#cHist');
    let cur = '0', prev = null, op = null, just = false;
    function press(k) {
      if (/[0-9]/.test(k)) { cur = (cur==='0'||just) ? k : cur + k; just=false; }
      else if (k === '.') { if (!cur.includes('.')) cur += '.'; }
      else if (k === 'C') { cur='0'; prev=null; op=null; hist.textContent=''; }
      else if (k === '±') { cur = String(parseFloat(cur)*-1); }
      else if (k === '%') { cur = String(parseFloat(cur)/100); }
      else if (['+','-','*','/'].includes(k)) {
        if (op && !just) compute();
        prev = parseFloat(cur); op = k; just = true;
        hist.textContent = `${prev} ${k}`;
      } else if (k === '=') {
        compute(); op = null; just = true;
      }
      disp.textContent = cur;
    }
    function compute() {
      if (op == null || prev == null) return;
      const n = parseFloat(cur);
      let r = 0;
      switch(op){case'+':r=prev+n;break;case'-':r=prev-n;break;case'*':r=prev*n;break;case'/':r=n===0?0:prev/n;break;}
      hist.textContent = `${prev} ${op} ${n} =`;
      cur = String(+r.toFixed(10));
      prev = r;
    }
    root.querySelectorAll('button').forEach(b => b.addEventListener('click', () => press(b.dataset.k)));
  }
};

/* ─── 5. Music player (Web Audio synth) ─── */
OS.apps.music = {
  name:'music', title:'MUSIC', icon:'♪', w:380, h:420,
  build(root) {
    const tracks = [
      { title:'Iron Man', artist:'Black Sabbath', notes:[ [262,500],[330,500],[262,500],[330,500],[392,500],[349,500],[330,1000] ]},
      { title:'Back in Black', artist:'AC/DC',    notes:[ [220,300],[262,300],[294,300],[220,300],[262,600],[294,300],[330,600] ]},
      { title:'Shoot to Thrill', artist:'AC/DC',  notes:[ [196,250],[247,250],[294,250],[247,250],[196,500],[247,250],[294,500] ]},
      { title:'Stark Theme', artist:'Ramin Djawadi', notes:[ [330,400],[440,400],[392,400],[330,400],[262,800] ]},
    ];
    let idx = 0, playing = false, ctx, master, viz, vizBars=[], rafId, srcOsc;
    root.innerHTML = `
      <div class="music">
        <div class="music-cover"><div class="disc" id="mDisc"></div></div>
        <div class="music-title" id="mT">${tracks[0].title}</div>
        <div class="music-artist" id="mA">${tracks[0].artist}</div>
        <div class="viz" id="mViz"></div>
        <div class="music-ctrls">
          <button id="mPrev">⏮</button>
          <button id="mPlay" class="play">▶</button>
          <button id="mNext">⏭</button>
        </div>
        <div class="music-list" id="mList"></div>
      </div>`;
    viz = root.querySelector('#mViz');
    for (let i=0;i<32;i++){const b=document.createElement('div');b.className='bar';viz.appendChild(b);vizBars.push(b);}
    function renderList() {
      root.querySelector('#mList').innerHTML = tracks.map((t,i)=>`<div class="it ${i===idx?'sel':''}" data-i="${i}">▸ ${t.title}<span>${t.artist}</span></div>`).join('');
      root.querySelectorAll('#mList .it').forEach(el => el.addEventListener('click', () => { idx=+el.dataset.i; load(); if(playing) play(); }));
    }
    function load() {
      root.querySelector('#mT').textContent = tracks[idx].title;
      root.querySelector('#mA').textContent = tracks[idx].artist;
      renderList();
    }
    async function play() {
      if (!ctx) { ctx = new (window.AudioContext||window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.05; master.connect(ctx.destination); }
      playing = true;
      root.querySelector('#mPlay').textContent = '⏸';
      root.querySelector('#mDisc').classList.add('playing');
      animateViz();
      const seq = tracks[idx].notes;
      let t = ctx.currentTime + 0.05;
      for (const [freq, dur] of seq) {
        const osc = ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.value = freq;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t+0.02); g.gain.linearRampToValueAtTime(0, t + dur/1000);
        osc.connect(g).connect(master);
        osc.start(t); osc.stop(t + dur/1000 + 0.05);
        t += dur/1000;
      }
      const total = seq.reduce((a,n)=>a+n[1],0);
      setTimeout(() => { if (playing) { idx = (idx+1)%tracks.length; load(); play(); } }, total);
    }
    function stop() {
      playing = false;
      root.querySelector('#mPlay').textContent = '▶';
      root.querySelector('#mDisc').classList.remove('playing');
      cancelAnimationFrame(rafId);
      vizBars.forEach(b => b.style.height='2px');
    }
    function animateViz() {
      if (!playing) return;
      vizBars.forEach(b => { b.style.height = (4 + Math.random()*46) + 'px'; });
      rafId = requestAnimationFrame(() => setTimeout(animateViz, 70));
    }
    root.querySelector('#mPlay').addEventListener('click', () => playing ? stop() : play());
    root.querySelector('#mNext').addEventListener('click', () => { stop(); idx=(idx+1)%tracks.length; load(); });
    root.querySelector('#mPrev').addEventListener('click', () => { stop(); idx=(idx-1+tracks.length)%tracks.length; load(); });
    load();
  }
};

/* ─── 6. Settings (redesigned: tabbed, with live previews) ─── */
OS.apps.settings = {
  name:'settings', title:'SETTINGS', icon:'⚙', w:560, h:460, singleton:true,
  build(root) {
    // ── Wallpaper catalogue ──────────────────────────────────────────────
    const wallpapers = [
      // existing
      { id:'default',  name:'Stark HUD',     css:'radial-gradient(ellipse at 20% 30%, rgba(13,80,110,.45) 0%, transparent 55%),radial-gradient(ellipse at 80% 80%, rgba(8,40,70,.55) 0%, transparent 60%),linear-gradient(180deg, #001624 0%, #000810 100%)' },
      { id:'workshop', name:'Workshop',      css:'radial-gradient(ellipse at 50% 100%, rgba(255,120,40,.18) 0%, transparent 50%),linear-gradient(180deg, #0a0508 0%, #1a0a04 100%)' },
      { id:'mark7',    name:'Mark VII',      css:'radial-gradient(ellipse at 30% 50%, rgba(180,30,40,.25) 0%, transparent 60%),linear-gradient(180deg, #150406 0%, #2a0608 100%)' },
      { id:'reactor',  name:'Arc Reactor',   css:'radial-gradient(circle at center, rgba(124,246,255,.5) 0%, rgba(63,217,255,.15) 30%, #000810 70%)' },
      // new wallpapers
      { id:'malibu',   name:'Malibu Dusk',   css:'linear-gradient(180deg, #1a0a2e 0%, #4a1a5e 35%, #ff6b6b 70%, #ffa07a 100%)' },
      { id:'jet',      name:'Jet Stream',    css:'radial-gradient(ellipse at 70% 20%, rgba(255,180,90,.3) 0%, transparent 40%),linear-gradient(180deg, #001428 0%, #002850 50%, #001020 100%)' },
      { id:'hangar',   name:'Hangar Bay',    css:'linear-gradient(180deg, #0a0a0f 0%, #1a1a25 40%, #0f0f18 100%),repeating-linear-gradient(90deg, transparent 0 60px, rgba(63,217,255,.04) 60px 61px)' },
      { id:'ultron',   name:'Ultron Red',    css:'radial-gradient(ellipse at 50% 50%, rgba(255,40,40,.25) 0%, transparent 60%),linear-gradient(180deg, #1a0408 0%, #050102 100%)' },
      { id:'wakanda',  name:'Wakanda',       css:'radial-gradient(ellipse at 50% 80%, rgba(124,92,255,.35) 0%, transparent 55%),linear-gradient(180deg, #0a0a1f 0%, #2a1a3f 60%, #0a0a1f 100%)' },
      { id:'space',    name:'Deep Space',    css:'radial-gradient(circle at 30% 20%, #fff 0.5px, transparent 1px) 0 0/40px 40px,radial-gradient(circle at 70% 60%, #fff 0.5px, transparent 1px) 0 0/60px 60px,linear-gradient(180deg, #000 0%, #02061a 50%, #000 100%)' },
      { id:'sunset',   name:'Sunset Coast',  css:'linear-gradient(180deg, #2c1810 0%, #7d2a3f 30%, #ff7849 60%, #ffd24a 100%)' },
      { id:'matrix',   name:'Code Matrix',   css:'linear-gradient(180deg, #001000 0%, #001a08 100%),repeating-linear-gradient(0deg, transparent 0 14px, rgba(80,255,140,.04) 14px 15px)' },
      { id:'void',     name:'Void',          css:'#000' },
      { id:'paper',    name:'Blueprint',     css:'linear-gradient(180deg, #0a2540 0%, #051528 100%),repeating-linear-gradient(0deg, transparent 0 24px, rgba(124,246,255,.06) 24px 25px),repeating-linear-gradient(90deg, transparent 0 24px, rgba(124,246,255,.06) 24px 25px)' },
    ];

    // ── Accent / theme palette ───────────────────────────────────────────
    const accents = [
      { id:'cyan',    name:'Arc Cyan',    hi:'#7cf6ff', mid:'#3fd9ff', lo:'#1a6b88' },
      { id:'gold',    name:'Stark Gold',  hi:'#ffd24a', mid:'#ff9a1f', lo:'#7a4400' },
      { id:'crimson', name:'Hot Rod Red', hi:'#ff5a6f', mid:'#d92038', lo:'#6a0010' },
      { id:'violet',  name:'Vibranium',   hi:'#b89bff', mid:'#7c5cff', lo:'#3a1f88' },
      { id:'mint',    name:'JARVIS Mint', hi:'#5cffa1', mid:'#1fc674', lo:'#0a5a36' },
      { id:'amber',   name:'Workshop',    hi:'#ffb24a', mid:'#ff7a1f', lo:'#7a3000' },
      { id:'pink',    name:'Pepper',      hi:'#ff9ec7', mid:'#ff5fa3', lo:'#7a1a4a' },
      { id:'ice',     name:'Ice',         hi:'#ffffff', mid:'#bcd4e6', lo:'#5a7a9a' },
    ];

    // ── Initial state from OS.settings ──────────────────────────────────
    OS.settings.wallpaper = OS.settings.wallpaper || 'default';
    OS.settings.accent    = OS.settings.accent    || 'cyan';
    OS.settings.user      = OS.user || OS.settings.user || 'Tony Stark';
    OS.settings.location  = OS.settings.location  || 'Malibu Workshop';

    // ── Layout ──────────────────────────────────────────────────────────
    root.innerHTML = `
      <div class="settings2">
        <nav class="set-tabs">
          <button data-tab="appear" class="active">◆ APPEARANCE</button>
          <button data-tab="theme">◆ THEME</button>
          <button data-tab="user">◆ USER</button>
          <button data-tab="system">◆ SYSTEM</button>
          <div class="set-version">JARVIS-OS v9.3<br/>© STARK INDUSTRIES</div>
        </nav>

        <div class="set-pane">
          <!-- APPEARANCE -->
          <section class="set-page" data-page="appear">
            <h3 class="set-h">WALLPAPER</h3>
            <div class="wall-grid" id="sWalls"></div>
          </section>

          <!-- THEME -->
          <section class="set-page hidden" data-page="theme">
            <h3 class="set-h">ACCENT COLOR</h3>
            <div class="accent-grid" id="sAcc"></div>

            <h3 class="set-h">EFFECTS</h3>
            <div class="set-row">
              <label>Scanlines overlay</label>
              <button class="toggle" id="sScan" data-on="1"><span></span></button>
            </div>
            <div class="set-row">
              <label>HUD rings &amp; reticles</label>
              <button class="toggle" id="sHud" data-on="1"><span></span></button>
            </div>
            <div class="set-row">
              <label>Background grid</label>
              <button class="toggle" id="sGrid" data-on="1"><span></span></button>
            </div>
          </section>

          <!-- USER -->
          <section class="set-page hidden" data-page="user">
            <h3 class="set-h">IDENTITY</h3>
            <div class="set-field">
              <label>NAME</label>
              <input id="sUser" type="text" value="${OS.settings.user}" />
            </div>
            <div class="set-field">
              <label>LOCATION</label>
              <input id="sLoc" type="text" value="${OS.settings.location}" />
            </div>
            <div class="set-field">
              <label>CLEARANCE</label>
              <select id="sClear">
                <option>α-ALPHA · UNLIMITED</option>
                <option>β-BETA · ELEVATED</option>
                <option>γ-GAMMA · STANDARD</option>
                <option>GUEST</option>
              </select>
            </div>
            <h3 class="set-h">TOOLS</h3>
            <div class="set-row">
              <label>Open Holographic Workshop</label>
              <button class="btn" id="sHolo">◈ LAUNCH</button>
            </div>
            <div class="set-row">
              <label>Forget identity &amp; re-prompt on next boot</label>
              <button class="btn danger" id="sForget">✕ FORGET</button>
            </div>
          </section>

          <!-- SYSTEM -->
          <section class="set-page hidden" data-page="system">
            <h3 class="set-h">SYSTEM</h3>
            <div class="set-row"><label>JARVIS Voice Engine</label><b class="ok">ONLINE</b></div>
            <div class="set-row"><label>Arc Reactor Core</label><b class="ok">STABLE</b></div>
            <div class="set-row"><label>Workshop Climate</label><b class="ok">22.4°C</b></div>
            <div class="set-row"><label>Stark-Net Uplink</label><b class="ok">SECURE</b></div>

            <h3 class="set-h">ACTIONS</h3>
            <div class="set-row"><label>Reload session</label><button class="btn" id="sReboot">↻ REBOOT</button></div>
            <div class="set-row"><label>Reset wallpaper &amp; theme</label><button class="btn" id="sReset">↺ RESET</button></div>
            <div class="set-row"><label>Close all windows</label><button class="btn danger" id="sCloseAll">✕ CLOSE ALL</button></div>
          </section>
        </div>
      </div>`;

    // ── Tabs ────────────────────────────────────────────────────────────
    root.querySelectorAll('.set-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.set-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const t = btn.dataset.tab;
        root.querySelectorAll('.set-page').forEach(p => p.classList.toggle('hidden', p.dataset.page !== t));
      });
    });

    // ── Wallpaper grid ──────────────────────────────────────────────────
    const wallGrid = root.querySelector('#sWalls');
    function paintWalls() {
      wallGrid.innerHTML = wallpapers.map(w => `
        <div class="wall ${OS.settings.wallpaper===w.id?'sel':''}" data-id="${w.id}">
          <div class="wall-thumb" style="background:${w.css}"></div>
          <div class="wall-name">${w.name}</div>
        </div>`).join('');
      wallGrid.querySelectorAll('.wall').forEach(el => el.addEventListener('click', () => {
        const id = el.dataset.id;
        const w = wallpapers.find(x => x.id === id);
        OS.settings.wallpaper = id;
        document.getElementById('desktop').style.background = w.css;
        paintWalls();
      }));
    }
    paintWalls();

    // apply current wallpaper now (in case it's pre-set)
    const curW = wallpapers.find(x => x.id === OS.settings.wallpaper);
    if (curW) document.getElementById('desktop').style.background = curW.css;

    // ── Accent grid ─────────────────────────────────────────────────────
    const accGrid = root.querySelector('#sAcc');
    function paintAccents() {
      accGrid.innerHTML = accents.map(a => `
        <div class="acc ${OS.settings.accent===a.id?'sel':''}" data-id="${a.id}" title="${a.name}">
          <div class="acc-sw" style="background:linear-gradient(135deg, ${a.hi}, ${a.mid});box-shadow:0 0 12px ${a.mid}"></div>
          <div class="acc-name">${a.name}</div>
        </div>`).join('');
      accGrid.querySelectorAll('.acc').forEach(el => el.addEventListener('click', () => {
        const id = el.dataset.id;
        const a = accents.find(x => x.id === id);
        OS.settings.accent = id;
        document.documentElement.style.setProperty('--cyan',    a.mid);
        document.documentElement.style.setProperty('--cyan-hi', a.hi);
        document.documentElement.style.setProperty('--cyan-lo', a.lo);
        paintAccents();
      }));
    }
    paintAccents();

    // apply current accent
    const curA = accents.find(x => x.id === OS.settings.accent);
    if (curA) {
      document.documentElement.style.setProperty('--cyan',    curA.mid);
      document.documentElement.style.setProperty('--cyan-hi', curA.hi);
      document.documentElement.style.setProperty('--cyan-lo', curA.lo);
    }

    // ── Toggles ─────────────────────────────────────────────────────────
    function bindToggle(id, fn) {
      const t = root.querySelector('#'+id);
      t.addEventListener('click', () => {
        const on = t.dataset.on === '1' ? '0' : '1';
        t.dataset.on = on;
        fn(on === '1');
      });
    }
    bindToggle('sScan', on => document.querySelectorAll('.scanlines').forEach(s => s.style.display = on ? '' : 'none'));
    bindToggle('sHud',  on => {
      const rings = document.querySelector('.hud-rings');
      const arc   = document.querySelector('.rr-arc-vis');
      if (rings) rings.style.display = on ? '' : 'none';
      if (arc)   arc.style.opacity   = on ? '' : '0.25';
    });
    bindToggle('sGrid', on => {
      const g = document.querySelector('.bg-grid');
      if (g) g.style.display = on ? '' : 'none';
    });

    // ── User fields ─────────────────────────────────────────────────────
    root.querySelector('#sUser').addEventListener('input', e => {
      OS.settings.user = e.target.value;
      OS.user = e.target.value || 'Guest';
      setStoredUser(OS.user);
      // live-update the top bar
      const tbUser = document.getElementById('tbUser');
      if (tbUser) tbUser.textContent = OS.user.toUpperCase();
    });
    root.querySelector('#sLoc').addEventListener('input',  e => OS.settings.location = e.target.value);

    root.querySelector('#sForget').addEventListener('click', () => {
      try { localStorage.removeItem('jarvis.user'); } catch {}
      alert('Identity forgotten. The next reboot will prompt for a new name.');
    });

    // ── Actions ─────────────────────────────────────────────────────────
    root.querySelector('#sHolo').addEventListener('click', () => openApp('hologram'));
    root.querySelector('#sReboot').addEventListener('click', () => location.reload());
    root.querySelector('#sReset').addEventListener('click', () => {
      OS.settings.wallpaper = 'default';
      OS.settings.accent    = 'cyan';
      const w = wallpapers[0], a = accents[0];
      document.getElementById('desktop').style.background = w.css;
      document.documentElement.style.setProperty('--cyan',    a.mid);
      document.documentElement.style.setProperty('--cyan-hi', a.hi);
      document.documentElement.style.setProperty('--cyan-lo', a.lo);
      paintWalls(); paintAccents();
    });
    root.querySelector('#sCloseAll').addEventListener('click', () => {
      [...OS.windows].forEach(w => { if (w.app !== 'settings') closeWindow(w); });
    });
  }
};

/* ─── 8. Clock + world time ─── */
OS.apps.clock = {
  name:'clock', title:'CHRONO', icon:'⌚', w:380, h:360,
  build(root, win) {
    const zones = [
      {city:'MALIBU',    tz:'America/Los_Angeles'},
      {city:'NEW YORK',  tz:'America/New_York'},
      {city:'LONDON',    tz:'Europe/London'},
      {city:'TOKYO',     tz:'Asia/Tokyo'},
      {city:'SOKOVIA',   tz:'Europe/Belgrade'},
      {city:'WAKANDA',   tz:'Africa/Nairobi'},
    ];
    root.innerHTML = `
      <div class="clock-app">
        <div class="clock-main">
          <div class="big" id="cBig">00:00:00</div>
          <div class="lbl" id="cLbl">— · —</div>
        </div>
        <div class="lbl" style="font-family:'Share Tech Mono';font-size:10px;color:var(--ink-dim);letter-spacing:3px;text-align:center">WORLD CLOCKS</div>
        <div class="world-clocks" id="cWc"></div>
      </div>`;
    function pad(n){return String(n).padStart(2,'0')}
    function tick() {
      const d = new Date();
      root.querySelector('#cBig').textContent = pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
      root.querySelector('#cLbl').textContent = d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
      root.querySelector('#cWc').innerHTML = zones.map(z => {
        const t = new Date().toLocaleTimeString('en-GB',{timeZone:z.tz, hour:'2-digit',minute:'2-digit'});
        return `<div class="wc"><div class="city">${z.city}</div><div class="t">${t}</div></div>`;
      }).join('');
    }
    tick(); win._iv = setInterval(tick, 1000);
    win.onClose = () => clearInterval(win._iv);
  }
};

/* ─── 9. WEATHER — animated 5-day forecast ─── */
OS.apps.weather = {
  name:'weather', title:'WEATHER', icon:'☁', w:520, h:430, singleton:true,
  build(root, win) {
    const cities = [
      { id:'malibu',  name:'MALIBU, CA',   tz:'America/Los_Angeles' },
      { id:'nyc',     name:'NEW YORK, NY', tz:'America/New_York' },
      { id:'london',  name:'LONDON, UK',   tz:'Europe/London' },
      { id:'tokyo',   name:'TOKYO, JP',    tz:'Asia/Tokyo' },
    ];
    // Mock weather data per city (deterministic via simple seeded RNG so it's stable)
    function seedRng(seed) {
      let s = seed;
      return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    }
    const conditions = [
      { c:'CLEAR',          k:'sun',   tMod: 4 },
      { c:'PARTLY CLOUDY',  k:'pcloud', tMod: 1 },
      { c:'CLOUDY',         k:'cloud', tMod:-1 },
      { c:'LIGHT RAIN',     k:'rain',  tMod:-3 },
      { c:'THUNDERSTORM',   k:'storm', tMod:-4 },
      { c:'SNOW',           k:'snow',  tMod:-10 },
      { c:'WINDY',          k:'wind',  tMod: 0 },
    ];
    function forecastFor(city) {
      const rng = seedRng(city.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0) + new Date().getDate());
      const baseTemp = city.id==='tokyo'?22 : city.id==='london'?14 : city.id==='nyc'?18 : 24;
      const days = [];
      const today = new Date();
      for (let i=0;i<5;i++) {
        const cond = conditions[Math.floor(rng()*conditions.length)];
        const hi = Math.round(baseTemp + cond.tMod + rng()*4);
        const lo = hi - 5 - Math.round(rng()*4);
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate()+i);
        days.push({
          dow: d.toLocaleDateString('en',{weekday:'short'}).toUpperCase(),
          date: d.getDate(),
          hi, lo,
          cond: cond.c,
          icon: cond.k,
          wind: Math.round(rng()*30 + 4),
          humidity: Math.round(rng()*40 + 40),
        });
      }
      return days;
    }
    function iconSvg(kind) {
      const C = 'var(--cyan-hi)';
      const W = '#caf6ff';
      switch(kind) {
        case 'sun':   return `<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="9" fill="${W}"/><g stroke="${C}" stroke-width="2" stroke-linecap="round"><line x1="25" y1="4" x2="25" y2="11"/><line x1="25" y1="39" x2="25" y2="46"/><line x1="4" y1="25" x2="11" y2="25"/><line x1="39" y1="25" x2="46" y2="25"/><line x1="10" y1="10" x2="15" y2="15"/><line x1="35" y1="35" x2="40" y2="40"/><line x1="40" y1="10" x2="35" y2="15"/><line x1="10" y1="40" x2="15" y2="35"/></g></svg>`;
        case 'pcloud':return `<svg viewBox="0 0 50 50"><circle cx="18" cy="20" r="6" fill="${W}"/><path d="M18 32 q-6 0 -6 -6 q0 -5 5 -6 q1 -6 8 -6 q6 0 8 6 q5 0 5 6 q0 6 -6 6 z" fill="none" stroke="${C}" stroke-width="1.6"/></svg>`;
        case 'cloud': return `<svg viewBox="0 0 50 50"><path d="M14 34 q-7 0 -7 -7 q0 -6 6 -7 q1 -7 9 -7 q7 0 9 7 q6 0 6 7 q0 7 -7 7 z" fill="none" stroke="${C}" stroke-width="1.8"/></svg>`;
        case 'rain':  return `<svg viewBox="0 0 50 50"><path d="M14 28 q-7 0 -7 -7 q0 -6 6 -7 q1 -7 9 -7 q7 0 9 7 q6 0 6 7 q0 7 -7 7 z" fill="none" stroke="${C}" stroke-width="1.6"/><g stroke="${W}" stroke-width="1.5" stroke-linecap="round"><line x1="16" y1="34" x2="14" y2="42"/><line x1="24" y1="34" x2="22" y2="44"/><line x1="32" y1="34" x2="30" y2="42"/></g></svg>`;
        case 'storm': return `<svg viewBox="0 0 50 50"><path d="M14 26 q-7 0 -7 -7 q0 -6 6 -7 q1 -7 9 -7 q7 0 9 7 q6 0 6 7 q0 7 -7 7 z" fill="none" stroke="${C}" stroke-width="1.6"/><path d="M22 28 L18 38 L24 38 L20 46 L30 34 L24 34 L28 28 Z" fill="${W}" stroke="${C}"/></svg>`;
        case 'snow':  return `<svg viewBox="0 0 50 50"><path d="M14 28 q-7 0 -7 -7 q0 -6 6 -7 q1 -7 9 -7 q7 0 9 7 q6 0 6 7 q0 7 -7 7 z" fill="none" stroke="${C}" stroke-width="1.6"/><g fill="${W}"><circle cx="16" cy="38" r="1.6"/><circle cx="24" cy="42" r="1.6"/><circle cx="32" cy="38" r="1.6"/><circle cx="20" cy="44" r="1.4"/><circle cx="28" cy="44" r="1.4"/></g></svg>`;
        case 'wind':  return `<svg viewBox="0 0 50 50"><g fill="none" stroke="${C}" stroke-width="1.8" stroke-linecap="round"><path d="M6 18 H32 q4 0 4 -4 q0 -4 -4 -4"/><path d="M6 26 H38 q4 0 4 4 q0 4 -4 4"/><path d="M6 34 H28"/></g></svg>`;
      }
      return '';
    }

    let activeCity = cities[0].id;
    function render() {
      const city = cities.find(c=>c.id===activeCity);
      const days = forecastFor(city);
      const today = days[0];
      const now = new Date().toLocaleTimeString('en-GB',{timeZone:city.tz, hour:'2-digit',minute:'2-digit'});
      root.innerHTML = `
        <div class="wx-app">
          <div class="wx-cities">
            ${cities.map(c=>`<button class="wx-city ${c.id===activeCity?'sel':''}" data-id="${c.id}">${c.name}</button>`).join('')}
          </div>
          <div class="wx-now">
            <div class="wx-now-ic">${iconSvg(today.icon)}</div>
            <div class="wx-now-temp"><b>${today.hi}°</b><span>${today.lo}°</span></div>
            <div class="wx-now-meta">
              <div class="wx-cond">${today.cond}</div>
              <div class="wx-loc">${city.name} · LOCAL ${now}</div>
              <div class="wx-extra">WIND ${today.wind} km/h · HUMIDITY ${today.humidity}%</div>
            </div>
          </div>
          <div class="wx-divider"><span>5-DAY FORECAST</span></div>
          <div class="wx-days">
            ${days.map((d,i)=>`
              <div class="wx-day ${i===0?'today':''}">
                <div class="wx-dow">${d.dow}</div>
                <div class="wx-d-ic">${iconSvg(d.icon)}</div>
                <div class="wx-d-temp"><b>${d.hi}°</b> / ${d.lo}°</div>
                <div class="wx-d-cond">${d.cond}</div>
              </div>`).join('')}
          </div>
        </div>`;
      root.querySelectorAll('.wx-city').forEach(b=>b.addEventListener('click',()=>{activeCity=b.dataset.id;render();}));
    }
    render();
    win._iv = setInterval(render, 30000);
    win.onClose = () => clearInterval(win._iv);
  }
};

/* ─── 10. CALENDAR — month view + mock events ─── */
OS.apps.calendar = {
  name:'calendar', title:'CALENDAR', icon:'▦', w:560, h:460, singleton:true,
  build(root, win) {
    // Mock events keyed by 'YYYY-MM-DD'
    const mockEvents = [
      { d: 0,  title:'Board meeting',         color:'#3fd9ff', time:'09:00' },
      { d: 0,  title:'AC/DC rehearsal w/ Pepper', color:'#ff7a1f', time:'21:00' },
      { d: 2,  title:'Suit Mk VIII flight test', color:'#5cffa1', time:'13:00' },
      { d: 4,  title:'Press conference',      color:'#ffd24a', time:'10:30' },
      { d: 7,  title:'Workshop · DUM-E upgrade', color:'#3fd9ff' },
      { d:10,  title:'Avengers debrief',      color:'#ff5a6f', time:'15:00' },
      { d:14,  title:'Reactor maintenance',   color:'#5cffa1' },
      { d:18,  title:'Charity gala',          color:'#ffd24a', time:'19:00' },
      { d:21,  title:'Stark Expo prep',       color:'#3fd9ff', time:'11:00' },
      { d:25,  title:'Pepper anniversary 💍', color:'#ff5a6f' },
    ];

    let viewYear  = new Date().getFullYear();
    let viewMonth = new Date().getMonth();
    let selectedDate = new Date().getDate();

    const monthNames = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

    function eventsFor(year, month, day) {
      // Map mock offsets into the current view month
      const dayInMonth = day;
      return mockEvents.filter(e => {
        // events tied to (day-of-month offset) when viewing current real month — show them at e.d + 1
        return (e.d + 1) === dayInMonth;
      });
    }

    function render() {
      const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const today = new Date();
      const isCurrentMonth = today.getFullYear()===viewYear && today.getMonth()===viewMonth;

      const cells = [];
      for (let i=0;i<firstDay;i++) cells.push(`<div class="cal-cell empty"></div>`);
      for (let d=1; d<=daysInMonth; d++) {
        const evts = eventsFor(viewYear, viewMonth, d);
        const isToday = isCurrentMonth && d === today.getDate();
        const isSel   = d === selectedDate;
        const dots = evts.slice(0,3).map(e=>`<span class="cal-dot" style="background:${e.color};box-shadow:0 0 4px ${e.color}"></span>`).join('');
        cells.push(`<div class="cal-cell${isToday?' today':''}${isSel?' sel':''}" data-d="${d}">
          <div class="cal-num">${d}</div>
          <div class="cal-dots">${dots}</div>
        </div>`);
      }

      const selEvents = eventsFor(viewYear, viewMonth, selectedDate);
      root.innerHTML = `
        <div class="cal-app">
          <div class="cal-bar">
            <button class="btn cal-nav" id="cPrev">◂</button>
            <div class="cal-title">${monthNames[viewMonth]} <span>${viewYear}</span></div>
            <button class="btn cal-nav" id="cNext">▸</button>
            <button class="btn cal-today" id="cToday">TODAY</button>
          </div>
          <div class="cal-grid">
            <div class="cal-dow">SUN</div><div class="cal-dow">MON</div><div class="cal-dow">TUE</div><div class="cal-dow">WED</div><div class="cal-dow">THU</div><div class="cal-dow">FRI</div><div class="cal-dow">SAT</div>
            ${cells.join('')}
          </div>
          <div class="cal-events">
            <div class="cal-ev-hd">▸ ${monthNames[viewMonth]} ${selectedDate}, ${viewYear} · ${selEvents.length} EVENT${selEvents.length===1?'':'S'}</div>
            ${selEvents.length === 0
              ? `<div class="cal-ev-none">No scheduled events.</div>`
              : selEvents.map(e=>`<div class="cal-ev"><span class="cal-ev-mark" style="background:${e.color};box-shadow:0 0 6px ${e.color}"></span><span class="cal-ev-time">${e.time||'—'}</span><span class="cal-ev-title">${escapeHtml(e.title)}</span></div>`).join('')
            }
          </div>
        </div>`;

      root.querySelector('#cPrev').addEventListener('click', () => { viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} selectedDate=1; render(); });
      root.querySelector('#cNext').addEventListener('click', () => { viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} selectedDate=1; render(); });
      root.querySelector('#cToday').addEventListener('click', () => {
        const n = new Date(); viewYear=n.getFullYear(); viewMonth=n.getMonth(); selectedDate=n.getDate(); render();
      });
      root.querySelectorAll('.cal-cell[data-d]').forEach(c => c.addEventListener('click', () => {
        selectedDate = parseInt(c.dataset.d); render();
      }));
    }
    render();
  }
};

/* ─── 11. RADAR — world map with mission pins ─── */
OS.apps.radar = {
  name:'radar', title:'RADAR', icon:'⊙', w:680, h:480, singleton:true,
  build(root, win) {
    // Mission pins: lat,lon → mapped to a 720×360 equirectangular SVG
    const missions = [
      { name:'NEW YORK · PORTAL CLOSURE',  lat:40.7,  lon:-74.0,  status:'COMPLETE',  color:'#5cffa1', desc:'Chitauri invasion repelled. Portal sealed.' },
      { name:'MALIBU · WORKSHOP',           lat:34.0,  lon:-118.5, status:'ACTIVE',    color:'#7cf6ff', desc:'Primary base of operations. Mark VII standby.' },
      { name:'SOKOVIA · ULTRON',            lat:44.0,  lon:21.0,   status:'COMPLETE',  color:'#5cffa1', desc:'Ultron neutralized. Civilian evac successful.' },
      { name:'AFGHANISTAN · MK I ORIGIN',   lat:34.5,  lon:69.2,   status:'ARCHIVED',  color:'#ffd24a', desc:'Mark I escape. Where it all began.' },
      { name:'WAKANDA · DIPLOMATIC',        lat:-1.3,  lon:36.8,   status:'MONITOR',   color:'#b89bff', desc:'Vibranium trade negotiations.' },
      { name:'TOKYO · STARK BRANCH',        lat:35.7,  lon:139.7,  status:'ACTIVE',    color:'#7cf6ff', desc:'Asia-Pacific Stark Industries HQ.' },
      { name:'LONDON · MI6 LIAISON',        lat:51.5,  lon:-0.1,   status:'MONITOR',   color:'#b89bff', desc:'Joint intelligence sharing.' },
      { name:'GREENLAND · ARCTIC LOST',     lat:71.7,  lon:-42.6,  status:'ALERT',     color:'#ff5a6f', desc:'Mark III crash site. Equipment recovered.' },
      { name:'SYDNEY · COMMS RELAY',        lat:-33.9, lon:151.2,  status:'ACTIVE',    color:'#7cf6ff', desc:'Southern hemisphere uplink node.' },
      { name:'LAGOS · CONFLICT',            lat:6.5,   lon:3.4,    status:'ALERT',     color:'#ff5a6f', desc:'Avengers-related incident. Under review.' },
    ];

    function project(lat, lon) {
      // equirectangular into 720×360 viewBox
      const x = (lon + 180) * (720/360);
      const y = (90 - lat)  * (360/180);
      return { x, y };
    }

    let activeIdx = 0;
    function render() {
      const m = missions[activeIdx];
      root.innerHTML = `
        <div class="rdr-app">
          <div class="rdr-stage">
            <svg viewBox="0 0 720 360" preserveAspectRatio="xMidYMid meet" id="rdrSvg">
              <!-- grid: lat/lon lines -->
              <g stroke="rgba(63,217,255,0.18)" stroke-width="0.6">
                ${Array.from({length:11},(_,i)=>`<line x1="0" y1="${i*36}" x2="720" y2="${i*36}"/>`).join('')}
                ${Array.from({length:13},(_,i)=>`<line x1="${i*60}" y1="0" x2="${i*60}" y2="360"/>`).join('')}
              </g>
              <g stroke="rgba(63,217,255,0.35)" stroke-width="0.8">
                <line x1="0" y1="180" x2="720" y2="180"/>
                <line x1="360" y1="0" x2="360" y2="360"/>
              </g>
              <!-- crude continent outlines (simplified polygons) -->
              <g fill="rgba(63,217,255,0.10)" stroke="rgba(124,246,255,0.55)" stroke-width="0.8">
                <!-- North America -->
                <path d="M85,90 L130,75 L175,80 L210,105 L230,140 L195,170 L170,165 L150,180 L120,165 L95,140 Z"/>
                <!-- South America -->
                <path d="M205,200 L230,200 L240,235 L235,275 L210,295 L195,265 L195,225 Z"/>
                <!-- Europe -->
                <path d="M340,95 L380,85 L405,100 L400,125 L370,130 L345,120 Z"/>
                <!-- Africa -->
                <path d="M355,150 L400,145 L425,175 L425,225 L405,270 L380,275 L360,235 L355,195 Z"/>
                <!-- Asia -->
                <path d="M410,80 L500,75 L580,95 L620,130 L600,165 L540,170 L490,150 L450,135 L420,115 Z"/>
                <!-- India -->
                <path d="M495,155 L520,155 L525,195 L510,195 Z"/>
                <!-- Southeast Asia -->
                <path d="M570,170 L610,170 L620,200 L595,210 L575,195 Z"/>
                <!-- Australia -->
                <path d="M590,255 L645,250 L660,285 L630,300 L595,290 Z"/>
              </g>
              <!-- radar sweep -->
              <g class="rdr-sweep">
                <circle cx="360" cy="180" r="160" fill="none" stroke="rgba(63,217,255,0.25)"/>
                <circle cx="360" cy="180" r="100" fill="none" stroke="rgba(63,217,255,0.20)"/>
                <circle cx="360" cy="180" r="50" fill="none" stroke="rgba(63,217,255,0.18)"/>
              </g>
              <!-- mission pins -->
              <g>
                ${missions.map((mi,i)=>{
                  const p = project(mi.lat, mi.lon);
                  const sel = i===activeIdx;
                  return `<g class="rdr-pin ${sel?'sel':''}" data-i="${i}" style="cursor:pointer">
                    <circle cx="${p.x}" cy="${p.y}" r="${sel?6:4}" fill="${mi.color}" stroke="#fff" stroke-width="0.8"/>
                    <circle cx="${p.x}" cy="${p.y}" r="${sel?14:10}" fill="none" stroke="${mi.color}" stroke-width="0.7" opacity="0.6">
                      <animate attributeName="r" from="${sel?6:4}" to="${sel?22:16}" dur="1.8s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" from="0.8" to="0" dur="1.8s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="${p.x}" cy="${p.y}" r="18" fill="transparent" class="rdr-hit"/>
                  </g>`;
                }).join('')}
              </g>
            </svg>
          </div>
          <div class="rdr-panel">
            <div class="rdr-hd">▸ MISSION INTEL</div>
            <div class="rdr-card" style="border-color:${m.color}">
              <div class="rdr-name">${escapeHtml(m.name)}</div>
              <div class="rdr-meta">
                <span class="rdr-status" style="color:${m.color}">● ${m.status}</span>
                <span>${m.lat.toFixed(1)}°, ${m.lon.toFixed(1)}°</span>
              </div>
              <div class="rdr-desc">${escapeHtml(m.desc)}</div>
            </div>
            <div class="rdr-list">
              ${missions.map((mi,i)=>`<button class="rdr-it ${i===activeIdx?'sel':''}" data-i="${i}">
                <span class="rdr-dot" style="background:${mi.color};box-shadow:0 0 4px ${mi.color}"></span>${escapeHtml(mi.name)}
              </button>`).join('')}
            </div>
          </div>
        </div>`;
      root.querySelectorAll('.rdr-pin').forEach(g => g.addEventListener('click', () => { activeIdx = parseInt(g.dataset.i); render(); }));
      root.querySelectorAll('.rdr-it').forEach(b => b.addEventListener('click', () => { activeIdx = parseInt(b.dataset.i); render(); }));
    }
    render();
  }
};

/* ─── 12. HOLOGRAPHIC WORKSHOP — drag-to-rotate Mark VII wireframe with annotation pins ─── */
OS.apps.hologram = {
  name:'hologram', title:'HOLOGRAM', icon:'◈', w:640, h:540, singleton:true,
  build(root, win) {
    // Parts of the suit, each with a 3D anchor point (in normalized -1..1 space, before scale)
    // x: left/right (mirrored automatically for repulsors), y: down is positive (since SVG y grows down), z: depth
    const parts = [
      { id:'helmet',    name:'HELMET',          anchor:[0,   -0.85, 0],   info:'Mark VII Helmet · titanium-gold alloy · HUD visor: 4K stereoscopic, 0.2ms latency. Heads-up display projects directly onto the inner faceplate.' },
      { id:'reactor',   name:'ARC REACTOR',     anchor:[0,   -0.05, 0.35],info:'Vibranium-cored arc reactor · 3 GJ/s sustained output · palladium-free since Mark VI. The heart of the suit.' },
      { id:'shoulder_l',name:'LEFT SHOULDER',   anchor:[-0.55,-0.35, 0],  info:'Pauldron servo cluster · houses micro-missile launcher (6 × M-114 darts) and flare pods. Articulation: 270° range.' },
      { id:'shoulder_r',name:'RIGHT SHOULDER',  anchor:[ 0.55,-0.35, 0],  info:'Counterbalanced pauldron · contains the secondary repulsor power conduit and a deployable comms antenna.' },
      { id:'rep_l',     name:'LEFT REPULSOR',   anchor:[-0.80, 0.15, 0],  info:'Mark IV Repulsor · directed-energy projector · 8 MW peak output · also used for flight stabilization.' },
      { id:'rep_r',     name:'RIGHT REPULSOR',  anchor:[ 0.80, 0.15, 0],  info:'Mirror of the left repulsor. Together they handle 60% of in-flight maneuvering thrust.' },
      { id:'thrust_l',  name:'LEFT BOOT THRUSTER', anchor:[-0.30, 0.95, 0], info:'Primary lift thruster · vectored nozzle · sustains Mach 3 cruise. Combined with the right thruster: Mach 8.4 burst.' },
      { id:'thrust_r',  name:'RIGHT BOOT THRUSTER',anchor:[ 0.30, 0.95, 0], info:'Symmetrical thruster · features ice-prevention heating coil added after the Mark III incident.' },
    ];

    root.innerHTML = `
      <div class="holo-app">
        <div class="holo-toolbar">
          <button class="btn" id="hPause">⏸ AUTO-ROTATE</button>
          <button class="btn" id="hReset">↺ RESET VIEW</button>
          <span class="holo-tip">▸ DRAG to rotate · CLICK a pin for details · CTRL+H to toggle</span>
        </div>
        <div class="holo-stage" id="hStage">
          <svg id="hSvg" viewBox="-160 -200 320 400" preserveAspectRatio="xMidYMid meet"></svg>
          <div class="holo-readout" id="hRead">
            <div class="holo-rd-title">▸ MARK VII · SUIT SCHEMATIC</div>
            <div class="holo-rd-body">Click any glowing pin on the suit to display annotation. Drag the diagram to rotate.</div>
          </div>
        </div>
        <div class="holo-legend">
          ${parts.map(p => `<button class="holo-leg" data-id="${p.id}">◆ ${p.name}</button>`).join('')}
        </div>
      </div>`;

    const svg     = root.querySelector('#hSvg');
    const stage   = root.querySelector('#hStage');
    const readEl  = root.querySelector('#hRead');
    const pauseBtn= root.querySelector('#hPause');
    const resetBtn= root.querySelector('#hReset');

    // ── State ──
    let yaw = -0.25;   // rotation around Y axis (radians)
    let pitch = -0.08; // rotation around X axis
    let auto = true;
    let dragging = false, lastX = 0, lastY = 0;

    // ── 3D primitives ──
    function rotateXY([x,y,z]) {
      // Yaw (around Y): x and z mix
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      let x1 = x*cy + z*sy;
      let z1 = -x*sy + z*cy;
      // Pitch (around X): y and z mix
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      let y1 = y*cp - z1*sp;
      let z2 = y*sp + z1*cp;
      return [x1, y1, z2];
    }
    // Project 3D point to 2D with simple perspective
    function project(p, scale) {
      const [x,y,z] = rotateXY(p);
      const cam = 4;                  // camera distance
      const f   = cam / (cam - z);    // perspective factor
      return { x: x*scale*f, y: y*scale*f, z, f };
    }

    // ── Suit wireframe model ──
    // A stylized Iron Man torso/head/limbs as line segments + key points.
    // Coordinates are in normalized units (-1..1ish); we'll scale at draw time.
    const SCALE = 130;
    const lines = [
      // Helmet outline (front-facing arch)
      [[-0.30,-1.05, 0.30],[ 0.30,-1.05, 0.30]],
      [[ 0.30,-1.05, 0.30],[ 0.42,-0.78, 0.20]],
      [[-0.30,-1.05, 0.30],[-0.42,-0.78, 0.20]],
      [[-0.42,-0.78, 0.20],[ 0.42,-0.78, 0.20]],
      [[-0.30,-1.05,-0.30],[ 0.30,-1.05,-0.30]],
      [[ 0.30,-1.05,-0.30],[ 0.42,-0.78,-0.20]],
      [[-0.30,-1.05,-0.30],[-0.42,-0.78,-0.20]],
      [[-0.42,-0.78,-0.20],[ 0.42,-0.78,-0.20]],
      // Helmet sides
      [[-0.30,-1.05, 0.30],[-0.30,-1.05,-0.30]],
      [[ 0.30,-1.05, 0.30],[ 0.30,-1.05,-0.30]],
      [[-0.42,-0.78, 0.20],[-0.42,-0.78,-0.20]],
      [[ 0.42,-0.78, 0.20],[ 0.42,-0.78,-0.20]],
      // Eye slits (visor lines)
      [[-0.22,-0.93, 0.31],[-0.08,-0.93, 0.31]],
      [[ 0.08,-0.93, 0.31],[ 0.22,-0.93, 0.31]],
      // Neck
      [[-0.18,-0.78, 0.15],[-0.18,-0.55, 0.15]],
      [[ 0.18,-0.78, 0.15],[ 0.18,-0.55, 0.15]],
      [[-0.18,-0.78,-0.15],[-0.18,-0.55,-0.15]],
      [[ 0.18,-0.78,-0.15],[ 0.18,-0.55,-0.15]],
      // Torso top (shoulders)
      [[-0.70,-0.45, 0.25],[ 0.70,-0.45, 0.25]],
      [[-0.70,-0.45,-0.25],[ 0.70,-0.45,-0.25]],
      [[-0.70,-0.45, 0.25],[-0.70,-0.45,-0.25]],
      [[ 0.70,-0.45, 0.25],[ 0.70,-0.45,-0.25]],
      // Torso bottom (waist)
      [[-0.45, 0.45, 0.20],[ 0.45, 0.45, 0.20]],
      [[-0.45, 0.45,-0.20],[ 0.45, 0.45,-0.20]],
      [[-0.45, 0.45, 0.20],[-0.45, 0.45,-0.20]],
      [[ 0.45, 0.45, 0.20],[ 0.45, 0.45,-0.20]],
      // Torso vertical edges
      [[-0.70,-0.45, 0.25],[-0.45, 0.45, 0.20]],
      [[ 0.70,-0.45, 0.25],[ 0.45, 0.45, 0.20]],
      [[-0.70,-0.45,-0.25],[-0.45, 0.45,-0.20]],
      [[ 0.70,-0.45,-0.25],[ 0.45, 0.45,-0.20]],
      // Chest "V" shapes
      [[-0.35,-0.30, 0.30],[ 0.00,-0.05, 0.35]],
      [[ 0.35,-0.30, 0.30],[ 0.00,-0.05, 0.35]],
      [[ 0.00,-0.05, 0.35],[ 0.00, 0.25, 0.25]],
      // Left arm (shoulder → elbow → repulsor)
      [[-0.70,-0.40, 0.10],[-0.80, 0.00, 0.05]],
      [[-0.80, 0.00, 0.05],[-0.85, 0.30, 0.00]],
      [[-0.85, 0.30, 0.00],[-0.80, 0.15, 0.00]],
      // Right arm
      [[ 0.70,-0.40, 0.10],[ 0.80, 0.00, 0.05]],
      [[ 0.80, 0.00, 0.05],[ 0.85, 0.30, 0.00]],
      [[ 0.85, 0.30, 0.00],[ 0.80, 0.15, 0.00]],
      // Left leg
      [[-0.30, 0.45, 0.15],[-0.32, 0.85, 0.10]],
      [[-0.32, 0.85, 0.10],[-0.30, 1.05, 0.05]],
      // Right leg
      [[ 0.30, 0.45, 0.15],[ 0.32, 0.85, 0.10]],
      [[ 0.32, 0.85, 0.10],[ 0.30, 1.05, 0.05]],
      // Belt accent
      [[-0.45, 0.45, 0.21],[ 0.45, 0.45, 0.21]],
    ];

    // Repulsor + reactor disk vertices (drawn as filled circles)
    const disks = [
      { center:[ 0.00,-0.05, 0.36], r: 22, glow: true,  partId:'reactor' },
      { center:[-0.80, 0.15, 0.01], r: 12, glow: true,  partId:'rep_l' },
      { center:[ 0.80, 0.15, 0.01], r: 12, glow: true,  partId:'rep_r' },
      { center:[-0.30, 1.10, 0.05], r: 10, glow: true,  partId:'thrust_l' },
      { center:[ 0.30, 1.10, 0.05], r: 10, glow: true,  partId:'thrust_r' },
    ];

    let activeId = null;

    function setActive(id) {
      activeId = id;
      const p = parts.find(x => x.id === id);
      if (p) {
        readEl.innerHTML = `<div class="holo-rd-title">▸ ${escapeHtml(p.name)}</div><div class="holo-rd-body">${escapeHtml(p.info)}</div>`;
        readEl.classList.add('show');
      }
    }

    function draw() {
      // Clear and redraw
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // Background concentric circles (HUD context)
      for (let r of [180, 140, 100, 60]) {
        const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx', 0); c.setAttribute('cy', 0); c.setAttribute('r', r);
        c.setAttribute('fill', 'none'); c.setAttribute('stroke', 'rgba(63,217,255,0.10)');
        c.setAttribute('stroke-width', '0.6');
        if (r === 140) c.setAttribute('stroke-dasharray', '4 6');
        svg.appendChild(c);
      }
      // Compass ticks
      for (let a = 0; a < 360; a += 15) {
        const t = a * Math.PI/180;
        const r1 = 178, r2 = a%45===0 ? 168 : 173;
        const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
        ln.setAttribute('x1', Math.cos(t)*r1); ln.setAttribute('y1', Math.sin(t)*r1);
        ln.setAttribute('x2', Math.cos(t)*r2); ln.setAttribute('y2', Math.sin(t)*r2);
        ln.setAttribute('stroke', 'rgba(63,217,255,0.25)'); ln.setAttribute('stroke-width', '0.8');
        svg.appendChild(ln);
      }

      // Suit wireframe lines (depth-sorted: draw back lines first, fainter)
      const projLines = lines.map(([a,b]) => {
        const pa = project(a, SCALE);
        const pb = project(b, SCALE);
        const zAvg = (pa.z + pb.z) / 2;
        return { pa, pb, zAvg };
      }).sort((u,v) => u.zAvg - v.zAvg);

      for (const { pa, pb, zAvg } of projLines) {
        const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
        ln.setAttribute('x1', pa.x); ln.setAttribute('y1', pa.y);
        ln.setAttribute('x2', pb.x); ln.setAttribute('y2', pb.y);
        // Depth tint: back lines dim, front lines bright
        const t = (zAvg + 0.5) / 1.0; // ~0 (back) → ~1 (front)
        const op = 0.25 + 0.7 * Math.max(0, Math.min(1, t));
        const w  = 0.7 + 1.1 * Math.max(0, Math.min(1, t));
        ln.setAttribute('stroke', `rgba(124,246,255,${op.toFixed(3)})`);
        ln.setAttribute('stroke-width', w.toFixed(2));
        ln.setAttribute('stroke-linecap', 'round');
        svg.appendChild(ln);
      }

      // Disks (reactor + repulsors + thrusters) — depth sorted
      const projDisks = disks.map(d => {
        const p = project(d.center, SCALE);
        return { ...d, p };
      }).sort((u,v) => u.p.z - v.p.z);

      for (const d of projDisks) {
        const radius = d.r * d.p.f;
        const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx', d.p.x); c.setAttribute('cy', d.p.y);
        c.setAttribute('r', radius);
        const t = (d.p.z + 0.5) / 1.0;
        const alpha = 0.4 + 0.6 * Math.max(0, Math.min(1, t));
        c.setAttribute('fill', `rgba(124,246,255,${(alpha*0.5).toFixed(3)})`);
        c.setAttribute('stroke', `rgba(255,255,255,${alpha.toFixed(3)})`);
        c.setAttribute('stroke-width', '1.4');
        c.setAttribute('filter', 'url(#hGlow)');
        svg.appendChild(c);
      }

      // SVG filter for glow
      const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
      defs.innerHTML = `<filter id="hGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
      svg.appendChild(defs);

      // Annotation pins (only for parts whose anchor is on the visible side — z > -0.3)
      for (const part of parts) {
        const p = project(part.anchor, SCALE);
        if (p.z < -0.35) continue; // hide pins facing away
        const isActive = activeId === part.id;
        // Pin: a small ring + a tick line + a label
        const g = document.createElementNS('http://www.w3.org/2000/svg','g');
        g.setAttribute('class', 'holo-pin' + (isActive ? ' active' : ''));
        g.style.cursor = 'pointer';
        const ring = document.createElementNS('http://www.w3.org/2000/svg','circle');
        ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y);
        ring.setAttribute('r', isActive ? 6 : 4);
        ring.setAttribute('fill', isActive ? '#caf6ff' : 'rgba(124,246,255,0.85)');
        ring.setAttribute('stroke', '#fff');
        ring.setAttribute('stroke-width', '1');
        // Click target (bigger invisible)
        const hit = document.createElementNS('http://www.w3.org/2000/svg','circle');
        hit.setAttribute('cx', p.x); hit.setAttribute('cy', p.y); hit.setAttribute('r', 14);
        hit.setAttribute('fill', 'transparent');
        hit.addEventListener('click', (e) => { e.stopPropagation(); setActive(part.id); });
        g.appendChild(ring); g.appendChild(hit);
        svg.appendChild(g);
      }
    }

    // Auto-rotation
    let rafId;
    function loop() {
      if (auto) yaw += 0.006;
      draw();
      rafId = requestAnimationFrame(loop);
    }
    loop();

    // Drag-to-rotate
    stage.addEventListener('mousedown', (e) => {
      // Don't intercept clicks on legend buttons or pin hit areas — those are on svg
      if (e.target.closest('.holo-legend')) return;
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      auto = false;
      pauseBtn.textContent = '▶ AUTO-ROTATE';
      stage.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      yaw   += dx * 0.01;
      pitch += dy * 0.006;
      pitch = Math.max(-1.0, Math.min(1.0, pitch));
      lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      stage.classList.remove('dragging');
    });

    pauseBtn.addEventListener('click', () => {
      auto = !auto;
      pauseBtn.textContent = auto ? '⏸ AUTO-ROTATE' : '▶ AUTO-ROTATE';
    });
    resetBtn.addEventListener('click', () => {
      yaw = -0.25; pitch = -0.08;
    });

    // Legend buttons select a part
    root.querySelectorAll('.holo-leg').forEach(b => {
      b.addEventListener('click', () => setActive(b.dataset.id));
    });

    win.onClose = () => cancelAnimationFrame(rafId);
  }
};
