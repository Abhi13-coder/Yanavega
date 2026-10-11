# YANAVEGA – project context (paste this first when asking any AI for help)

**Game:** YANAVEGA, a YANAVERSE game. Anime open-world driving RPG. Free. Offline single-player first, online later.
**Delivery:** Android APK shell (Java WebView, repo `Abhi13-coder/Yanavega`) shows a native logo + splash + loading bar, downloads `content/` from GitHub into app storage, then loads `content/game/index.html` in a WebView at `https://game.yanavega.local/`.
**Stack of the content:** plain classic JavaScript (no bundler), three.js r128 (`content/lib`), no external CDN. Phone WebView (Chrome engine), landscape.

## Files (content/)
- `game/index.html` entry; `lobby.css` all styles.
- `core.js` helpers (`YV.el`, `YV.$`), asset access `YV.assets.url('path')`, settings `YV.cfg.get('id')`, saves `YV.store.data` (+ `YV.store.touch('wallet')`), audio `YV.audio`, dialogs `YV.toast / YV.confirm`.
- `stage.js` showroom (garage 3D). `car.js` loads the car, wheels split, paintable body (`YV.car.setPaint('#hex')`).
- `fsr.js` FSR-style upscaler (spatial: Catmull-Rom upscale + RCAS sharpen).
- `lobby.js` home (3 full-bleed mode panels), nav, mode sheets, launch overlay, phone. Modes are in `MODES`; `soon:true` = coming soon.
- `screens.js` Garage (stats, tune, paint shop), Shop, Inventory, Maintenance, Characters/Wardrobe (coming soon).
- `settings.js` + `data/settings.json` = 180+ settings, schema driven (add a control by adding JSON, read with `YV.cfg.get`).
- `openroad.js` the Open Road mode: `YV.openroad.load(progressFn)`, `.begin(cfg)`, `.stop(save)`. Procedural road/terrain/lakes/trees in chunks, arcade car physics, weather, time of day, HUD, touch/tilt/gamepad input, engine audio.
- `data/*.json` cars, parts, items, cast, phone, news. `world/` textures. `cars/starter/` car (GLB without textures + webp maps). `audio/` engine loops (ogg mono + m4a binaural).

## Rules that matter
- three.js r128: GLB must not embed webp textures; load textures separately (see `car.js`).
- Assets: webp, textures ≤2048, tileable where needed; models Y-up, meters, forward +Z, origin at ground/center, no embedded textures.
- Keep `content/manifest.json` automatic (GitHub Action `update-manifest`). Delete old files in `content/` when removing assets.
- One car only for now (`starter`). Characters are removed until clothed models exist. Story and Race are placeholders.
- Test without a phone: `python3 -m http.server` inside `content/`, open `/game/index.html`. Test hook: `YV.openroad.step(dt, true)` advances the sim.

## Known gaps / ideas
Bloom, motion blur, HDR output toggles exist in settings but are not wired. Real shadows only for the car (setting `gfx.shadow`). No traffic or collisions yet. Temporal upscaler (FSR2/Arm ASR style) not implemented. Online/MMO later.
