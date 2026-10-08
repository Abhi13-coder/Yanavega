# YANAVEGA – Android app shell  (A YANAVERSE GAME)

What is inside the APK (nothing else):
- coded logo animation (vector shapes traced from the logo, `app/src/main/assets/logo.json`)
- intro sting (`res/raw/yana_intro.ogg`) + full theme loop (`res/raw/yana_theme.ogg`)
- splash art (`res/drawable-nodpi/splash_art.jpg`) + loading bar + tap sparkle effects
- downloader (`AssetUpdater.java`) and a WebView host (`GameActivity.java`)

Everything else lives in `content/` of this repo and is downloaded on first launch into the app's private storage.
Only changed files are downloaded on updates (SHA-256 checked), and the app shows an update popup.

## Repo layout
    app/ ...                 Android project (minSdk 24 / Android 7 -> targetSdk 36 / Android 16, 32+64-bit)
    content/manifest.json    list of files + hashes (auto-generated, see tools/make_manifest.py)
    content/game/index.html  entry page of the game (replace with your real three.js build)
    content/layouts/ ...     any layouts / assets your game loads
    tools/make_manifest.py   rebuilds the manifest

## Settings
`app/src/main/res/values/yanavega_config.xml` -> owner / repo / branch / folder the app downloads from.
Orientation is landscape (`AndroidManifest.xml`, `sensorLandscape`).
Bump `minApp` in the manifest (`--min-app N`) to force players to install a newer APK (N = versionCode).

## Game side (JavaScript inside the WebView)
    YanaNative.getAppVersion() / getContentVersion() / isPackReady('cars') / requestPack('cars') / quit()
    window.onYanaPack = (name, percent, done) => { ... }      // progress of optional packs
Files are served from `https://game.yanavega.local/<path inside content/>`.
