package com.yanaverse.yanavega;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;

import java.util.Random;

/** Tap / drag sparkle effects (ring + star burst + particles), drawn additively like gacha-game touch FX. */
final class TouchFx {
    private static final int MAXP = 220, MAXR = 24;
    private static final int[] PAL = {0xFFFF5CC8, 0xFFB57CFF, 0xFF6C93FF, 0xFFFFFFFF, 0xFFFF9AE8, 0xFF8FD0FF};

    private final float d;
    private final Random rnd = new Random();

    private final float[] px = new float[MAXP], py = new float[MAXP], vx = new float[MAXP], vy = new float[MAXP];
    private final float[] age = new float[MAXP], life = new float[MAXP], sz = new float[MAXP];
    private final int[] pc = new int[MAXP];
    private final boolean[] dia = new boolean[MAXP];
    private int pn;

    private final float[] rx = new float[MAXR], ry = new float[MAXR], ra = new float[MAXR], rk = new float[MAXR];
    private int rn;
    private final float[] sx = new float[MAXR], sy = new float[MAXR], sa = new float[MAXR];
    private int sn;

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path starPath = new Path();
    private long lastTrail;

    TouchFx(float density) {
        d = density;
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.ADD));
        starPath.moveTo(0, -1); starPath.lineTo(.2f, -.2f); starPath.lineTo(1, 0); starPath.lineTo(.2f, .2f);
        starPath.lineTo(0, 1); starPath.lineTo(-.2f, .2f); starPath.lineTo(-1, 0); starPath.lineTo(-.2f, -.2f);
        starPath.close();
    }

    private float rr(float a, float b) { return a + rnd.nextFloat() * (b - a); }

    private void particle(float x, float y, float ang, float speed, float lf, float size) {
        if (pn >= MAXP) return;
        int i = pn++;
        px[i] = x; py[i] = y;
        vx[i] = (float) Math.cos(ang) * speed; vy[i] = (float) Math.sin(ang) * speed;
        age[i] = 0; life[i] = lf; sz[i] = size;
        pc[i] = PAL[rnd.nextInt(PAL.length)];
        dia[i] = rnd.nextBoolean();
    }

    void tap(float x, float y) {
        if (rn < MAXR - 1) {
            rx[rn] = x; ry[rn] = y; ra[rn] = 0; rk[rn] = 1f; rn++;
            rx[rn] = x; ry[rn] = y; ra[rn] = -0.09f; rk[rn] = 0.6f; rn++;
        }
        if (sn < MAXR) { sx[sn] = x; sy[sn] = y; sa[sn] = 0; sn++; }
        for (int i = 0; i < 16; i++) {
            particle(x, y, rr(0f, 6.2832f), d * rr(70f, 270f), rr(0.45f, 0.95f), d * rr(1.4f, 3.6f));
        }
    }

    void trail(float x, float y, long nowMs) {
        if (nowMs - lastTrail < 28) return;
        lastTrail = nowMs;
        for (int i = 0; i < 2; i++) {
            particle(x + rr(-6f, 6f) * d, y + rr(-6f, 6f) * d, rr(0f, 6.2832f), d * rr(15f, 70f), rr(0.3f, 0.6f), d * rr(1.2f, 2.5f));
        }
    }

    void update(float dt) {
        for (int i = pn - 1; i >= 0; i--) {
            age[i] += dt;
            if (age[i] >= life[i]) { copy(i, --pn); continue; }
            px[i] += vx[i] * dt; py[i] += vy[i] * dt;
            float k = 1f - 2.4f * dt; vx[i] *= k; vy[i] *= k;
        }
        for (int i = rn - 1; i >= 0; i--) {
            ra[i] += dt;
            if (ra[i] > 0.62f) { rn--; rx[i] = rx[rn]; ry[i] = ry[rn]; ra[i] = ra[rn]; rk[i] = rk[rn]; }
        }
        for (int i = sn - 1; i >= 0; i--) {
            sa[i] += dt;
            if (sa[i] > 0.5f) { sn--; sx[i] = sx[sn]; sy[i] = sy[sn]; sa[i] = sa[sn]; }
        }
    }

    private void copy(int to, int from) {
        px[to] = px[from]; py[to] = py[from]; vx[to] = vx[from]; vy[to] = vy[from];
        age[to] = age[from]; life[to] = life[from]; sz[to] = sz[from]; pc[to] = pc[from]; dia[to] = dia[from];
    }

    private static int mix(int a, int b, float t) {
        int r = (int) (((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
        int g = (int) (((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
        int bl = (int) ((a & 255) * (1 - t) + (b & 255) * t);
        return 0xFF000000 | (r << 16) | (g << 8) | bl;
    }

    void draw(Canvas c) {
        // rings
        paint.setStyle(Paint.Style.STROKE);
        for (int i = 0; i < rn; i++) {
            if (ra[i] < 0) continue;
            float u = ra[i] / 0.62f, e = 1f - (1f - u) * (1f - u) * (1f - u);
            float a = (float) Math.pow(1f - u, 1.4f);
            paint.setColor(mix(0xFFFF6FD2, 0xFF7FB2FF, u));
            paint.setAlpha((int) (255 * a));
            paint.setStrokeWidth(d * 3.2f * (1f - u) + d * 0.7f);
            c.drawCircle(rx[i], ry[i], d * 10f + d * 92f * rk[i] * e, paint);
        }
        // stars
        paint.setStyle(Paint.Style.FILL);
        for (int i = 0; i < sn; i++) {
            float u = sa[i] / 0.5f, s = (float) Math.sin(Math.PI * u);
            c.save();
            c.translate(sx[i], sy[i]);
            c.rotate(45f * u);
            c.scale(d * 34f * s + 1f, d * 34f * s + 1f);
            paint.setColor(0xFFFF7ADB); paint.setAlpha((int) (110 * s));
            c.save(); c.scale(1.9f, 1.9f); c.drawPath(starPath, paint); c.restore();
            paint.setColor(0xFFFFFFFF); paint.setAlpha((int) (255 * s));
            c.drawPath(starPath, paint);
            c.restore();
        }
        // particles
        for (int i = 0; i < pn; i++) {
            float u = age[i] / life[i];
            float r = sz[i] * (1f - 0.6f * u);
            paint.setColor(pc[i]);
            paint.setAlpha((int) (255 * (1f - u)));
            if (dia[i]) {
                c.save();
                c.translate(px[i], py[i]);
                c.rotate(45f + u * 120f);
                c.drawRect(-r, -r, r, r, paint);
                c.restore();
            } else {
                c.drawCircle(px[i], py[i], r, paint);
            }
        }
    }
}
