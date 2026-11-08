const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

export const TINTS = [
    [190, 210, 255],
    [214, 228, 255],
    [255, 255, 255],
    [255, 246, 226],
    [255, 226, 186],
    [255, 196, 150]
];

const TINT_WEIGHTS = [0.16, 0.22, 0.3, 0.16, 0.11, 0.05];

function pickTint() {
    let roll = Math.random();
    for (let i = 0; i < TINT_WEIGHTS.length; i++) {
        roll -= TINT_WEIGHTS[i];
        if (roll <= 0) return i;
    }
    return 2;
}

const rgb = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;

const spriteCache = new Map();

export function glowSprite(tint, size = 64) {
    const key = `g${tint}-${size}`;
    if (spriteCache.has(key)) return spriteCache.get(key);

    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const half = size / 2;
    const grad = g.createRadialGradient(half, half, 0, half, half, half);
    const col = TINTS[tint] || TINTS[2];

    grad.addColorStop(0, rgb(col, 1));
    grad.addColorStop(0.12, rgb(col, 0.85));
    grad.addColorStop(0.32, rgb(col, 0.28));
    grad.addColorStop(0.65, rgb(col, 0.06));
    grad.addColorStop(1, rgb(col, 0));

    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);

    spriteCache.set(key, c);
    return c;
}

function spikeSprite(tint, size = 128) {
    const key = `s${tint}-${size}`;
    if (spriteCache.has(key)) return spriteCache.get(key);

    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const half = size / 2;
    const col = TINTS[tint] || TINTS[2];

    for (const vertical of [false, true]) {
        const grad = vertical
            ? g.createLinearGradient(half, 0, half, size)
            : g.createLinearGradient(0, half, size, half);

        grad.addColorStop(0, rgb(col, 0));
        grad.addColorStop(0.5, rgb(col, 0.9));
        grad.addColorStop(1, rgb(col, 0));

        g.fillStyle = grad;
        if (vertical) g.fillRect(half - 0.6, 0, 1.2, size);
        else g.fillRect(0, half - 0.6, size, 1.2);
    }

    spriteCache.set(key, c);
    return c;
}

function gaussian() {
    return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());
}

function renderBackground(w, h, dpr) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    const g = c.getContext("2d");
    g.scale(dpr, dpr);

    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, "#03040b");
    base.addColorStop(0.55, "#060917");
    base.addColorStop(1, "#04050d");
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);

    const diag = Math.hypot(w, h);

    g.globalCompositeOperation = "lighter";
    const clouds = [
        { x: 0.18, y: 0.28, r: 0.42, col: [96, 70, 190], a: 0.13 },
        { x: 0.82, y: 0.72, r: 0.46, col: [40, 120, 170], a: 0.10 },
        { x: 0.55, y: 0.1, r: 0.3, col: [170, 60, 150], a: 0.07 },
        { x: 0.3, y: 0.9, r: 0.34, col: [60, 90, 200], a: 0.07 }
    ];

    for (const cloud of clouds) {
        const cx = cloud.x * w + rand(-40, 40);
        const cy = cloud.y * h + rand(-40, 40);
        const radius = cloud.r * diag * 0.5;
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, rgb(cloud.col, cloud.a));
        grad.addColorStop(0.5, rgb(cloud.col, cloud.a * 0.35));
        grad.addColorStop(1, rgb(cloud.col, 0));
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
    }

    const angle = -0.52;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const spread = Math.min(w, h) * 0.11;

    g.save();
    g.translate(cx, cy);
    g.rotate(angle);
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, diag * 0.55);
    glow.addColorStop(0, "rgba(150,170,255,0.07)");
    glow.addColorStop(1, "rgba(150,170,255,0)");
    g.scale(1, (spread * 2.2) / (diag * 0.55));
    g.fillStyle = glow;
    g.beginPath();
    g.arc(0, 0, diag * 0.55, 0, TAU);
    g.fill();
    g.restore();

    const dust = Math.min(7000, Math.floor((w * h) / 260));
    for (let i = 0; i < dust; i++) {
        const along = rand(-0.62, 0.62) * diag;
        const across = gaussian() * spread * (0.6 + 0.4 * Math.random());
        const x = cx + along * cos - across * sin;
        const y = cy + along * sin + across * cos;
        const warm = Math.random() < 0.28;
        g.fillStyle = warm
            ? `rgba(255,232,200,${rand(0.03, 0.11)})`
            : `rgba(200,218,255,${rand(0.03, 0.12)})`;
        const s = rand(0.35, 1.1);
        g.fillRect(x, y, s, s);
    }

    g.globalCompositeOperation = "source-over";
    return c;
}

const LAYERS = [
    // share = fraction of all stars, size range (css px), parallax depth, twinkle depth
    { share: 0.62, min: 0.35, max: 0.95, depth: 0.15, twinkle: 0.35, sky: 0.7, glow: false },
    { share: 0.29, min: 0.8, max: 1.5, depth: 0.45, twinkle: 0.5, sky: 1.0, glow: false },
    { share: 0.09, min: 1.4, max: 2.7, depth: 1.0, twinkle: 0.6, sky: 1.3, glow: true }
];

export class Starfield {

    constructor() {
        this.width = 0;
        this.height = 0;
        this.dpr = 1;
        this.background = null;
        this.layers = [];
        this.meteors = [];
        this.queue = [];
        this.skyAngle = 0;
        this.nextMeteor = 1.2;
        this.count = 0;
        this.motion = true;
    }

    resize(width, height, dpr) {
        this.width = width;
        this.height = height;
        this.dpr = dpr;
        this.background = renderBackground(width, height, dpr);
        this.populate();
    }

    populate() {
        const { width: w, height: h } = this;

        this.radius = Math.hypot(w, h) / 2 + 40;
        const discArea = Math.PI * this.radius * this.radius;
        const total = Math.min(1400, Math.round(discArea / 6500));

        this.layers = LAYERS.map(def => {
            const n = Math.round(total * def.share);
            const buckets = TINTS.map(() => []);

            for (let i = 0; i < n; i++) {
                const a = Math.random() * TAU;
                const r = Math.sqrt(Math.random()) * this.radius;
                const size = def.min + (def.max - def.min) * Math.pow(Math.random(), 2.6);
                const tint = pickTint();

                buckets[tint].push({
                    x: Math.cos(a) * r,
                    y: Math.sin(a) * r,
                    size,
                    base: rand(0.35, 1),
                    speed: rand(0.6, 2.6),
                    phase: rand(0, TAU),
                    tint
                });
            }

            let spikes = [];
            if (def.glow) {
                const all = buckets.flat().sort((a, b) => b.size - a.size);
                spikes = all.slice(0, Math.max(3, Math.round(all.length * 0.12)));
                spikes.forEach(star => { star.spike = true; star.base = Math.max(star.base, 0.8); });
            }

            return { def, buckets };
        });

        this.count = this.layers.reduce((sum, l) => sum + l.buckets.reduce((s, b) => s + b.length, 0), 0);
    }

    shoot(options = {}) {
        const { width: w, height: h } = this;
        const fireball = options.fireball ?? Math.random() < 0.12;
        const direction = options.direction ?? (Math.random() < 0.5 ? 1 : -1);
        const angle = options.angle ?? rand(0.28, 0.85); // downward slope
        const speed = options.speed ?? (fireball ? rand(650, 900) : rand(950, 1600));
        const life = options.life ?? (fireball ? rand(1.1, 1.6) : rand(0.55, 1.0));

        const startX = options.x ?? (direction > 0 ? rand(-0.05, 0.7) : rand(0.3, 1.05)) * w;
        const startY = options.y ?? rand(-0.05, 0.5) * h;

        this.meteors.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed * direction,
            vy: Math.sin(angle) * speed,
            life,
            age: 0,
            trail: fireball ? rand(240, 360) : rand(110, 230),
            width: fireball ? rand(2.4, 3.2) : rand(1.1, 2),
            tint: fireball ? pick([4, 5]) : pick([0, 1, 2, 2, 3]),
            fireball
        });
    }

    shower(count = 18, duration = 6) {
        const angle = rand(0.4, 0.7);
        const direction = Math.random() < 0.5 ? 1 : -1;

        for (let i = 0; i < count; i++) {
            this.queue.push({
                at: Math.pow(Math.random(), 0.8) * duration,
                options: {
                    angle: angle + rand(-0.06, 0.06),
                    direction,
                    fireball: i % 7 === 3,
                    x: (direction > 0 ? rand(-0.1, 0.8) : rand(0.2, 1.1)) * this.width,
                    y: rand(-0.1, 0.45) * this.height
                }
            });
        }
    }

    update(dt) {
        if (this.motion) this.skyAngle += dt * 0.0008;

        this.queue = this.queue.filter(item => {
            item.at -= dt;
            if (item.at <= 0) {
                this.shoot(item.options);
                return false;
            }
            return true;
        });

        if (this.motion) {
            this.nextMeteor -= dt;
            if (this.nextMeteor <= 0 && this.meteors.length < 3) {
                this.shoot();
                this.nextMeteor = rand(2.5, 7.5);
            }
        }

        for (const m of this.meteors) {
            m.age += dt;
            m.x += m.vx * dt;
            m.y += m.vy * dt;
        }

        this.meteors = this.meteors.filter(m => m.age < m.life);
    }

    draw(ctx, t, cam) {
        const { width: w, height: h } = this;

        ctx.globalAlpha = 1;
        ctx.drawImage(this.background, 0, 0, w, h);

        for (const layer of this.layers) {
            this.drawLayer(ctx, layer, t, cam);
        }

        this.drawMeteors(ctx);
        ctx.globalAlpha = 1;
    }

    drawLayer(ctx, { def, buckets }, t, cam) {
        const w = this.width;
        const h = this.height;

        ctx.save();
        ctx.translate(w / 2 - cam.x * def.depth, h / 2 - cam.y * def.depth);
        ctx.rotate(this.skyAngle * def.sky);

        for (let tint = 0; tint < buckets.length; tint++) {
            const stars = buckets[tint];
            if (!stars.length) continue;

            const col = TINTS[tint];
            ctx.fillStyle = rgb(col, 1);

            for (const star of stars) {
                const wave = this.motion
                    ? 0.5 + 0.5 * Math.sin(t * 0.001 * star.speed + star.phase)
                    : 0.75;
                const alpha = star.base * (1 - def.twinkle + def.twinkle * wave);

                if (def.glow) {
                    const s = star.size * 7;
                    ctx.globalAlpha = alpha * 0.9;
                    ctx.drawImage(glowSprite(tint), star.x - s, star.y - s, s * 2, s * 2);

                    if (star.spike) {
                        const len = star.size * 16;
                        ctx.globalAlpha = alpha * 0.55;
                        ctx.drawImage(spikeSprite(tint), star.x - len, star.y - len, len * 2, len * 2);
                    }

                    ctx.globalAlpha = Math.min(1, alpha + 0.15);
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size * 0.55, 0, TAU);
                    ctx.fill();
                } else if (star.size > 1.15) {
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size * 0.5, 0, TAU);
                    ctx.fill();
                } else {
                    ctx.globalAlpha = alpha;
                    ctx.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
                }
            }
        }

        ctx.restore();
    }

    drawMeteors(ctx) {
        for (const m of this.meteors) {
            const progress = m.age / m.life;
            const fadeIn = Math.min(1, m.age / 0.08);
            const fadeOut = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1;
            const alpha = Math.max(0, fadeIn * fadeOut);

            const speed = Math.hypot(m.vx, m.vy);
            const ux = m.vx / speed;
            const uy = m.vy / speed;
            const trail = m.trail * (0.35 + 0.65 * Math.min(1, m.age / 0.2));
            const tx = m.x - ux * trail;
            const ty = m.y - uy * trail;
            const col = TINTS[m.tint];

            const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
            grad.addColorStop(0, rgb(col, 0.95 * alpha));
            grad.addColorStop(0.25, rgb(col, 0.35 * alpha));
            grad.addColorStop(1, rgb(col, 0));

            ctx.globalAlpha = 1;
            ctx.lineCap = "round";
            ctx.strokeStyle = grad;
            ctx.lineWidth = m.width;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            ctx.lineWidth = Math.max(0.6, m.width * 0.4);
            ctx.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - ux * trail * 0.35, m.y - uy * trail * 0.35);
            ctx.stroke();

            const glow = m.width * (m.fireball ? 9 : 6);
            ctx.globalAlpha = alpha;
            ctx.drawImage(glowSprite(m.tint), m.x - glow, m.y - glow, glow * 2, glow * 2);

            if (m.fireball) {
                for (let i = 1; i <= 4; i++) {
                    const back = i * trail * 0.2;
                    const ex = m.x - ux * back + Math.sin(m.age * 20 + i) * 3;
                    const ey = m.y - uy * back + Math.cos(m.age * 17 + i) * 3;
                    ctx.globalAlpha = alpha * (0.5 - i * 0.1);
                    ctx.fillStyle = rgb(col, 1);
                    ctx.fillRect(ex, ey, 1.6, 1.6);
                }
            }
        }
    }
}
