/*
 * Constellations that float where the old cubes used to be.
 *
 * Each one is a hand-placed set of real stars joined by lines. They:
 *   - draw themselves in when the page loads
 *   - drift and sway slowly, with parallax against the mouse
 *   - send a little pulse of light along their lines now and then
 *   - brighten and reveal their name + brightest star when you hover near them
 *
 * Coordinates are on a rough 0-100 grid (x right, y down). `m` is apparent magnitude-ish
 * brightness (bigger = brighter), `t` is a tint index from stars.js (4/5 = warm/red giants).
 */

import { glowSprite, rand } from "./stars.js";

const TAU = Math.PI * 2;

const DEFS = [
    {
        name: "Orion",
        anchor: [0.05, 0.3],
        scale: 1,
        stars: [
            { id: "meissa", x: 46, y: 0, m: 0.55 },
            { id: "betelgeuse", name: "Betelgeuse", x: 16, y: 16, m: 1, t: 5 },
            { id: "bellatrix", x: 78, y: 20, m: 0.8, t: 0 },
            { id: "alnitak", x: 38, y: 52, m: 0.75, t: 0 },
            { id: "alnilam", x: 51, y: 49, m: 0.85, t: 0 },
            { id: "mintaka", x: 63, y: 46, m: 0.7, t: 0 },
            { id: "sword1", x: 51, y: 62, m: 0.4 },
            { id: "sword2", x: 51, y: 70, m: 0.5 },
            { id: "saiph", x: 24, y: 96, m: 0.7, t: 0 },
            { id: "rigel", name: "Rigel", x: 82, y: 100, m: 1, t: 0 }
        ],
        lines: [
            ["meissa", "betelgeuse"], ["meissa", "bellatrix"],
            ["betelgeuse", "alnitak"], ["bellatrix", "mintaka"],
            ["alnitak", "alnilam"], ["alnilam", "mintaka"],
            ["alnitak", "saiph"], ["mintaka", "rigel"],
            ["alnilam", "sword1"], ["sword1", "sword2"]
        ]
    },
    {
        name: "Ursa Major",
        anchor: [0.72, 0.08],
        scale: 0.95,
        stars: [
            { id: "alkaid", x: 0, y: 32, m: 0.8, t: 0 },
            { id: "mizar", x: 20, y: 17, m: 0.8 },
            { id: "alioth", x: 40, y: 10, m: 1, name: "Alioth" },
            { id: "megrez", x: 57, y: 26, m: 0.55 },
            { id: "phecda", x: 62, y: 62, m: 0.7 },
            { id: "merak", x: 94, y: 70, m: 0.75 },
            { id: "dubhe", x: 99, y: 30, m: 0.9, t: 4, name: "Dubhe" }
        ],
        lines: [
            ["alkaid", "mizar"], ["mizar", "alioth"], ["alioth", "megrez"],
            ["megrez", "dubhe"], ["dubhe", "merak"], ["merak", "phecda"], ["phecda", "megrez"]
        ]
    },
    {
        name: "Cassiopeia",
        anchor: [0.09, 0.06],
        scale: 0.78,
        stars: [
            { id: "caph", x: 0, y: 22, m: 0.8 },
            { id: "schedar", x: 24, y: 78, m: 0.9, t: 4, name: "Schedar" },
            { id: "navi", x: 50, y: 40, m: 0.85 },
            { id: "ruchbah", x: 76, y: 88, m: 0.7 },
            { id: "segin", x: 100, y: 12, m: 0.6 }
        ],
        lines: [["caph", "schedar"], ["schedar", "navi"], ["navi", "ruchbah"], ["ruchbah", "segin"]]
    },
    {
        name: "Scorpius",
        anchor: [0.8, 0.5],
        scale: 1,
        stars: [
            { id: "acrab", x: 30, y: 0, m: 0.6 },
            { id: "dschubba", x: 22, y: 12, m: 0.75, t: 0 },
            { id: "pi", x: 8, y: 20, m: 0.5 },
            { id: "antares", name: "Antares", x: 36, y: 34, m: 1, t: 5 },
            { id: "tau", x: 42, y: 47, m: 0.55 },
            { id: "epsilon", x: 46, y: 60, m: 0.65 },
            { id: "mu", x: 54, y: 72, m: 0.55 },
            { id: "zeta", x: 66, y: 82, m: 0.6 },
            { id: "eta", x: 80, y: 86, m: 0.6 },
            { id: "theta", x: 92, y: 78, m: 0.7 },
            { id: "iota", x: 98, y: 64, m: 0.55 },
            { id: "shaula", name: "Shaula", x: 90, y: 50, m: 0.85, t: 0 },
            { id: "lesath", x: 98, y: 46, m: 0.55 }
        ],
        lines: [
            ["acrab", "dschubba"], ["dschubba", "pi"], ["dschubba", "antares"],
            ["antares", "tau"], ["tau", "epsilon"], ["epsilon", "mu"], ["mu", "zeta"],
            ["zeta", "eta"], ["eta", "theta"], ["theta", "iota"], ["iota", "shaula"], ["shaula", "lesath"]
        ]
    },
    {
        name: "Lyra",
        anchor: [0.33, 0.81],
        scale: 0.62,
        stars: [
            { id: "vega", name: "Vega", x: 22, y: 0, m: 1, t: 1 },
            { id: "epsilon", x: 6, y: 20, m: 0.5 },
            { id: "zeta", x: 36, y: 24, m: 0.55 },
            { id: "delta", x: 30, y: 62, m: 0.55, t: 4 },
            { id: "gamma", x: 80, y: 82, m: 0.7 },
            { id: "beta", x: 86, y: 44, m: 0.65 }
        ],
        lines: [
            ["vega", "epsilon"], ["vega", "zeta"], ["epsilon", "zeta"],
            ["zeta", "delta"], ["delta", "gamma"], ["gamma", "beta"], ["beta", "zeta"]
        ]
    }
];

const ease = t => 1 - Math.pow(1 - t, 3);
const clamp01 = v => Math.max(0, Math.min(1, v));

class Constellation {

    constructor(def, index) {
        this.def = def;
        this.index = index;
        this.seed = Math.random() * 100;
        this.hover = 0;
        this.visible = true;
        this.introAt = 400 + index * 450; // ms after load when it starts drawing in
        this.pulse = null;
        this.nextPulse = rand(2500, 6500);

        this.byId = new Map(def.stars.map(s => [s.id, s]));
        this.index = new Map(def.stars.map((s, i) => [s.id, i]));
        this.edges = def.lines.map(([a, b]) => [this.byId.get(a), this.byId.get(b)]);
        this.pts = def.stars.map(() => ({ x: 0, y: 0 }));
        this.layout = { ox: 0, oy: 0, s: 1, w: 0, h: 0 };
    }

    /**
     * Finds a spot that doesn't overlap the terminal or constellations placed before it.
     * Tries the preferred anchor first, then slides beside/above/below the terminal,
     * then shrinks and tries again. Returns the placed box (or null if hidden).
     */
    place(w, h, avoids) {
        const base = Math.max(110, Math.min(300, Math.min(w, h) * 0.3));
        let size = base * this.def.scale;

        const bounds = this.def.stars.reduce((acc, s) => ({
            w: Math.max(acc.w, s.x),
            h: Math.max(acc.h, s.y)
        }), { w: 1, h: 1 });

        const unit = Math.max(bounds.w, bounds.h);
        const margin = 24;
        const [fx, fy] = this.def.anchor;
        const terminal = avoids[0];

        for (let attempt = 0; attempt < 9; attempt++) {
            const pxW = (bounds.w / unit) * size;
            const pxH = (bounds.h / unit) * size;
            const clampX = x => Math.max(margin, Math.min(w - margin - pxW, x));
            const clampY = y => Math.max(margin, Math.min(h - margin - pxH - 20, y));

            const candidates = [{ x: fx * w, y: fy * h }];

            if (terminal) {
                candidates.push(
                    { x: terminal.left - pxW - 28, y: fy * h },
                    { x: terminal.right + 28, y: fy * h },
                    { x: fx * w, y: terminal.top - pxH - 44 },
                    { x: fx * w, y: terminal.bottom + 28 }
                );
            }

            for (const c of candidates) {
                const x = clampX(c.x);
                const y = clampY(c.y);
                const box = { left: x - 14, right: x + pxW + 14, top: y - 14, bottom: y + pxH + 30 };

                const hit = avoids.some(a => !(box.right < a.left || box.left > a.right || box.bottom < a.top || box.top > a.bottom));
                if (hit) continue;

                this.layout = { ox: x, oy: y, s: size / unit, w: pxW, h: pxH };
                this.visible = size >= 64;
                return this.visible ? box : null;
            }

            size *= 0.88;
        }

        this.visible = false;
        return null;
    }

    update(dt) {
        this.nextPulse -= dt * 1000;

        if (this.pulse) {
            this.pulse.t += dt / 0.9;
            if (this.pulse.t >= 1) this.pulse = null;
        } else if (this.nextPulse <= 0 && this.edges.length) {
            this.pulse = { edge: Math.floor(Math.random() * this.edges.length), t: 0 };
            this.nextPulse = rand(3500, 8000);
        }
    }

    project(now, cam, animate) {
        const { ox, oy, s, w, h } = this.layout;
        const driftX = animate ? Math.sin(now * 0.00031 + this.seed) * 6 : 0;
        const driftY = animate ? Math.cos(now * 0.00027 + this.seed * 1.3) * 5 : 0;
        const tilt = animate ? Math.sin(now * 0.00012 + this.seed) * 0.045 : 0;
        const cx = ox + w / 2 + driftX - cam.x * 0.6;
        const cy = oy + h / 2 + driftY - cam.y * 0.6;
        const cos = Math.cos(tilt);
        const sin = Math.sin(tilt);

        this.def.stars.forEach((star, i) => {
            const dx = star.x * s - w / 2;
            const dy = star.y * s - h / 2;
            this.pts[i].x = cx + dx * cos - dy * sin;
            this.pts[i].y = cy + dx * sin + dy * cos;
        });

        this.center = { x: cx, y: cy };
    }

    draw(ctx, now, cam, mouse, animate) {
        if (!this.visible) return;

        const elapsed = now - this.introAt;
        if (elapsed < 0) return;

        this.project(now, cam, animate);

        const intro = animate ? clamp01(elapsed / 2600) : 1;
        const drawn = ease(intro);

        // hover = mouse inside (padded) bounds
        const { w, h } = this.layout;
        const near = Math.abs(mouse.x - this.center.x) < w / 2 + 36 && Math.abs(mouse.y - this.center.y) < h / 2 + 36;
        this.hover += ((near && mouse.active ? 1 : 0) - this.hover) * 0.08;

        const pts = this.pts;
        const index = this.index;
        const lineAlpha = 0.2 + this.hover * 0.45;

        // ---- lines (draw in progressively) ----
        const total = this.edges.length;
        ctx.lineCap = "round";

        const stroke = (width, alpha) => {
            ctx.lineWidth = width;
            ctx.strokeStyle = `rgba(170,200,255,${alpha})`;
            ctx.beginPath();

            this.edges.forEach(([a, b], i) => {
                const local = clamp01(drawn * total - i);
                if (local <= 0) return;
                const pa = pts[index.get(a.id)];
                const pb = pts[index.get(b.id)];
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pa.x + (pb.x - pa.x) * local, pa.y + (pb.y - pa.y) * local);
            });

            ctx.stroke();
        };

        if (this.hover > 0.02) stroke(3.2, 0.06 + this.hover * 0.1);
        stroke(1, lineAlpha);

        // ---- travelling pulse ----
        if (this.pulse && animate) {
            const [a, b] = this.edges[this.pulse.edge];
            const pa = pts[index.get(a.id)];
            const pb = pts[index.get(b.id)];
            const t = this.pulse.t;
            const px = pa.x + (pb.x - pa.x) * t;
            const py = pa.y + (pb.y - pa.y) * t;
            const fade = Math.sin(t * Math.PI);

            ctx.globalAlpha = fade;
            ctx.drawImage(glowSprite(1), px - 14, py - 14, 28, 28);
            ctx.globalAlpha = 1;
        }

        // ---- stars ----
        this.def.stars.forEach((star, i) => {
            const p = pts[i];
            const reveal = clamp01(drawn * (this.def.stars.length + 2) - i * 0.9);
            if (reveal <= 0) return;

            const twinkle = animate ? 0.78 + 0.22 * Math.sin(now * 0.0018 + i * 1.7 + this.seed) : 0.9;
            const tint = star.t ?? 2;
            const glowSize = (7 + star.m * 13) * (1 + this.hover * 0.35) * reveal;

            ctx.globalAlpha = (0.55 + this.hover * 0.3) * twinkle * reveal;
            ctx.drawImage(glowSprite(tint), p.x - glowSize, p.y - glowSize, glowSize * 2, glowSize * 2);

            ctx.globalAlpha = Math.min(1, 0.85 * twinkle * reveal + 0.1);
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 0.9 + star.m * 1.5, 0, TAU);
            ctx.fill();
        });

        ctx.globalAlpha = 1;

        // ---- labels ----
        const labelAlpha = (0.2 + this.hover * 0.7) * drawn;
        if (labelAlpha > 0.02) {
            const lowest = pts.reduce((m, p) => Math.max(m, p.y), -Infinity);
            const left = pts.reduce((m, p) => Math.min(m, p.x), Infinity);

            ctx.font = "11px ui-monospace, Consolas, monospace";
            ctx.textBaseline = "top";
            ctx.fillStyle = `rgba(190,210,255,${labelAlpha})`;
            if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
            ctx.fillText(this.def.name.toUpperCase(), left, lowest + 14);
            if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

            if (this.hover > 0.3) {
                ctx.font = "10px ui-monospace, Consolas, monospace";
                ctx.fillStyle = `rgba(255,236,200,${(this.hover - 0.3) * 0.9})`;
                this.def.stars.forEach((star, i) => {
                    if (!star.name) return;
                    ctx.fillText(star.name, pts[i].x + 9, pts[i].y - 5);
                });
            }
        }
    }
}

export class Constellations {

    constructor() {
        this.list = DEFS.map((def, i) => new Constellation(def, i));
    }

    get count() {
        return this.list.filter(c => c.visible).length;
    }

    layout(width, height, terminalRect) {
        const avoids = [];

        if (terminalRect) {
            avoids.push({ left: terminalRect.left, right: terminalRect.right, top: terminalRect.top, bottom: terminalRect.bottom });
        }

        for (const c of this.list) {
            const box = c.place(width, height, avoids);
            if (box) avoids.push(box);
        }
    }

    update(dt) {
        for (const c of this.list) if (c.visible) c.update(dt);
    }

    draw(ctx, now, cam, mouse, animate = true) {
        for (const c of this.list) c.draw(ctx, now, cam, mouse, animate);
    }
}
