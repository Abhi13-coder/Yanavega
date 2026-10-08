package com.yanaverse.yanavega;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;

import java.util.Random;

/**
 * Full-screen splash: [1] coded logo animation on dark -> [2] splash art takes over the whole screen
 * (cover-fit, no borders, slow camera drift) with the logo moving to the corner -> [3] loading bar with
 * real percentage. Tap / drag anywhere for sparkle effects.
 */
public class SplashView extends View {

    public interface Callbacks { void onThemeStart(); void onExitDone(); }
    public interface Clock { float seconds(); }

    public static final int STAGE_LOGO = 0, STAGE_TRANS = 1, STAGE_LOAD = 2, STAGE_EXIT = 3;
    private static final float TRANS_DUR = 1.5f;

    private final float den, sden;
    private LogoRenderer logo;
    private Bitmap art;
    private Clock clock;
    private Callbacks cb;

    private int stage = STAGE_LOGO;
    private boolean started, finishWhenFull, exitNotified;
    private long lastNs, logoStartNs;
    private float logoOffset, logoT, stageT, artT, uiT, exitT, fullHold;
    private float target, disp;
    private String status = "";
    private int W, H, insL, insR, insB;
    private float barLeft, barW, barY, barH;

    private final TouchFx fx;
    private final Paint bg = new Paint(), artP = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
    private final Paint vigB = new Paint(), vigT = new Paint(), glowP = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint flashP = new Paint(), blackP = new Paint(), spark = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG), fillP = new Paint(Paint.ANTI_ALIAS_FLAG), headP = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint pctP = new Paint(Paint.ANTI_ALIAS_FLAG), statP = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF rect = new RectF();
    private final float[] spx = new float[48], spy = new float[48], sph = new float[48], sps = new float[48];

    public SplashView(Context c) {
        super(c);
        den = c.getResources().getDisplayMetrics().density;
        sden = c.getResources().getDisplayMetrics().scaledDensity;
        fx = new TouchFx(den);
        Random r = new Random(7);
        for (int i = 0; i < spx.length; i++) {
            spx[i] = r.nextFloat(); spy[i] = r.nextFloat(); sph[i] = r.nextFloat() * 6.28f; sps[i] = 0.01f + r.nextFloat() * 0.03f;
        }
        track.setColor(0xFFFFFFFF);
        blackP.setColor(0xFF000000);
        flashP.setColor(0xFFFFE6FA);
        pctP.setColor(0xFFFFFFFF);
        pctP.setTextSize(17f * sden);
        pctP.setFakeBoldText(true);
        pctP.setLetterSpacing(0.04f);
        pctP.setShadowLayer(dp(4), 0, dp(1), 0xCC000000);
        statP.setColor(0xFFFFFFFF);
        statP.setTextSize(11.5f * sden);
        statP.setLetterSpacing(0.06f);
        statP.setShadowLayer(dp(3), 0, dp(1), 0xCC000000);
        headP.setShader(new RadialGradient(0, 0, dp(18), new int[]{0xDDFFFFFF, 0x77FF7ADB, 0x00FF7ADB}, new float[]{0f, .35f, 1f}, Shader.TileMode.CLAMP));
    }

    private float dp(float v) { return v * den; }

    // ------------------------------------------------------------------ setup / state

    public void setLogo(LogoRenderer l) { logo = l; }
    public void setArt(Bitmap b) { art = b; }
    public void setClock(Clock c) { clock = c; }
    public void setCallbacks(Callbacks c) { cb = c; }
    public void startLogo() { started = true; logoStartNs = System.nanoTime(); logoOffset = 0; invalidate(); }
    public void setProgress(float f) { target = f < 0 ? 0 : (f > 1 ? 1 : f); }
    public void setStatus(String s) { status = s == null ? "" : s; }
    public void setFinishWhenFull(boolean b) { finishWhenFull = b; }
    public int getStage() { return stage; }

    @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
        W = w; H = h;
        bg.setShader(new LinearGradient(0, 0, 0, h, 0xFF14091F, 0xFF07040C, Shader.TileMode.CLAMP));
        glowP.setShader(new RadialGradient(w / 2f, h / 2f, Math.max(w, h) * 0.55f, 0x66C45CF0, 0x00000000, Shader.TileMode.CLAMP));
        vigB.setShader(new LinearGradient(0, h * 0.50f, 0, h, 0x00050309, 0xEE050309, Shader.TileMode.CLAMP));
        vigT.setShader(new LinearGradient(0, 0, 0, h * 0.30f, 0x99050309, 0x00050309, Shader.TileMode.CLAMP));
        layoutBar();
    }

    @Override public WindowInsets onApplyWindowInsets(WindowInsets in) {
        insL = in.getSystemWindowInsetLeft(); insR = in.getSystemWindowInsetRight(); insB = in.getSystemWindowInsetBottom();
        layoutBar();
        return super.onApplyWindowInsets(in);
    }

    private void layoutBar() {
        if (W == 0) return;
        barW = Math.min(W * 0.56f, dp(560));
        float pctW = dp(60), gap = dp(14);
        barLeft = (W - (barW + gap + pctW)) / 2f;
        barY = H - Math.max(dp(30), H * 0.085f) - insB;
        barH = dp(5);
        fillP.setShader(new LinearGradient(barLeft, 0, barLeft + barW, 0,
                new int[]{0xFFFF4FC8, 0xFFB57CFF, 0xFF5C8BFF}, new float[]{0f, .55f, 1f}, Shader.TileMode.CLAMP));
    }

    // ------------------------------------------------------------------ timeline

    private static float cl(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    private static float eo(float p) { float q = 1 - p; return 1 - q * q * q; }
    private static float lerp(float a, float b, float t) { return a + (b - a) * t; }

    private void beginTrans() {
        if (stage != STAGE_LOGO) return;
        stage = STAGE_TRANS; stageT = 0; artT = 0;
        if (cb != null) cb.onThemeStart();
    }

    private void progress(float dt) {
        float diff = target - disp;
        if (diff > 0) {
            float k = 1f - (float) Math.exp(-dt * 5f);
            disp += Math.max(diff * k, Math.min(diff, dt * 0.05f));
        }
    }

    private void update(float dt) {
        uiT += dt;
        fx.update(dt);
        switch (stage) {
            case STAGE_LOGO: {
                if (!started) { logoT = 0; break; }
                float own = (System.nanoTime() - logoStartNs) * 1e-9f;
                float a = clock != null ? clock.seconds() : -1f;
                if (a >= 0.02f) logoOffset = a - own;     // lock to the music while it plays
                logoT = own + logoOffset;
                boolean broken = logo == null || !logo.ok;
                if (logoT >= LogoRenderer.DURATION || (broken && logoT > 0.4f)) beginTrans();
                progress(dt);
                break;
            }
            case STAGE_TRANS:
                stageT += dt; artT += dt; progress(dt);
                if (stageT >= TRANS_DUR) stage = STAGE_LOAD;
                break;
            case STAGE_LOAD:
                artT += dt; progress(dt);
                if (finishWhenFull && target >= 0.999f && disp >= 0.995f) {
                    fullHold += dt;
                    if (fullHold > 0.45f) { stage = STAGE_EXIT; exitT = 0; }
                }
                break;
            default:
                artT += dt; exitT += dt; progress(dt);
                if (exitT >= 0.8f && !exitNotified) { exitNotified = true; if (cb != null) cb.onExitDone(); }
                break;
        }
    }

    // ------------------------------------------------------------------ drawing

    @Override protected void onDraw(Canvas c) {
        long now = System.nanoTime();
        float dt = lastNs == 0 ? 0.016f : Math.min(0.05f, (now - lastNs) * 1e-9f);
        lastNs = now;
        update(dt);

        c.drawRect(0, 0, W, H, bg);
        float artA = stage == STAGE_LOGO ? 0f : (stage == STAGE_TRANS ? eo(cl(stageT / 1.2f)) : 1f);
        float glowA = (1f - artA) * eo(cl(logoT / 1.5f));
        if (glowA > 0.01f) { glowP.setAlpha((int) (255 * glowA)); c.drawRect(0, 0, W, H, glowP); }
        if (art != null && artA > 0.001f) drawArt(c, artA);
        drawSparkles(c, 1f - artA);
        drawLogo(c);

        if (stage == STAGE_TRANS) {
            float fl = 0.55f * (float) Math.pow(1f - cl(stageT / 0.7f), 2);
            if (fl > 0.01f) { flashP.setAlpha((int) (255 * fl)); c.drawRect(0, 0, W, H, flashP); }
        }
        float uiA = stage == STAGE_LOGO ? 0f : (stage == STAGE_TRANS ? eo(cl((stageT - 0.7f) / 0.6f)) : 1f);
        if (uiA > 0.01f) drawBar(c, uiA);

        fx.draw(c);

        if (stage == STAGE_EXIT) { blackP.setAlpha((int) (255 * cl(exitT / 0.5f))); c.drawRect(0, 0, W, H, blackP); }
        postInvalidateOnAnimation();
    }

    private void drawArt(Canvas c, float a) {
        float bw = art.getWidth(), bh = art.getHeight();
        float s = Math.max(W / bw, H / bh) * (1.06f + 0.05f * (0.5f - 0.5f * (float) Math.cos(artT * 0.18f)));   // cover-fit + slow breathing zoom
        float ex = (bw * s - W) / 2f, ey = (bh * s - H) / 2f;
        float px = (float) Math.sin(artT * 0.11f) * ex * 0.7f, py = (float) Math.cos(artT * 0.09f) * ey * 0.7f;
        c.save();
        c.translate(W / 2f + px, H / 2f + py);
        c.scale(s, s);
        c.translate(-bw / 2f, -bh / 2f);
        artP.setAlpha((int) (255 * a));
        c.drawBitmap(art, 0, 0, artP);
        c.restore();
        vigB.setAlpha((int) (255 * a)); c.drawRect(0, H * 0.50f, W, H, vigB);
        vigT.setAlpha((int) (255 * a)); c.drawRect(0, 0, W, H * 0.30f, vigT);
    }

    private void drawSparkles(Canvas c, float a) {
        if (a <= 0.01f) return;
        for (int i = 0; i < spx.length; i++) {
            float y = (spy[i] - uiT * sps[i]) % 1f;
            if (y < 0) y += 1f;
            float tw = 0.5f + 0.5f * (float) Math.sin(uiT * (1.5f + sps[i] * 60f) + sph[i]);
            spark.setColor(i % 3 == 0 ? 0xFFFF7ADB : (i % 3 == 1 ? 0xFFA98BFF : 0xFF7FB2FF));
            spark.setAlpha((int) (150 * tw * a));
            c.drawCircle(spx[i] * W, y * H, dp(1f + 1.8f * tw), spark);
        }
    }

    private void drawLogo(Canvas c) {
        if (logo == null || !logo.ok || W == 0) return;
        float sc0 = Math.min(0.72f * W / logo.cw, 0.62f * H / logo.ch);
        float sc1 = Math.min(0.30f * W / logo.cw, 0.26f * H / logo.ch);
        float cx0 = W / 2f, cy0 = H / 2f;
        float cx1 = Math.max(dp(26), W * 0.035f) + insL + logo.cw * sc1 / 2f;
        float cy1 = Math.max(dp(18), H * 0.05f) + logo.ch * sc1 / 2f;
        float u = stage == STAGE_LOGO ? 0f : (stage == STAGE_TRANS ? eo(cl(stageT / TRANS_DUR)) : 1f);
        float sc = lerp(sc0, sc1, u), cx = lerp(cx0, cx1, u), cy = lerp(cy0, cy1, u);
        float t, shimmer;
        if (stage == STAGE_LOGO) {
            t = logoT;
            shimmer = cl((logoT - (LogoRenderer.HIT + 0.9f)) / 1.1f);
            if (logoT < LogoRenderer.HIT + 0.9f) shimmer = -1f;
        } else {
            t = LogoRenderer.DURATION + 5f;
            float cyc = uiT % 6f;
            shimmer = cyc < 1.4f ? cyc / 1.4f : -1f;
        }
        c.save();
        c.translate(cx, cy);
        c.scale(sc, sc);
        c.translate(-logo.cx, -logo.cy);
        logo.draw(c, t, shimmer, 1f);
        c.restore();
    }

    private void drawBar(Canvas c, float a) {
        float pct = Math.min(1f, disp);
        rect.set(barLeft, barY - barH / 2f, barLeft + barW, barY + barH / 2f);
        track.setAlpha((int) (64 * a));
        c.drawRoundRect(rect, barH, barH, track);
        float fw = barW * pct;
        if (fw > 0.5f) {
            rect.set(barLeft, barY - barH / 2f, barLeft + Math.max(fw, barH), barY + barH / 2f);
            fillP.setAlpha((int) (255 * a));
            c.drawRoundRect(rect, barH, barH, fillP);
            c.save();
            c.translate(barLeft + Math.max(fw, barH / 2f), barY);
            headP.setAlpha((int) (255 * a * (0.8f + 0.2f * (float) Math.sin(uiT * 6f))));
            c.drawCircle(0, 0, dp(18), headP);
            c.restore();
        }
        pctP.setAlpha((int) (255 * a));
        c.drawText(((int) (pct * 100f + 0.5f)) + "%", barLeft + barW + dp(14), barY + pctP.getTextSize() * 0.35f, pctP);
        if (status.length() > 0) {
            statP.setAlpha((int) (200 * a));
            c.drawText(status, barLeft, barY - dp(14), statP);
        }
    }

    // ------------------------------------------------------------------ touch

    @Override public boolean onTouchEvent(MotionEvent e) {
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN: {
                int i = e.getActionIndex();
                fx.tap(e.getX(i), e.getY(i));
                if (stage == STAGE_LOGO && logoT > 1.0f) beginTrans();   // tap to skip the logo
                break;
            }
            case MotionEvent.ACTION_MOVE:
                for (int i = 0; i < e.getPointerCount(); i++) fx.trail(e.getX(i), e.getY(i), e.getEventTime());
                break;
            default:
                break;
        }
        return true;
    }
}
