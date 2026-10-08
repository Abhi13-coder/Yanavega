package com.yanaverse.yanavega;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Draws the YANAVEGA logo from vector contours traced from the original artwork
 * (assets/logo.json) and animates it with code. Timeline is in seconds and is synced to
 * the intro music: the big hit of the music lands at HIT.
 */
final class LogoRenderer {
    static final float HIT = 3.08f;       // musical impact inside yana_intro.ogg
    static final float DURATION = 6.4f;   // total length of the logo animation

    private static final class Sh {
        String role;
        int idx;
        final Path path = new Path();
        final RectF b = new RectF();
    }

    private final List<Sh> shapes = new ArrayList<Sh>();
    boolean ok;
    float cx, cy, cw, ch;   // centre + size of the visible logo in logo space (1774 x 887)

    private final Paint mark = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint star = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint tri = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint letter = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint sub = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Matrix lm = new Matrix();
    private Shader letterShader;

    LogoRenderer(Context ctx) {
        try {
            InputStream is = ctx.getAssets().open("logo.json");
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            is.close();
            JSONObject root = new JSONObject(bo.toString("UTF-8"));
            JSONArray cr = root.getJSONArray("content");
            float x0 = (float) cr.getDouble(0), y0 = (float) cr.getDouble(1), x1 = (float) cr.getDouble(2), y1 = (float) cr.getDouble(3);
            cx = (x0 + x1) / 2f; cy = (y0 + y1) / 2f; cw = x1 - x0; ch = y1 - y0;
            JSONArray arr = root.getJSONArray("shapes");
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                Sh s = new Sh();
                s.role = o.getString("role");
                s.idx = o.optInt("idx", 0);
                JSONArray paths = o.getJSONArray("paths");
                for (int p = 0; p < paths.length(); p++) {
                    JSONArray pts = paths.getJSONArray(p);
                    for (int k = 0; k < pts.length(); k++) {
                        JSONArray pt = pts.getJSONArray(k);
                        float x = (float) pt.getDouble(0), y = (float) pt.getDouble(1);
                        if (k == 0) s.path.moveTo(x, y); else s.path.lineTo(x, y);
                    }
                    s.path.close();
                }
                s.path.setFillType(Path.FillType.EVEN_ODD);
                s.path.computeBounds(s.b, true);
                shapes.add(s);
            }
            ok = !shapes.isEmpty();
        } catch (Exception e) {
            ok = false;
        }

        // gradients sampled from the original artwork (left pink -> purple -> right blue)
        mark.setShader(new LinearGradient(570, 0, 1225, 0,
                new int[]{0xFFEC48C8, 0xFFDC56DD, 0xFF9A6CF7, 0xFF8275FB, 0xFF597FFA, 0xFF5080FA},
                new float[]{0f, .275f, .458f, .64f, .916f, 1f}, Shader.TileMode.CLAMP));
        line.setShader(new LinearGradient(192, 0, 1584, 0,
                new int[]{0xFFF046CD, 0xFFA06EF5, 0xFF5080FA}, new float[]{0f, .5f, 1f}, Shader.TileMode.CLAMP));
        tri.setShader(new LinearGradient(1505, 0, 1580, 0,
                new int[]{0xFFFF3FC8, 0xFF4F82FA}, null, Shader.TileMode.CLAMP));
        star.setColor(0xFFF050D8);
        letterShader = new LinearGradient(-300, 0, 300, 0,
                new int[]{0xFFF1F1F5, 0xFFF1F1F5, 0xFFFFA6F2, 0xFFF1F1F5, 0xFFF1F1F5},
                new float[]{0f, .36f, .5f, .64f, 1f}, Shader.TileMode.CLAMP);
        letter.setShader(letterShader);
        sub.setColor(0xFFF1F1F5);
        glow.setShader(new RadialGradient(925, 300, 540,
                new int[]{0xFFD860F0, 0x88906CFB, 0x00000000}, new float[]{0f, .45f, 1f}, Shader.TileMode.CLAMP));
        ring.setStyle(Paint.Style.STROKE);
        ring.setColor(0xFFFFC2F4);
    }

    private static float cl(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    private static float pr(float t, float s, float d) { return cl((t - s) / d); }
    private static float eo(float p) { float q = 1 - p; return 1 - q * q * q; }
    private static float back(float p) { float s = 1.70158f; float q = p - 1; return 1 + (s + 1) * q * q * q + s * q * q; }

    private void fill(Canvas c, Sh s, Paint p, float dx, float dy, float a) {
        if (a <= 0.003f) return;
        c.save();
        c.translate(dx, dy);
        p.setAlpha((int) (255 * cl(a)));
        c.drawPath(s.path, p);
        c.restore();
    }

    /** t = seconds on the logo timeline, shimmer = 0..1 light sweep over the letters (-1 = none). */
    void draw(Canvas c, float t, float shimmer, float alpha) {
        if (!ok) return;

        // soft glow behind the Y
        float g = 0.25f * eo(pr(t, 0.2f, 1.4f)) + 0.08f * (float) Math.sin(t * 2.0f);
        if (t >= HIT) g += 0.45f * (float) Math.exp(-2.2f * (t - HIT));
        glow.setAlpha((int) (255 * cl(g * alpha)));
        c.drawCircle(925, 300, 540, glow);

        lm.setTranslate(shimmer < 0 ? -3000f : -300f + 2300f * shimmer, 0);
        letterShader.setLocalMatrix(lm);

        for (Sh s : shapes) {
            float p;
            switch (s.role) {
                case "slabL":
                    p = pr(t, 0.30f, 0.9f);
                    fill(c, s, mark, -420 * (1 - eo(p)), 0, alpha * Math.min(1f, p * 3f));
                    break;
                case "slabR":
                    p = pr(t, 0.45f, 0.9f);
                    fill(c, s, mark, 420 * (1 - eo(p)), 0, alpha * Math.min(1f, p * 3f));
                    break;
                case "yBody":
                    p = pr(t, 0.55f, 0.9f);
                    fill(c, s, mark, 0, -260 * (1 - eo(p)), alpha * Math.min(1f, p * 3f));
                    break;
                case "yStem":
                    p = pr(t, 0.80f, 0.8f);
                    fill(c, s, mark, 0, 200 * (1 - eo(p)), alpha * Math.min(1f, p * 3f));
                    break;
                case "orbitLow":
                    wipe(c, s, eo(pr(t, 1.55f, 1.2f)), alpha);
                    break;
                case "orbitUp":
                    wipe(c, s, eo(pr(t, 2.05f, 1.1f)), alpha);
                    break;
                case "star": {
                    float q = t - HIT;
                    if (q < 0) break;
                    float sc = back(pr(q, 0f, 0.6f)) * (1f + 0.07f * (float) Math.sin(q * 5f));
                    float rot = 100f * (1 - eo(pr(q, 0f, 0.9f)));
                    float mx = s.b.centerX(), my = s.b.centerY();
                    // expanding shock ring
                    float rp = pr(q, 0f, 0.8f);
                    if (rp < 1f) {
                        ring.setStrokeWidth(10f * (1 - rp) + 1f);
                        ring.setAlpha((int) (255 * (1 - rp) * 0.85f * alpha));
                        c.drawCircle(mx, my, 20f + 320f * eo(rp), ring);
                    }
                    c.save();
                    c.translate(mx, my);
                    c.rotate(rot);
                    c.scale(sc, sc);
                    c.translate(-mx, -my);
                    star.setAlpha((int) (255 * alpha));
                    c.drawPath(s.path, star);
                    c.restore();
                    break;
                }
                case "letter":
                    p = pr(t, HIT + 0.05f + 0.075f * s.idx, 0.55f);
                    fill(c, s, letter, 0, 30 * (1 - eo(p)), alpha * eo(p));
                    break;
                case "tri": {
                    p = pr(t, HIT + 0.95f, 0.45f);
                    if (p <= 0) break;
                    float sc = back(p);
                    float mx = s.b.centerX(), my = s.b.centerY();
                    c.save();
                    c.translate(mx, my);
                    c.scale(sc, sc);
                    c.translate(-mx, -my);
                    tri.setAlpha((int) (255 * cl(p * 2f) * alpha));
                    c.drawPath(s.path, tri);
                    c.restore();
                    break;
                }
                case "subline": {
                    float w = eo(pr(t, HIT + 0.5f, 0.8f));
                    if (w <= 0) break;
                    c.save();
                    if (s.idx == 0) c.clipRect(s.b.right - s.b.width() * w - 1, s.b.top - 2, s.b.right + 1, s.b.bottom + 2);
                    else c.clipRect(s.b.left - 1, s.b.top - 2, s.b.left + s.b.width() * w + 1, s.b.bottom + 2);
                    fill(c, s, line, 0, 0, alpha);
                    c.restore();
                    break;
                }
                case "subglyph":
                    p = pr(t, HIT + 0.9f + 0.04f * s.idx, 0.4f);
                    fill(c, s, sub, 0, 12 * (1 - eo(p)), alpha * eo(p) * 0.9f);
                    break;
                default:
                    break;
            }
        }
    }

    /** reveals a shape left -> right (used for the orbit swooshes) */
    private void wipe(Canvas c, Sh s, float w, float alpha) {
        if (w <= 0) return;
        c.save();
        c.clipRect(s.b.left - 2, s.b.top - 2, s.b.left + (s.b.width() + 4) * w, s.b.bottom + 2);
        fill(c, s, mark, 0, 0, alpha);
        c.restore();
    }
}
