# JARVIS-OS

A browser-based webOS in the style of Tony Stark's workshop computer from the
Iron Man films. Built as a guided remix of the
[Hack Club webOS jam](https://jams.hackclub.com/batch/webOS), but reskinned end-to-end
with a cinematic HUD aesthetic, an Express backend, and several apps the original
guide didn't cover.

## Run it

```bash
cd jarvis-os
npm install
npm start
# open http://localhost:3000   ← IMPORTANT: open via http, not by double-clicking the file
```

No password — anyone can poke around. You'll be asked to enter a name on first boot;
JARVIS will then address you by that name everywhere (terminal prompt, chat, status bar).

JARVIS is a rule-based persona — he replies with movie-flavored canned responses
to keywords like *hello, status, time, weather, music, suit, joke, help, thanks*…

## Troubleshooting "Connection failed"

The most common cause is opening `public/index.html` **directly from your file system**
(URL starts with `file://`). The browser apps can't reach the backend that way.

Always open the app via the server: <http://localhost:3000>

## What's in the box

**Desktop & shell**
- Boot-up sequence (Stark Industries logo, JARVIS init log, progress bar)
- Top status bar — clock, date, CPU/MEM/NET/weather, rotating banner
- HUD overlays — concentric spinning reticles, scanning grid, corner brackets
- Live **Arc Reactor power gauge** in the bottom-right corner, fed by the backend
- Bottom dock + desktop icons in faceted hexagonal HUD frames
- Frosted-glass windows that **drag, resize, minimize, maximize, close**
- z-index focus management, active-window glow

**Apps (11)**
1. **J.A.R.V.I.S.** terminal — chat with a rule-based persona with the movie tone, typed out character-by-character
2. **Files** — folder navigation backed by the server, click to preview text contents
3. **Notepad** — full CRUD against the server (`/api/notes`, persisted to JSON on disk)
4. **Calculator** — full keyboard, history line
5. **Music** — Web Audio synth that actually plays mini riffs of *Iron Man*, AC/DC, Stark theme — with a spinning disc and a live audio visualizer
6. **Settings** — tabbed: 12 wallpapers, 8 accent colors, HUD effect toggles, user identity
7. **Chrono** — local time + 6 world clocks (Malibu, NYC, London, Tokyo, Sokovia, Wakanda)
8. **Weather** — animated 5-day forecast for Malibu / NYC / London / Tokyo with hand-drawn SVG icons (sun, clouds, rain, thunder, snow, wind)
9. **Calendar** — month view with prev/next navigation, click-a-day to view events, color-coded mock Stark agenda
10. **Radar** — equirectangular world map with pulsing mission pins (NYC, Sokovia, Malibu, Wakanda, etc.) + animated radar sweep, click pins for intel
11. **Hologram** — drag-to-rotate 3D wireframe Mark VII suit with clickable annotation pins

**Backend (`/server/index.js`)**
- `GET  /api/notes` · `POST /api/notes` · `DELETE /api/notes/:id`
- `GET  /api/files`
- `GET  /api/diagnostics` — telemetry that drifts every 1.5 s and feeds the HUD and diagnostics app
- `POST /api/jarvis` — rule-based persona engine returning movie-flavored replies

## ✨ Bonus feature (beyond the guide)

**Holographic Workshop** — press **Ctrl+H** anywhere, or click the ◈ tile in the dock,
or hit `LAUNCH` in Settings → Tools. Opens a window with a custom-built 3D-projected
wireframe Mark VII suit you can:

- **Drag to rotate** in any direction (auto-rotation toggleable)
- **Click any pin** on the suit (helmet, arc reactor, repulsors, thrusters, shoulders)
  to read an annotation about that part
- Use the **legend buttons** below to jump to a part
- Reset the view with one click

The whole render is hand-rolled SVG 3D — no external library — with depth-sorted
lines, perspective projection, and glowing repulsor disks. Like Tony spinning a
suit hologram in his workshop.

A few other things the Hack Club guide doesn't cover:
- Server-persisted notes (rather than localStorage)
- Live telemetry feed driving both the corner HUD and a real `<canvas>` chart
- Web Audio synth music with visualizer (no audio files to ship)
- Themeable accent + wallpaper at runtime
- Cinematic boot sequence with typing log

## File layout
```
jarvis-os/
├── package.json
├── server/
│   ├── index.js          # Express server + APIs
│   └── data/             # auto-created on first run
└── public/
    ├── index.html        # shell, boot screen, HUD overlays
    ├── styles.css        # full Stark theme
    ├── os.js             # window manager, dock, boot, top bar
    └── apps.js           # all 9 apps
```
