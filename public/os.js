/* ═══════════════ JARVIS-OS · Core engine ═══════════════ */

const OS = {
  apps: {},        // registry: name -> { title, icon, build(el, win), w, h }
  windows: [],     // open windows
  zTop: 100,
  activeWin: null,
  settings: { wallpaper: 'default', accent: 'cyan' },
  user: null,      // set during boot via the identity prompt
};

/* ───── Identity helpers ───── */
function getStoredUser() {
  try { return localStorage.getItem('jarvis.user') || null; } catch { return null; }
}
function setStoredUser(name) {
  try { localStorage.setItem('jarvis.user', name); } catch {}
}
function userSlug(name) {
  return (name || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'guest';
}
function userHonorific(name) {
  const first = (name || '').trim().split(/\s+/)[0] || 'sir';
  return first;
}

/* ───── Boot sequence ───── */
function bootLinesFor(name) {
  return [
    "[BOOT] Initializing Stark OS kernel v9.3 ...",
    "[BOOT] Mounting <b>/dev/arc-reactor</b> ... OK",
    "[BOOT] Calibrating repulsor array ... OK",
    "[BOOT] Magnetic containment field ... STABLE",
    "[BOOT] Loading <b>J.A.R.V.I.S.</b> language core ...",
    "[BOOT] Establishing uplink to <b>STARK-NET</b> ...",
    "[BOOT] Holographic UI subsystem ... ONLINE",
    `[BOOT] User identity verified — <b>${name.toUpperCase()}</b>`,
    `[BOOT] Welcome, ${userHonorific(name)}.`,
  ];
}

function runBoot() {
  const log = document.getElementById('bootLog');
  const bar = document.getElementById('bootBarFill');

  // Phase 1: pre-identity boot lines (always 6, runs even if returning user)
  const preLines = [
    "[BOOT] Initializing Stark OS kernel v9.3 ...",
    "[BOOT] Mounting <b>/dev/arc-reactor</b> ... OK",
    "[BOOT] Calibrating repulsor array ... OK",
    "[BOOT] Magnetic containment field ... STABLE",
    "[BOOT] Loading <b>J.A.R.V.I.S.</b> language core ...",
    "[BOOT] Establishing uplink to <b>STARK-NET</b> ...",
  ];
  let i = 0;
  const tick = () => {
    if (i < preLines.length) {
      log.innerHTML += preLines[i] + "<br/>";
      bar.style.width = ((i+1)/(preLines.length+3)*100) + '%';
      log.scrollTop = log.scrollHeight;
      i++;
      setTimeout(tick, 320 + Math.random()*180);
    } else {
      promptIdentityThenFinish();
    }
  };
  setTimeout(tick, 500);
}

function promptIdentityThenFinish() {
  const log = document.getElementById('bootLog');
  const bar = document.getElementById('bootBarFill');

  // Finish the boot log and reveal the desktop
  const finishBoot = (name) => {
    OS.user = name;
    setStoredUser(name);
    const tail = [
      "[BOOT] Holographic UI subsystem ... ONLINE",
      `[BOOT] User identity verified — <b>${escapeHtmlSafe(name).toUpperCase()}</b>`,
      `[BOOT] Welcome, ${escapeHtmlSafe(userHonorific(name))}.`,
    ];
    let j = 0;
    const flush = () => {
      if (j < tail.length) {
        log.innerHTML += tail[j] + "<br/>";
        bar.style.width = ((6 + j + 1) / 9 * 100) + '%';
        log.scrollTop = log.scrollHeight;
        j++;
        setTimeout(flush, 320 + Math.random()*180);
      } else {
        setTimeout(() => {
          document.getElementById('boot').classList.add('fade');
          setTimeout(() => {
            document.getElementById('boot').style.display = 'none';
            document.getElementById('desktop').classList.remove('hidden');
            mountDesktop();
          }, 900);
        }, 500);
      }
    };
    flush();
  };

  // Returning user — skip the prompt
  const stored = getStoredUser();
  if (stored) {
    log.innerHTML += `<span style="color:#7cf6ff">[AUTH] Returning user detected — <b>${escapeHtmlSafe(stored.toUpperCase())}</b></span><br/>`;
    setTimeout(() => finishBoot(stored), 600);
    return;
  }

  // First-time user: ask for a name
  log.innerHTML += `<span style="color:#7cf6ff">[AUTH] Awaiting identity verification ...</span><br/>`;
  const promptEl = document.createElement('div');
  promptEl.className = 'boot-prompt';
  promptEl.innerHTML = `
    <div class="bp-q">▸ STATE YOUR NAME</div>
    <div class="bp-row">
      <span class="bp-caret">›</span>
      <input id="bpName" autocomplete="off" spellcheck="false" maxlength="32" placeholder="enter name and press ENTER" />
    </div>
    <div class="bp-hint">JARVIS will address you by this name throughout the session.</div>`;
  document.querySelector('.boot-inner').appendChild(promptEl);
  const inp = promptEl.querySelector('#bpName');
  setTimeout(() => inp.focus(), 50);

  const submit = () => {
    let name = inp.value.trim();
    if (!name) name = 'Guest';
    name = name.replace(/[<>]/g, '').slice(0, 32);
    promptEl.classList.add('done');
    promptEl.querySelector('.bp-q').textContent = `▸ IDENTITY ACCEPTED: ${name.toUpperCase()}`;
    inp.disabled = true;
    setTimeout(() => { promptEl.remove(); finishBoot(name); }, 700);
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

// safe escape used both pre- and post-boot
function escapeHtmlSafe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

/* ───── Top bar clock & mock stats ───── */
function startTopBar() {
  const tbTime = document.getElementById('tbTime');
  const tbDate = document.getElementById('tbDate');
  const tbCpu = document.getElementById('tbCpu');
  const tbMem = document.getElementById('tbMem');
  const tbBat = document.getElementById('tbBat');
  const banner = document.getElementById('tbBanner');
  const banners = [
    "ALL SYSTEMS NOMINAL",
    "ARC REACTOR · STABLE",
    "STARK-NET · SECURE UPLINK",
    "WORKSHOP · CLIMATE OK",
    "MARK VII · STANDBY",
  ];
  let bi = 0;
  setInterval(() => {
    const d = new Date();
    tbTime.textContent = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    tbDate.textContent = d.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'}).toUpperCase();
    tbCpu.textContent = (10 + Math.random()*8).toFixed(0);
    tbMem.textContent = (40 + Math.random()*6).toFixed(0);
    tbBat.textContent = (95 + Math.random()*5).toFixed(0) + '%';
  }, 1000);
  setInterval(() => { bi = (bi+1)%banners.length; banner.textContent = banners[bi]; }, 5000);
}

/* ───── Right rail live update (arc reactor + telemetry + env) ───── */
async function updateArcHud() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setBar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%'; };
  try {
    const r = await fetch('/api/diagnostics').then(r=>r.json());

    // Arc reactor visual
    set('arcPct', r.arcReactor.toFixed(1));
    set('suitPct', r.suitPower.toFixed(1) + '%');
    const ring = document.getElementById('arcRing');
    if (ring) {
      const C = 2 * Math.PI * 62;
      ring.setAttribute('stroke-dasharray', C);
      ring.setAttribute('stroke-dashoffset', C * (1 - r.arcReactor/100));
    }

    // Telemetry
    set('rtThr', r.thrusters.toFixed(0) + '%'); setBar('rtThrBar', r.thrusters);
    set('rtRep', r.repulsors.toFixed(0) + '%'); setBar('rtRepBar', r.repulsors);
    set('rtShd', r.shielding.toFixed(0) + '%'); setBar('rtShdBar', r.shielding);
    set('rtCom', r.comms.toFixed(0)     + '%'); setBar('rtComBar', r.comms);

    // Environment
    set('rtAlt', Math.round(r.altitude).toLocaleString() + ' FT');
    set('rtTmp', r.temperature.toFixed(1) + '°C');
  } catch(e) {
    // graceful fallback so the panel never sits empty
    set('arcPct', '—'); set('suitPct', '—');
    ['rtThr','rtRep','rtShd','rtCom','rtAlt','rtTmp'].forEach(id => set(id, '—'));
  }
}

/* ───── Window management ───── */
function openApp(name) {
  const app = OS.apps[name];
  if (!app) return;
  // if already open & singleton, focus
  if (app.singleton) {
    const existing = OS.windows.find(w => w.app === name);
    if (existing) { focusWindow(existing); return; }
  }
  const win = createWindow(app);
  app.build(win.body, win);
  focusWindow(win);
  refreshDock();
}

function createWindow(app) {
  const el = document.createElement('div');
  el.className = 'win';
  const w = app.w || 480, h = app.h || 340;
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  const wrap = document.getElementById('windows');
  const cx = window.innerWidth/2 - w/2 + (Math.random()*120 - 60);
  const cy = window.innerHeight/2 - h/2 + (Math.random()*80 - 40);
  el.style.left = Math.max(20, cx) + 'px';
  el.style.top  = Math.max(50, cy) + 'px';

  el.innerHTML = `
    <div class="titlebar">
      <span class="tb-title">◆ ${app.title}</span>
      <span class="tb-ctrls">
        <button class="min" title="Minimize">_</button>
        <button class="max" title="Maximize">▢</button>
        <button class="close" title="Close">✕</button>
      </span>
    </div>
    <div class="body"></div>
    <div class="resize"></div>
  `;
  wrap.appendChild(el);

  const win = {
    el, body: el.querySelector('.body'), app: app.name, minimized:false, maximized:false,
    prev:null,
  };
  OS.windows.push(win);

  // drag
  const tb = el.querySelector('.titlebar');
  tb.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    focusWindow(win);
    if (win.maximized) return;
    tb.classList.add('dragging');
    const sx = e.clientX, sy = e.clientY;
    const ox = parseInt(el.style.left), oy = parseInt(el.style.top);
    const move = (e) => {
      el.style.left = (ox + e.clientX - sx) + 'px';
      el.style.top  = Math.max(36, oy + e.clientY - sy) + 'px';
    };
    const up = () => {
      tb.classList.remove('dragging');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // resize
  const rz = el.querySelector('.resize');
  rz.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    focusWindow(win);
    const sx = e.clientX, sy = e.clientY;
    const ow = el.offsetWidth, oh = el.offsetHeight;
    const move = (e) => {
      el.style.width = Math.max(280, ow + e.clientX - sx) + 'px';
      el.style.height = Math.max(180, oh + e.clientY - sy) + 'px';
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // controls
  el.querySelector('.close').addEventListener('click', () => closeWindow(win));
  el.querySelector('.min').addEventListener('click', () => minimizeWindow(win));
  el.querySelector('.max').addEventListener('click', () => toggleMax(win));

  el.addEventListener('mousedown', () => focusWindow(win));

  return win;
}

function focusWindow(win) {
  OS.zTop++;
  win.el.style.zIndex = OS.zTop;
  OS.windows.forEach(w => w.el.classList.remove('active'));
  win.el.classList.add('active');
  if (win.minimized) {
    win.minimized = false;
    win.el.style.display = '';
  }
  OS.activeWin = win;
  refreshDock();
}

function closeWindow(win) {
  win.el.remove();
  OS.windows = OS.windows.filter(w => w !== win);
  if (win.onClose) win.onClose();
  refreshDock();
}
function minimizeWindow(win) {
  win.minimized = true;
  win.el.style.display = 'none';
  refreshDock();
}
function toggleMax(win) {
  if (!win.maximized) {
    win.prev = { l: win.el.style.left, t: win.el.style.top, w: win.el.style.width, h: win.el.style.height };
    win.el.style.left = '0px';
    win.el.style.top  = '36px';
    win.el.style.width = window.innerWidth + 'px';
    win.el.style.height = (window.innerHeight - 36 - 80) + 'px';
    win.maximized = true;
  } else {
    Object.assign(win.el.style, { left: win.prev.l, top: win.prev.t, width: win.prev.w, height: win.prev.h });
    win.maximized = false;
  }
}

/* ───── Dock & desktop icons ───── */
function refreshDock() {
  const dock = document.getElementById('dock');
  dock.innerHTML = '';
  Object.values(OS.apps).filter(a => a.dock !== false).forEach(app => {
    const running = OS.windows.some(w => w.app === app.name);
    const d = document.createElement('div');
    d.className = 'dock-item' + (running ? ' running' : '');
    d.innerHTML = `<span>${app.icon}</span><div class="tip">${app.title}</div>`;
    d.addEventListener('click', () => {
      const existing = OS.windows.find(w => w.app === app.name);
      if (existing) {
        if (existing.minimized || OS.activeWin !== existing) focusWindow(existing);
        else minimizeWindow(existing);
      } else openApp(app.name);
    });
    dock.appendChild(d);
  });
}

function mountDicons() {
  const di = document.getElementById('dicons');
  di.innerHTML = '';
  Object.values(OS.apps).filter(a => a.desktop !== false).forEach(app => {
    const el = document.createElement('div');
    el.className = 'dicon';
    el.innerHTML = `<div class="ic">${app.icon}</div><div class="lbl">${app.title}</div>`;
    el.addEventListener('dblclick', () => openApp(app.name));
    el.addEventListener('click', () => {
      // single click also opens for accessibility
      if (!el._t) { el._t = setTimeout(() => { el._t = null; openApp(app.name); }, 220); }
      else { clearTimeout(el._t); el._t = null; }
    });
    di.appendChild(el);
  });
}

/* ───── Bonus: Holographic Workshop hotkey (Ctrl+H) ───── */
function setupHologramHotkey() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      openApp('hologram');
    }
  });
}

/* ───── Boot the whole desktop ───── */
function mountDesktop() {
  startTopBar();
  // show identified user in the top status bar
  const tbUser = document.getElementById('tbUser');
  if (tbUser) tbUser.textContent = (OS.user || 'GUEST').toUpperCase();
  // desktop icons removed — apps are launched from the dock
  refreshDock();
  setInterval(updateArcHud, 1500);
  updateArcHud();
  setupHologramHotkey();
  // welcome popup: open JARVIS terminal
  setTimeout(() => openApp('jarvis'), 400);
}

/* ───── start boot ───── */
window.addEventListener('DOMContentLoaded', runBoot);
