package com.yanaverse.yanavega;

import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Downloads and verifies game data described by content/manifest.json in the GitHub repo.
 * Files are stored in the app's private storage (filesDir/yanavega/content). All Listener
 * callbacks run on the main thread.
 */
public class AssetUpdater {

    public interface Listener {
        void onChecking();
        void onUpToDate();                                   // local data is current (or usable offline)
        void onFirstInstall(long totalBytes);                // download starts automatically
        void onUpdateAvailable(String version, long totalBytes); // UI should ask, then call startDownload()/skipUpdate()
        void onProgress(long done, long total);
        void onReady();                                      // all required files downloaded + verified
        void onError(String message, boolean canUseLocal);
        void onAppUpdateRequired(int neededVersionCode);
    }

    public interface PackListener {
        void onProgress(String pack, int percent);
        void onDone(String pack, boolean ok);
    }

    private interface Sink { void add(long n); }

    private static final class Entry {
        String path = "", sha = "", url = "", pack = "core";
        long size;
    }

    private final Context ctx;
    private final Listener ls;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final File root, contentDir, stateFile;

    private JSONObject manifest;                       // last applied manifest (null = nothing installed)
    private JSONObject installed = new JSONObject();   // path -> sha256 of files verified on disk
    private JSONObject pendingRemote;
    private List<Entry> pendingPlan;
    private long pendingTotal;

    public AssetUpdater(Context c, Listener l) {
        ctx = c.getApplicationContext();
        ls = l;
        root = new File(ctx.getFilesDir(), "yanavega");
        contentDir = new File(root, "content");
        stateFile = new File(root, "state.json");
        contentDir.mkdirs();
        try {
            if (stateFile.exists()) {
                JSONObject s = new JSONObject(readText(stateFile));
                manifest = s.optJSONObject("manifest");
                JSONObject in = s.optJSONObject("installed");
                if (in != null) installed = in;
            }
        } catch (Exception e) {
            manifest = null;
            installed = new JSONObject();
        }
    }

    // ------------------------------------------------------------------ public API

    public File contentDir() { return contentDir; }

    public synchronized String contentVersion() {
        return manifest == null ? "" : manifest.optString("version", "");
    }

    public synchronized String entryPath() {
        return manifest == null ? "game/index.html" : manifest.optString("entry", "game/index.html");
    }

    public synchronized boolean hasRequiredContent() {
        if (manifest == null) return false;
        for (Entry e : entries(manifest)) {
            if (packRequired(manifest, e.pack) && !isInstalled(e)) return false;
        }
        return true;
    }

    public synchronized boolean isPackReady(String pack) {
        if (manifest == null) return false;
        boolean any = false;
        for (Entry e : entries(manifest)) {
            if (e.pack.equals(pack)) {
                any = true;
                if (!isInstalled(e)) return false;
            }
        }
        return any;
    }

    /** Checks the repo for new data. Safe to call again after an error. */
    public void check() {
        if (ls == null) return;
        io.execute(new Runnable() {
            @Override public void run() { doCheck(); }
        });
    }

    /** Download what check() found (after the user accepted an update). */
    public void startDownload() {
        io.execute(new Runnable() {
            @Override public void run() { downloadPending(); }
        });
    }

    /** User chose "Later": keep using the data already on the phone. */
    public void skipUpdate() {
        main.post(new Runnable() {
            @Override public void run() { if (ls != null) ls.onUpToDate(); }
        });
    }

    /** Downloads an optional pack (manifest "packs" with required=false) on demand. */
    public void requestPack(final String pack, final PackListener pl) {
        io.execute(new Runnable() {
            @Override public void run() { doPack(pack, pl); }
        });
    }

    public void shutdown() { io.shutdownNow(); }

    // ------------------------------------------------------------------ check / download

    private void doCheck() {
        post(new Runnable() { @Override public void run() { ls.onChecking(); } });
        JSONObject remote = null;
        try {
            remote = new JSONObject(httpGet(Config.manifestUrl(ctx) + "?t=" + System.currentTimeMillis()));
        } catch (Exception ignored) { }

        if (remote == null) {
            if (hasRequiredContent()) {
                post(new Runnable() { @Override public void run() { ls.onUpToDate(); } });
            } else {
                post(new Runnable() { @Override public void run() {
                    ls.onError("Can't reach the download server. Check your internet connection and try again.", false);
                } });
            }
            return;
        }

        final int need = remote.optInt("minApp", 0);
        if (need > appVersion()) {
            post(new Runnable() { @Override public void run() { ls.onAppUpdateRequired(need); } });
            return;
        }

        List<Entry> plan;
        boolean must;
        synchronized (this) {
            plan = buildPlan(remote);
            must = manifest == null || !hasRequiredContent();
        }
        long total = 0;
        for (Entry e : plan) total += Math.max(0, e.size);

        if (plan.isEmpty()) {
            applyManifest(remote);
            post(new Runnable() { @Override public void run() { ls.onUpToDate(); } });
            return;
        }
        pendingRemote = remote;
        pendingPlan = plan;
        pendingTotal = total;
        final long t = total;
        final String v = remote.optString("version", "");
        if (must) {
            post(new Runnable() { @Override public void run() { ls.onFirstInstall(t); } });
            downloadPending();
        } else {
            post(new Runnable() { @Override public void run() { ls.onUpdateAvailable(v, t); } });
        }
    }

    private void downloadPending() {
        final JSONObject remote = pendingRemote;
        final List<Entry> plan = pendingPlan;
        final long total = pendingTotal;
        if (remote == null || plan == null) {
            post(new Runnable() { @Override public void run() { ls.onReady(); } });
            return;
        }
        String base = remote.optString("base", "");
        if (base.isEmpty()) base = Config.contentBase(ctx);
        if (!base.endsWith("/")) base += "/";

        final long[] done = {0};
        final long[] last = {0};
        Sink sink = new Sink() {
            @Override public void add(long n) {
                done[0] += n;
                long now = System.currentTimeMillis();
                if (now - last[0] > 80) {
                    last[0] = now;
                    final long d = Math.max(0, done[0]);
                    post(new Runnable() { @Override public void run() { ls.onProgress(d, total); } });
                }
            }
        };
        try {
            for (Entry e : plan) fetchWithRetry(e, base, sink);
            applyManifest(remote);
            post(new Runnable() { @Override public void run() { ls.onProgress(total, total); ls.onReady(); } });
        } catch (Exception ex) {
            saveState();
            final boolean canLocal = hasRequiredContent();
            final String msg = "Download interrupted (" + ex.getMessage() + ").";
            post(new Runnable() { @Override public void run() { ls.onError(msg, canLocal); } });
        }
    }

    private void doPack(final String pack, final PackListener pl) {
        final List<Entry> need = new ArrayList<Entry>();
        long total = 0;
        String base;
        synchronized (this) {
            if (manifest == null) {
                post(new Runnable() { @Override public void run() { if (pl != null) pl.onDone(pack, false); } });
                return;
            }
            for (Entry e : entries(manifest)) {
                if (e.pack.equals(pack) && !isInstalled(e)) { need.add(e); total += Math.max(0, e.size); }
            }
            base = manifest.optString("base", "");
        }
        if (base.isEmpty()) base = Config.contentBase(ctx);
        if (!base.endsWith("/")) base += "/";
        final long tot = total;
        final long[] done = {0};
        Sink sink = new Sink() {
            @Override public void add(long n) {
                done[0] += n;
                final int pct = tot > 0 ? (int) Math.min(99, Math.max(0, done[0] * 100 / tot)) : 0;
                post(new Runnable() { @Override public void run() { if (pl != null) pl.onProgress(pack, pct); } });
            }
        };
        boolean ok = true;
        try {
            for (Entry e : need) fetchWithRetry(e, base, sink);
        } catch (Exception ex) { ok = false; }
        saveState();
        final boolean result = ok;
        post(new Runnable() { @Override public void run() { if (pl != null) pl.onDone(pack, result); } });
    }

    // ------------------------------------------------------------------ helpers

    private synchronized List<Entry> buildPlan(JSONObject remote) {
        Set<String> have = new HashSet<String>();
        for (Entry e : entries(manifest)) if (installed.has(e.path)) have.add(e.pack);
        List<Entry> plan = new ArrayList<Entry>();
        for (Entry e : entries(remote)) {
            if ((packRequired(remote, e.pack) || have.contains(e.pack)) && !isInstalled(e)) plan.add(e);
        }
        return plan;
    }

    private synchronized void applyManifest(JSONObject remote) {
        Set<String> keep = new HashSet<String>();
        for (Entry e : entries(remote)) keep.add(e.path);
        List<String> drop = new ArrayList<String>();
        Iterator<String> it = installed.keys();
        while (it.hasNext()) {
            String k = it.next();
            if (!keep.contains(k)) drop.add(k);
        }
        for (String k : drop) {
            new File(contentDir, k).delete();
            installed.remove(k);
        }
        manifest = remote;
        saveState();
    }

    private synchronized boolean isInstalled(Entry e) {
        File f = new File(contentDir, e.path);
        if (!f.isFile()) return false;
        if (e.size > 0 && f.length() != e.size) return false;
        return e.sha.isEmpty() || e.sha.equals(installed.optString(e.path));
    }

    private static List<Entry> entries(JSONObject m) {
        List<Entry> out = new ArrayList<Entry>();
        if (m == null) return out;
        JSONArray a = m.optJSONArray("files");
        if (a == null) return out;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            Entry e = new Entry();
            e.path = o.optString("path");
            e.sha = o.optString("sha256").toLowerCase();
            e.url = o.optString("url");
            e.pack = o.optString("pack", "core");
            e.size = o.optLong("size", 0);
            if (safePath(e.path)) out.add(e);
        }
        return out;
    }

    private static boolean safePath(String p) {
        return p != null && !p.isEmpty() && !p.startsWith("/") && !p.contains("..") && !p.contains("\\");
    }

    private static boolean packRequired(JSONObject m, String pack) {
        JSONObject ps = m == null ? null : m.optJSONObject("packs");
        JSONObject p = ps == null ? null : ps.optJSONObject(pack);
        return p != null ? p.optBoolean("required", false) : "core".equals(pack);
    }

    private void fetchWithRetry(Entry e, String base, Sink sink) throws IOException {
        IOException last = null;
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                fetch(e, base, sink);
                return;
            } catch (IOException ex) {
                last = ex;
                try { Thread.sleep(600L * (attempt + 1)); } catch (InterruptedException ie) { throw new IOException("cancelled"); }
            }
        }
        throw last;
    }

    private void fetch(Entry e, String base, Sink sink) throws IOException {
        String url = !e.url.isEmpty() ? e.url : base + Uri.encode(e.path, "/");
        File dest = new File(contentDir, e.path);
        File parent = dest.getParentFile();
        if (parent != null) parent.mkdirs();
        File part = new File(dest.getPath() + ".part");
        long got = 0;
        HttpURLConnection c = null;
        try {
            c = open(url, 15000, 30000);
            int code = c.getResponseCode();
            if (code != 200) throw new IOException("HTTP " + code + " for " + e.path);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            InputStream in = c.getInputStream();
            OutputStream out = new FileOutputStream(part);
            try {
                byte[] buf = new byte[32 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    md.update(buf, 0, n);
                    got += n;
                    sink.add(n);
                }
            } finally {
                try { in.close(); } catch (IOException ignored) { }
                out.close();
            }
            String hex = hex(md.digest());
            if (!e.sha.isEmpty() && !hex.equals(e.sha)) throw new IOException("checksum mismatch: " + e.path);
            if (dest.exists()) dest.delete();
            if (!part.renameTo(dest)) throw new IOException("cannot write " + e.path);
            synchronized (this) {
                try { installed.put(e.path, e.sha.isEmpty() ? hex : e.sha); } catch (Exception ignored) { }
            }
        } catch (IOException ex) {
            sink.add(-got);
            part.delete();
            throw ex;
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IOException(ex.toString());
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private static HttpURLConnection open(String url, int connectMs, int readMs) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(connectMs);
        c.setReadTimeout(readMs);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "Yanavega-Android");
        return c;
    }

    private static String httpGet(String url) throws IOException {
        HttpURLConnection c = open(url, 8000, 15000);
        try {
            if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode());
            InputStream in = c.getInputStream();
            try {
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                byte[] b = new byte[8192];
                int n;
                while ((n = in.read(b)) > 0) bo.write(b, 0, n);
                return bo.toString("UTF-8");
            } finally { in.close(); }
        } finally { c.disconnect(); }
    }

    private static String readText(File f) throws IOException {
        FileInputStream in = new FileInputStream(f);
        try {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) bo.write(b, 0, n);
            return bo.toString("UTF-8");
        } finally { in.close(); }
    }

    private synchronized void saveState() {
        try {
            JSONObject s = new JSONObject();
            if (manifest != null) s.put("manifest", manifest);
            s.put("installed", installed);
            File tmp = new File(root, "state.tmp");
            FileOutputStream out = new FileOutputStream(tmp);
            try { out.write(s.toString().getBytes("UTF-8")); } finally { out.close(); }
            if (stateFile.exists()) stateFile.delete();
            tmp.renameTo(stateFile);
        } catch (Exception ignored) { }
    }

    private static String hex(byte[] d) {
        StringBuilder sb = new StringBuilder(d.length * 2);
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private int appVersion() {
        try { return ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionCode; }
        catch (Exception e) { return 0; }
    }

    private void post(Runnable r) { main.post(r); }
}
