package com.yanaverse.yanavega;

import android.app.Activity;
import android.app.AlertDialog;
import android.animation.ValueAnimator;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.WindowManager;

import java.util.Locale;

/**
 * Launcher activity. Everything it needs ships inside the APK: the coded logo animation, the intro
 * sting, the splash art and the full theme (looping). Meanwhile AssetUpdater checks / downloads the
 * game data from GitHub and the bar shows the real progress. When it is done we open GameActivity.
 */
public class SplashActivity extends Activity implements AssetUpdater.Listener, SplashView.Callbacks {

    private SplashView view;
    private MediaPlayer intro, theme;
    private AssetUpdater updater;
    private boolean introActive, introPausedByUs, themePausedByUs, launched;
    private final Handler h = new Handler(Looper.getMainLooper());

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        view = new SplashView(this);
        setContentView(view);
        hideSystemUi();
        view.setCallbacks(this);
        view.setArt(decodeArt());
        view.setLogo(new LogoRenderer(this));
        view.setClock(new SplashView.Clock() {
            @Override public float seconds() {
                try { return (intro != null && introActive) ? intro.getCurrentPosition() / 1000f : -1f; }
                catch (Exception e) { return -1f; }
            }
        });
        try { intro = MediaPlayer.create(this, R.raw.yana_intro); } catch (Exception e) { intro = null; }
        if (intro != null) {
            intro.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override public void onCompletion(MediaPlayer mp) { introActive = false; }
            });
        }
        updater = new AssetUpdater(this, this);
        view.post(new Runnable() {
            @Override public void run() {
                if (intro != null) { introActive = true; try { intro.start(); } catch (Exception e) { introActive = false; } }
                view.startLogo();
                updater.check();
            }
        });
    }

    // ------------------------------------------------------------------ SplashView callbacks

    @Override public void onThemeStart() {
        // logo animation finished (or skipped): stop the sting, start the full theme in a loop
        introActive = false;
        if (intro != null) fadeOutAndRelease(intro, 160);
        intro = null;
        try {
            theme = MediaPlayer.create(this, R.raw.yana_theme);
            if (theme != null) {
                theme.setLooping(true);
                theme.setVolume(0f, 0f);
                theme.start();
                fade(theme, 0f, 1f, 900, false);
            }
        } catch (Exception e) { theme = null; }
    }

    @Override public void onExitDone() {
        if (launched) return;
        launched = true;
        if (theme != null) fade(theme, 1f, 0f, 350, false);
        startActivity(new Intent(this, GameActivity.class));
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        finish();
    }

    // ------------------------------------------------------------------ AssetUpdater callbacks (main thread)

    @Override public void onChecking() {
        view.setStatus("Checking for updates…");
        view.setProgress(0.03f);
    }

    @Override public void onUpToDate() {
        view.setStatus("Ready");
        view.setProgress(1f);
        view.setFinishWhenFull(true);
    }

    @Override public void onFirstInstall(long totalBytes) {
        view.setStatus("Downloading game data…");
        view.setProgress(0.05f);
    }

    @Override public void onUpdateAvailable(final String version, final long totalBytes) {
        whenSplashReady(new Runnable() {
            @Override public void run() {
                dialog().setTitle("Update available")
                        .setMessage("New game data " + (version.length() > 0 ? "(v" + version + ") " : "") + "is ready to download (" + mb(totalBytes) + ").")
                        .setPositiveButton("Update", new DialogInterface.OnClickListener() {
                            @Override public void onClick(DialogInterface d, int w) {
                                view.setStatus("Downloading game data…");
                                view.setProgress(0.05f);
                                updater.startDownload();
                            }
                        })
                        .setNegativeButton("Later", new DialogInterface.OnClickListener() {
                            @Override public void onClick(DialogInterface d, int w) { updater.skipUpdate(); }
                        }).show();
            }
        });
    }

    @Override public void onProgress(long done, long total) {
        float f = total > 0 ? (float) done / total : 0f;
        view.setProgress(0.05f + 0.93f * f);
        view.setStatus(String.format(Locale.US, "Downloading game data   %.1f / %.1f MB", done / 1048576f, total / 1048576f));
    }

    @Override public void onReady() {
        view.setStatus("Ready");
        view.setProgress(1f);
        view.setFinishWhenFull(true);
    }

    @Override public void onError(final String message, final boolean canUseLocal) {
        whenSplashReady(new Runnable() {
            @Override public void run() {
                AlertDialog.Builder b = dialog().setTitle("Connection problem").setMessage(message)
                        .setPositiveButton("Retry", new DialogInterface.OnClickListener() {
                            @Override public void onClick(DialogInterface d, int w) { updater.check(); }
                        });
                if (canUseLocal) {
                    b.setNeutralButton("Play offline", new DialogInterface.OnClickListener() {
                        @Override public void onClick(DialogInterface d, int w) { onUpToDate(); }
                    });
                }
                b.setNegativeButton("Exit", new DialogInterface.OnClickListener() {
                    @Override public void onClick(DialogInterface d, int w) { finish(); }
                }).show();
            }
        });
    }

    @Override public void onAppUpdateRequired(int neededVersionCode) {
        whenSplashReady(new Runnable() {
            @Override public void run() {
                dialog().setTitle("App update required")
                        .setMessage("This version of YANAVEGA is too old for the latest game data. Please download the newest app.")
                        .setPositiveButton("Download", new DialogInterface.OnClickListener() {
                            @Override public void onClick(DialogInterface d, int w) {
                                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(Config.releasesUrl(SplashActivity.this)))); } catch (Exception ignored) { }
                                finish();
                            }
                        })
                        .setNegativeButton("Exit", new DialogInterface.OnClickListener() {
                            @Override public void onClick(DialogInterface d, int w) { finish(); }
                        }).show();
            }
        });
    }

    // ------------------------------------------------------------------ helpers

    private AlertDialog.Builder dialog() {
        return new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert).setCancelable(false);
    }

    private void whenSplashReady(final Runnable r) {
        if (isFinishing()) return;
        if (view.getStage() >= SplashView.STAGE_LOAD) r.run();
        else h.postDelayed(new Runnable() { @Override public void run() { whenSplashReady(r); } }, 250);
    }

    private static String mb(long bytes) {
        return bytes <= 0 ? "size unknown" : String.format(Locale.US, "%.1f MB", bytes / 1048576f);
    }

    private Bitmap decodeArt() {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeResource(getResources(), R.drawable.splash_art, o);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int target = Math.max(dm.widthPixels, dm.heightPixels);
        int ss = 1;
        while (o.outWidth / (ss * 2) >= target) ss *= 2;
        o.inJustDecodeBounds = false;
        o.inSampleSize = ss;
        return BitmapFactory.decodeResource(getResources(), R.drawable.splash_art, o);
    }

    private void fade(final MediaPlayer p, float from, float to, int ms, final boolean releaseAtEnd) {
        ValueAnimator a = ValueAnimator.ofFloat(from, to);
        a.setDuration(ms);
        a.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator va) {
                float v = (Float) va.getAnimatedValue();
                try { p.setVolume(v, v); } catch (Exception ignored) { }
            }
        });
        a.start();
    }

    private void fadeOutAndRelease(final MediaPlayer p, int ms) {
        fade(p, 1f, 0f, ms, true);
        h.postDelayed(new Runnable() {
            @Override public void run() {
                try { p.stop(); } catch (Exception ignored) { }
                try { p.release(); } catch (Exception ignored) { }
            }
        }, ms + 40);
    }

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

    @Override protected void onPause() {
        super.onPause();
        try {
            if (intro != null && introActive && intro.isPlaying()) { intro.pause(); introPausedByUs = true; }
            if (theme != null && theme.isPlaying()) { theme.pause(); themePausedByUs = true; }
        } catch (Exception ignored) { }
    }

    @Override protected void onResume() {
        super.onResume();
        hideSystemUi();
        try {
            if (introPausedByUs && intro != null) { intro.start(); introPausedByUs = false; }
            if (themePausedByUs && theme != null) { theme.start(); themePausedByUs = false; }
        } catch (Exception ignored) { }
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        h.removeCallbacksAndMessages(null);
        try { if (intro != null) intro.release(); } catch (Exception ignored) { }
        try { if (theme != null) theme.release(); } catch (Exception ignored) { }
        if (updater != null) updater.shutdown();
    }
}
