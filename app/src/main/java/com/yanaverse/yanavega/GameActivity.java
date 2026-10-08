package com.yanaverse.yanavega;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Runs the downloaded web game in a WebView. Files are served from the app's private storage under a
 * virtual https host, so no web server and no storage permission are needed.
 * JS can call: YanaNative.getAppVersion() / getContentVersion() / isPackReady(name) / requestPack(name) / quit()
 * and receives window.onYanaPack(name, percent, done) while a pack downloads.
 */
public class GameActivity extends Activity {

    private WebView web;
    private AssetUpdater updater;
    private String host;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();
        updater = new AssetUpdater(this, null);
        host = Config.contentHost(this);

        web = new WebView(this);
        web.setBackgroundColor(0xFF0A0612);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new Bridge(), "YanaNative");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new Client());
        web.loadUrl("https://" + host + "/" + updater.entryPath());
    }

    // ------------------------------------------------------------------ local file server

    private final class Client extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
            return serve(r);
        }

        @SuppressWarnings("deprecation")
        @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
            Uri u = Uri.parse(url);
            if (host.equals(u.getHost())) return false;
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
            return true;
        }
    }

    private WebResourceResponse serve(WebResourceRequest r) {
        Uri u = r.getUrl();
        if (!host.equals(u.getHost())) return null;
        String path = u.getPath();
        if (path == null || path.length() <= 1) path = "/" + updater.entryPath();
        File f;
        try {
            File root = updater.contentDir().getCanonicalFile();
            f = new File(root, path.substring(1)).getCanonicalFile();
            if (!f.getPath().startsWith(root.getPath() + File.separator)) return err(403, "Forbidden");
        } catch (IOException e) { return err(400, "Bad Request"); }
        if (!f.isFile()) return err(404, "Not Found");

        Map<String, String> h = new HashMap<String, String>();
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Accept-Ranges", "bytes");
        h.put("Cache-Control", "no-cache");
        long len = f.length();
        String mime = mime(f.getName());
        String enc = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") ? "utf-8" : null;
        Map<String, String> rh = r.getRequestHeaders();
        String range = rh == null ? null : rh.get("Range");
        try {
            if (range != null && range.startsWith("bytes=")) {
                String[] p = range.substring(6).split("-", 2);
                long start, end;
                if (p[0].isEmpty()) { long n = Long.parseLong(p[1]); start = Math.max(0, len - n); end = len - 1; }
                else {
                    start = Long.parseLong(p[0]);
                    end = (p.length < 2 || p[1].isEmpty()) ? len - 1 : Long.parseLong(p[1]);
                }
                if (end >= len) end = len - 1;
                if (start > end) return err(416, "Range Not Satisfiable");
                FileInputStream in = new FileInputStream(f);
                long skipped = 0;
                while (skipped < start) { long n = in.skip(start - skipped); if (n <= 0) break; skipped += n; }
                h.put("Content-Range", "bytes " + start + "-" + end + "/" + len);
                h.put("Content-Length", String.valueOf(end - start + 1));
                return new WebResourceResponse(mime, enc, 206, "Partial Content", h, new Limited(in, end - start + 1));
            }
            h.put("Content-Length", String.valueOf(len));
            return new WebResourceResponse(mime, enc, 200, "OK", h, new FileInputStream(f));
        } catch (Exception e) {
            return err(500, "Server Error");
        }
    }

    private static WebResourceResponse err(int code, String reason) {
        return new WebResourceResponse("text/plain", "utf-8", code, reason, new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    private static final class Limited extends FilterInputStream {
        private long left;
        Limited(InputStream in, long n) { super(in); left = n; }
        @Override public int read() throws IOException {
            if (left <= 0) return -1;
            int r = super.read();
            if (r >= 0) left--;
            return r;
        }
        @Override public int read(byte[] b, int off, int len) throws IOException {
            if (left <= 0) return -1;
            int r = super.read(b, off, (int) Math.min(len, left));
            if (r > 0) left -= r;
            return r;
        }
    }

    private static String mime(String name) {
        String n = name.toLowerCase(Locale.US);
        int i = n.lastIndexOf('.');
        String e = i < 0 ? "" : n.substring(i + 1);
        switch (e) {
            case "html": case "htm": return "text/html";
            case "js": case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": case "map": return "application/json";
            case "wasm": return "application/wasm";
            case "glb": return "model/gltf-binary";
            case "gltf": return "model/gltf+json";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "gif": return "image/gif";
            case "svg": return "image/svg+xml";
            case "ktx2": return "image/ktx2";
            case "ogg": case "oga": return "audio/ogg";
            case "mp3": return "audio/mpeg";
            case "m4a": return "audio/mp4";
            case "wav": return "audio/wav";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "ttf": return "font/ttf";
            case "txt": return "text/plain";
            case "bin": return "application/octet-stream";
            default:
                String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(e);
                return m != null ? m : "application/octet-stream";
        }
    }

    // ------------------------------------------------------------------ JS bridge

    private final class Bridge {
        @JavascriptInterface public String getAppVersion() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public String getContentVersion() { return updater.contentVersion(); }
        @JavascriptInterface public boolean isPackReady(String name) { return updater.isPackReady(name); }
        @JavascriptInterface public void requestPack(final String name) {
            updater.requestPack(name, new AssetUpdater.PackListener() {
                @Override public void onProgress(String pack, int percent) { js(pack, percent, false); }
                @Override public void onDone(String pack, boolean ok) { js(pack, ok ? 100 : -1, true); }
            });
        }
        @JavascriptInterface public void quit() {
            runOnUiThread(new Runnable() { @Override public void run() { finish(); } });
        }
    }

    private void js(String name, int pct, boolean done) {
        final String code = "window.onYanaPack&&window.onYanaPack(" + JSONObject.quote(name) + "," + pct + "," + done + ")";
        runOnUiThread(new Runnable() {
            @Override public void run() { if (web != null) web.evaluateJavascript(code, null); }
        });
    }

    // ------------------------------------------------------------------ lifecycle

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onPause() { super.onPause(); if (web != null) { web.onPause(); web.pauseTimers(); } }

    @Override protected void onResume() { super.onResume(); hideSystemUi(); if (web != null) { web.onResume(); web.resumeTimers(); } }

    @Override protected void onDestroy() {
        super.onDestroy();
        if (web != null) { web.destroy(); web = null; }
        if (updater != null) updater.shutdown();
    }
}
