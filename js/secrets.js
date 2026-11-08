/*
 * Secret command effects: animated popups, full-screen effects, particles and sounds.
 * Every effect is a function registered in EFFECTS and triggered by `effect: "name"`
 * in commands.js. Popups that cover the page register as windows (so the terminal is
 * locked while they play and Esc closes them); ambient effects (matrix rain, confetti,
 * footsteps, meteor showers) let you keep typing.
 */

import { play } from "./audio.js";
import { registerWindow, unregisterWindow, shineify, reducedMotion } from "./windows.js";
import { h } from "./dom.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const terminalEl = () => document.getElementById("terminal");

/* ------------------------------------------------------------------ */
/* discovery tracking                                                 */
/* ------------------------------------------------------------------ */

const STORE_KEY = "fz-secrets-found";

export function getFound() {
    try {
        return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]"));
    } catch {
        return new Set();
    }
}

/** Marks a secret as found. Shows an achievement toast the first time. */
export function discover(name, total) {
    const found = getFound();
    if (found.has(name)) return false;

    found.add(name);
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify([...found]));
    } catch { /* private mode - still show the toast */ }

    const count = found.size;
    const complete = count >= total;

    setTimeout(() => {
        play("achievement");
        toast({
            icon: complete ? "🏆" : "✦",
            title: complete ? "All secrets found!" : "Secret discovered",
            text: complete ? "You found every hidden command. Legend." : `${name}  ·  ${count}/${total}`,
            duration: complete ? 6500 : 4200,
            progress: count / total
        });

        if (complete) {
            setTimeout(() => {
                play("chime");
                confetti({ count: 160, origin: { x: 0.5, y: 0.7 } });
                window.__sky?.shower(24, 8);
            }, 500);
        }
    }, 900);

    return true;
}

/* ------------------------------------------------------------------ */
/* building blocks                                                    */
/* ------------------------------------------------------------------ */

const active = new Map();

/**
 * Creates a full-screen layer. Returns a controller with timers that are
 * automatically cancelled when the layer closes.
 */
function layer(id, className, content, { lock = true, ambient = false, pauseSky = false, closeOnClick = true, duration = 0, onClose } = {}) {
    active.get(id)?.close();

    const el = h("div", { class: `fx-overlay ${className}${ambient ? " ambient" : ""}` });
    if (typeof content === "string") el.innerHTML = content;
    else if (content) el.append(content);
    document.body.appendChild(el);

    const timers = new Set();
    const intervals = new Set();
    let closed = false;

    const api = {
        el,
        get closed() { return closed; },

        later(fn, ms) {
            const t = setTimeout(() => {
                timers.delete(t);
                if (!closed) fn();
            }, ms);
            timers.add(t);
            return t;
        },

        every(fn, ms) {
            const t = setInterval(() => { if (!closed) fn(); }, ms);
            intervals.add(t);
            return t;
        },

        close() {
            if (closed) return;
            closed = true;
            timers.forEach(clearTimeout);
            intervals.forEach(clearInterval);
            onClose?.();
            el.classList.remove("open");
            el.classList.add("closing");
            setTimeout(() => el.remove(), 420);
            unregisterWindow(id);
            if (active.get(id) === api) active.delete(id);
        }
    };

    active.set(id, api);
    registerWindow(id, api.close, { lock, pauseSky });

    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("open")));

    if (closeOnClick && !ambient) el.addEventListener("click", () => api.close());
    if (duration) api.later(() => api.close(), duration);

    return api;
}

/** Slide-in notification card. */
export function toast({ icon = "✦", title, text, duration = 3800, progress = null }) {
    let host = document.getElementById("toast-host");
    if (!host) {
        host = h("div", { id: "toast-host" });
        document.body.appendChild(host);
    }

    const card = h("div", { class: "toast sheen" },
        h("div", { class: "toast-icon" }, icon),
        h("div", { class: "toast-body" },
            h("div", { class: "toast-title" }, title),
            text ? h("div", { class: "toast-text" }, text) : null,
            progress != null ? h("div", { class: "toast-bar" }, h("i", { style: `width:${Math.round(progress * 100)}%` })) : null));

    host.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("show")));

    setTimeout(() => {
        card.classList.remove("show");
        setTimeout(() => card.remove(), 500);
    }, duration);
}

/** Canvas particles: confetti bursts or falling emoji. */
export function confetti({ count = 110, origin = { x: 0.5, y: 0.6 }, emoji = null, rain = false, duration = 3200, colors: palette = null } = {}) {
    if (reducedMotion) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h2 = window.innerHeight;

    const canvas = h("canvas", { class: "fx-particles" });
    canvas.width = w * dpr;
    canvas.height = h2 * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h2}px`;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const colors = palette || ["#ff6b9d", "#ffd37a", "#7ee0b0", "#8ab4ff", "#b79cff", "#ffffff"];
    const parts = [];

    for (let i = 0; i < count; i++) {
        if (rain) {
            parts.push({
                x: rand(0, w), y: rand(-h2 * 0.9, -20),
                vx: rand(-30, 30), vy: rand(180, 420),
                rot: rand(0, 6.28), vr: rand(-3, 3),
                size: rand(22, 40), color: pick(colors), sway: rand(0, 6.28)
            });
        } else {
            const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
            const speed = rand(350, 950);
            parts.push({
                x: origin.x * w, y: origin.y * h2,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                rot: rand(0, 6.28), vr: rand(-9, 9),
                size: emoji ? rand(20, 34) : rand(6, 11), color: pick(colors), sway: rand(0, 6.28)
            });
        }
    }

    const start = performance.now();
    let last = start;

    function frame(now) {
        const dt = Math.min(0.04, (now - last) / 1000);
        last = now;
        const elapsed = now - start;

        ctx.clearRect(0, 0, w, h2);
        let alive = 0;

        for (const p of parts) {
            if (rain) {
                p.x += (p.vx + Math.sin(elapsed * 0.003 + p.sway) * 40) * dt;
                p.y += p.vy * dt;
            } else {
                p.vy += 1100 * dt;
                p.vx *= 1 - 1.6 * dt;
                p.vy *= 1 - 0.6 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
            }

            p.rot += p.vr * dt;
            if (p.y > h2 + 60) continue;
            alive++;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.max(0, Math.min(1, (duration - elapsed) / 600));

            if (emoji) {
                ctx.font = `${p.size}px serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(emoji, 0, 0);
            } else {
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            }

            ctx.restore();
        }

        if (elapsed < duration && alive > 0) requestAnimationFrame(frame);
        else canvas.remove();
    }

    requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ */
/* the effects                                                        */
/* ------------------------------------------------------------------ */

const FORTUNES = [
    "A shooting star will cross your path. Make a wish.",
    "You will soon find a bug you wrote yourself.",
    "Someone is thinking about you. Probably a cat.",
    "A great adventure waits behind the next closing bracket.",
    "Today's forecast: clear skies and low latency.",
    "You will merge without conflicts. (Don't tell anyone.)",
    "The stars lined up so you could end up here.",
    "Curiosity is the only superpower you need. You're already using it.",
    "Fortune favours those who type unknown commands.",
    "A nap of legendary quality is in your near future.",
    "Your next coffee will exist. Probably.",
    "An unexpected message will brighten your day.",
    "The answer is closer than you think. Try 42.",
    "You will find what you're looking for in the last place you check."
];

const EFFECTS = {

    /* ---------- fortune cookie ---------- */
    fortune() {
        const numbers = Array.from({ length: 6 }, () => Math.floor(rand(1, 60))).sort((a, b) => a - b).join(" · ");

        const fx = layer("fortune", "fx-fortune", `
            <div class="fortune">
                <div class="cookie">🥠</div>
                <div class="crumbs">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${(i / 14) * 360}deg;--d:${rand(70, 150).toFixed(0)}px"></i>`).join("")}</div>
                <div class="slip">
                    <div class="slip-text"></div>
                    <div class="slip-lucky">Lucky numbers: ${numbers}</div>
                </div>
                <div class="fx-hint">click anywhere to close</div>
            </div>`);

        fx.el.querySelector(".slip-text").textContent = pick(FORTUNES);
        shineify(fx.el.querySelector(".slip"), { delay: 1, duration: 6 });

        fx.later(() => { fx.el.classList.add("cracking"); play("crack"); }, 900);
        fx.later(() => { fx.el.classList.add("cracked"); play("chime"); }, 1250);
    },

    /* ---------- coffee ---------- */
    coffee() {
        const fx = layer("coffee", "fx-coffee", `
            <div class="coffee-ui window">
                <div class="cup-wrap">
                    <div class="steam"><i></i><i></i><i></i></div>
                    <div class="cup"><div class="cup-level"></div><div class="cup-handle"></div></div>
                    <div class="saucer"></div>
                </div>
                <div class="coffee-status"><span class="coffee-pct">Brewing... 12%</span></div>
                <div class="coffee-bar"><i></i></div>
                <div class="coffee-error">ERROR: no coffee found</div>
                <div class="coffee-sub">Try again tomorrow.</div>
            </div>`, { duration: 5200 });

        shineify(fx.el.querySelector(".coffee-ui"), { delay: 0.5 });

        const pct = fx.el.querySelector(".coffee-pct");
        let value = 12;
        fx.every(() => {
            value = Math.max(0, value - 1);
            pct.textContent = `Brewing... ${value}%`;
        }, 90);

        fx.later(() => fx.el.classList.add("empty"), 1100);
        fx.later(() => { fx.el.classList.add("failed"); play("coffee"); }, 2300);
    },

    /* ---------- sudo ---------- */
    sudo() {
        const fx = layer("sudo", "fx-sudo", `
            <div class="sudo-ui window">
                <div class="lock"><i class="shackle"></i><i class="body"></i></div>
                <div class="sudo-title">PERMISSION DENIED</div>
                <div class="sudo-sub">guest is not in the sudoers file.<br>This incident will be reported.</div>
            </div>`, { duration: 2800 });

        shineify(fx.el.querySelector(".sudo-ui"), { delay: 0.2, duration: 4 });
        play("error");
        fx.later(() => fx.el.classList.add("shake"), 150);
    },

    /* ---------- sandwich ---------- */
    sandwich() {
        play("nom");
        toast({ icon: "🥪", title: "Order up!", text: "One sandwich, coming right up.", duration: 3200 });
        confetti({ rain: true, emoji: "🥪", count: 46, duration: 4200 });
    },

    /* ---------- rm -rf / ---------- */
    rm() {
        const term = terminalEl();
        const dirs = ["/bin", "/boot", "/etc", "/home/guest", "/lib", "/usr/bin", "/usr/lib", "/var/www", "/var/log", "/srv/fuz", "/opt/stars", "/sys", "/proc"];
        const files = ["index.html", "style.css", "main.js", "stars.js", "secrets.js", "kernel.so", "config.sys", "cat_pics.zip", "homework.docx", "passwords.txt", "vibes.db"];

        const fx = layer("rm", "fx-rm", `
            <div class="rm-ui">
                <div class="rm-log"></div>
                <div class="rm-panel">
                    <div class="rm-title">rm: removing /</div>
                    <div class="rm-bar"><i></i></div>
                    <div class="rm-pct">0%</div>
                </div>
                <div class="rm-denied"><span>ACCESS DENIED</span><small>Nice try bud xD</small></div>
            </div>`, {
            onClose: () => term?.classList.remove("glitching")
        });

        const log = fx.el.querySelector(".rm-log");
        const bar = fx.el.querySelector(".rm-bar i");
        const pct = fx.el.querySelector(".rm-pct");
        let value = 0;

        play("glitch");
        term?.classList.add("glitching");

        fx.every(() => {
            if (fx.el.classList.contains("denied")) return;
            value = Math.min(37, value + rand(1, 4));
            bar.style.width = `${value}%`;
            pct.textContent = `${Math.floor(value)}%`;

            const line = h("div", {}, `removed '${pick(dirs)}/${pick(files)}'`);
            log.appendChild(line);
            while (log.children.length > 18) log.firstChild.remove();
        }, 85);

        fx.every(() => { if (!fx.el.classList.contains("denied")) play("glitch"); }, 700);

        fx.later(() => {
            fx.el.classList.add("denied");
            term?.classList.remove("glitching");
            play("error");
            play("stamp");
        }, 2900);

        fx.later(() => fx.close(), 5600);
    },

    /* ---------- exit / logout ---------- */
    exit() {
        const term = terminalEl();
        const fx = layer("exit", "fx-crt", `<div class="crt-text">NO SIGNAL</div>`, {
            closeOnClick: false,
            onClose: () => term?.classList.remove("crt-off", "crt-gone", "crt-on")
        });

        play("poweroff");
        term?.classList.add("crt-off");
        fx.later(() => { term?.classList.add("crt-gone"); fx.el.classList.add("nosignal"); }, 560);
        fx.later(() => {
            term?.classList.remove("crt-off", "crt-gone");
            term?.classList.add("crt-on");
            fx.el.classList.remove("nosignal");
            play("poweron");
        }, 2100);
        fx.later(() => fx.close(), 2900);
    },

    /* ---------- hack ---------- */
    hack() {
        const fx = layer("hack", "fx-hack", `
            <div class="hack-ui window">
                <div class="window-header">
                    <div class="traffic"><span class="red"></span><span class="yellow"></span><span class="green"></span></div>
                    <div class="title">root@mainframe: ~/breach.sh</div>
                </div>
                <div class="hack-body">
                    <div class="hack-log"></div>
                    <div class="hack-bars">
                        <div class="hack-row"><span>bypass firewall</span><div class="bar"><i></i></div><b>0%</b></div>
                        <div class="hack-row"><span>crack encryption</span><div class="bar"><i></i></div><b>0%</b></div>
                        <div class="hack-row"><span>inject payload</span><div class="bar"><i></i></div><b>0%</b></div>
                    </div>
                </div>
                <div class="hack-stamp"><span>ACCESS DENIED</span></div>
            </div>`);

        shineify(fx.el.querySelector(".hack-ui"), { delay: 0.3, duration: 5 });

        const log = fx.el.querySelector(".hack-log");
        const rows = [...fx.el.querySelectorAll(".hack-row")].map(row => ({ bar: row.querySelector("i"), pct: row.querySelector("b") }));
        const start = performance.now();
        const hex = () => Array.from({ length: 6 }, () => Math.floor(rand(0, 255)).toString(16).padStart(2, "0")).join(" ");
        const ip = () => `${Math.floor(rand(10, 250))}.${Math.floor(rand(0, 255))}.${Math.floor(rand(0, 255))}.${Math.floor(rand(1, 254))}`;
        const templates = [
            () => `[ OK ] connecting to ${ip()}`, () => `0x${hex()}`, () => `[ OK ] port ${Math.floor(rand(20, 9000))} open`,
            () => `> ssh -p ${Math.floor(rand(20, 9000))} root@${ip()}`, () => `0x${hex()}  ${hex()}`,
            () => `[WARN] intrusion detection active`, () => `decrypt: block ${Math.floor(rand(1, 4096))}/4096`
        ];

        play("blip");
        fx.every(() => {
            log.appendChild(h("div", {}, pick(templates)()));
            while (log.children.length > 14) log.firstChild.remove();
            play("blip");
        }, 70);

        fx.every(() => {
            const t = performance.now() - start;
            const targets = [
                Math.min(100, t / 9),
                Math.min(87, Math.max(0, (t - 600) / 14)),
                Math.min(23, Math.max(0, (t - 1800) / 30))
            ];

            targets.forEach((v, i) => {
                rows[i].bar.style.width = `${v}%`;
                rows[i].pct.textContent = `${Math.floor(v)}%`;
            });
        }, 50);

        fx.later(() => {
            fx.el.classList.add("denied");
            play("alarm");
            play("stamp");
        }, 3300);

        fx.later(() => fx.close(), 5600);
    },

    /* ---------- hello ---------- */
    hello() {
        play("wave");

        layer("hello", "fx-hello", `
            <div class="hello-bubble"><span class="wave">👋</span><span class="hello-text">Hello there!</span></div>`, { lock: false, ambient: true, duration: 3200 });

        confetti({ count: 90, origin: { x: 0.5, y: 0.75 } });
    },

    /* ---------- cd ---------- */
    cd() {
        const steps = 12;
        const html = Array.from({ length: steps }, (_, i) =>
            `<i class="${i % 2 ? "r" : "l"}" style="left:${6 + i * 7.4}%;--d:${(i * 0.24).toFixed(2)}s"></i>`).join("");

        const fx = layer("cd", "fx-steps", html, { lock: false, ambient: true, duration: 4600 });

        for (let i = 0; i < steps; i++) fx.later(() => play("step"), i * 240);
    },

    /* ---------- matrix ---------- */
    matrix() {
        let raf = 0;

        const fx = layer("matrix", "fx-matrix", `<canvas></canvas><div class="matrix-msg"><span></span><i></i></div>`, {
            lock: false, ambient: true, duration: 8200,
            onClose: () => cancelAnimationFrame(raf)
        });

        play("hum");

        const canvas = fx.el.querySelector("canvas");
        const msg = fx.el.querySelector(".matrix-msg span");
        const dpr = 1;
        const w = canvas.width = Math.floor(window.innerWidth * dpr);
        const hgt = canvas.height = Math.floor(window.innerHeight * dpr);
        const ctx = canvas.getContext("2d");

        const size = 16;
        const cols = Math.ceil(w / size);
        const drops = Array.from({ length: cols }, () => rand(-40, 0));
        const speeds = Array.from({ length: cols }, () => rand(0.5, 1.2));
        const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲ0123456789";

        let lastDraw = 0;

        function draw(now) {
            raf = requestAnimationFrame(draw);
            if (now - lastDraw < 45) return;
            lastDraw = now;

            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0,0,0,0.11)";
            ctx.fillRect(0, 0, w, hgt);
            ctx.globalCompositeOperation = "source-over";
            ctx.font = `${size}px monospace`;

            for (let i = 0; i < cols; i++) {
                const y = drops[i] * size;
                const ch = glyphs[Math.floor(Math.random() * glyphs.length)];

                ctx.fillStyle = "#d6ffe2";
                ctx.fillText(ch, i * size, y);
                ctx.fillStyle = "rgba(60,255,120,0.85)";
                ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * size, y - size);

                drops[i] += speeds[i];
                if (y > hgt && Math.random() > 0.975) drops[i] = rand(-20, 0);
            }
        }

        if (!reducedMotion) raf = requestAnimationFrame(draw);

        // typed message
        const lines = ["Wake up, Neo...", "The Matrix has you...", "Follow the white rabbit. 🐇"];
        let delay = 700;

        lines.forEach(line => {
            fx.later(() => { msg.textContent = ""; }, delay);
            [...line].forEach((ch, i) => {
                fx.later(() => { msg.textContent += ch; if (i % 2 === 0) play("tick"); }, delay + 60 + i * 70);
            });
            delay += line.length * 70 + 1100;
        });
    },

    /* ---------- 42 ---------- */
    deep() {
        const fx = layer("deep", "fx-deep", `
            <div class="deep-ui">
                <div class="deep-rays"></div>
                <div class="deep-phase think">
                    <div class="deep-name">DEEP THOUGHT</div>
                    <div class="deep-q">Computing the Answer to the Ultimate Question of Life, the Universe, and Everything</div>
                    <div class="deep-bar"><i></i></div>
                    <div class="deep-years">elapsed: <b>0</b> years</div>
                </div>
                <div class="deep-phase answer">
                    <div class="deep-number">42</div>
                    <div class="deep-sub">But what is the question?</div>
                </div>
            </div>`, { pauseSky: false });

        const years = fx.el.querySelector(".deep-years b");
        const start = performance.now();

        play("deep");

        fx.every(() => {
            const t = Math.min(1, (performance.now() - start) / 4000);
            years.textContent = Math.floor(7500000 * t * t).toLocaleString();
        }, 60);

        fx.later(() => fx.el.classList.add("revealed"), 4300);
        fx.later(() => fx.close(), 9800);
    },

    /* ---------- explode ---------- */
    explode() {
        if (reducedMotion) {
            toast({ icon: "\uD83D\uDCA5", title: "Boom.", text: "Explosion skipped because reduced motion is on.", duration: 3200 });
            return;
        }

        const term = terminalEl();
        if (!term) return;

        let raf = 0;

        const fx = layer("explode", "fx-explode", `<div class="shockwave"></div><div class="blast-flash"></div><div class="shards"></div>`, {
            ambient: true,
            closeOnClick: false,
            onClose: () => {
                cancelAnimationFrame(raf);
                term.style.visibility = "";
                term.style.removeProperty("--r");
                term.classList.remove("rumbling", "rebuild");
                document.getElementById("scene")?.classList.remove("blast-shake");
            }
        });

        const shardHost = fx.el.querySelector(".shards");
        const shockwave = fx.el.querySelector(".shockwave");

        // 1) the fuse: terminal rumbles harder and harder
        play("rumble");
        term.classList.add("rumbling");
        const t0 = performance.now();
        fx.every(() => term.style.setProperty("--r", Math.min(1, (performance.now() - t0) / 1500).toFixed(2)), 40);
        [0, 300, 560, 760, 900, 1020, 1120, 1210, 1290, 1360, 1420, 1470].forEach(ms => fx.later(() => play("blip"), ms));

        // 2) detonate: swap the terminal for shards of itself and throw them
        fx.later(() => {
            term.classList.remove("rumbling");
            const rect = term.getBoundingClientRect();
            const cols = 5;
            const rows = 4;
            const cw = rect.width / cols;
            const ch = rect.height / rows;

            const grid = Array.from({ length: cols + 1 }, (_, i) => Array.from({ length: rows + 1 }, (_, j) => ({
                x: i * cw + (i > 0 && i < cols ? rand(-0.34, 0.34) * cw : 0),
                y: j * ch + (j > 0 && j < rows ? rand(-0.34, 0.34) * ch : 0)
            })));

            const scroll = term.querySelector("#terminal-body")?.scrollTop || 0;
            const blast = { x: rect.width / 2 + rand(-90, 90), y: rect.height / 2 + rand(-50, 50) };
            const shards = [];

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const poly = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
                    const cx = poly.reduce((sum, p) => sum + p.x, 0) / 4;
                    const cy = poly.reduce((sum, p) => sum + p.y, 0) / 4;

                    const wrap = h("div", { class: "shard" });
                    wrap.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;` +
                        `transform-origin:${cx}px ${cy}px;clip-path:polygon(${poly.map(p => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(",")})`;

                    const clone = term.cloneNode(true);
                    clone.classList.remove("rumbling", "locked");
                    clone.classList.add("shard-clone");
                    clone.setAttribute("inert", "");
                    wrap.append(clone);
                    shardHost.append(wrap);

                    const body = clone.querySelector("#terminal-body");
                    if (body) body.scrollTop = scroll;

                    const dx = cx - blast.x;
                    const dy = cy - blast.y;
                    const len = Math.hypot(dx, dy) || 1;
                    const speed = rand(550, 1050);

                    shards.push({
                        el: wrap, x: 0, y: 0, r: 0,
                        vx: (dx / len) * speed + rand(-90, 90),
                        vy: (dy / len) * speed - rand(250, 700),
                        vr: rand(-520, 520)
                    });
                }
            }

            term.style.visibility = "hidden";
            fx.el.classList.add("boom");
            shockwave.style.left = `${rect.left + rect.width / 2}px`;
            shockwave.style.top = `${rect.top + rect.height / 2}px`;
            document.getElementById("scene")?.classList.add("blast-shake");

            play("boom");
            confetti({
                count: 170,
                origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
                duration: 2600,
                colors: ["#ffb347", "#ff7a1a", "#ff4d2e", "#ffe08a", "#ffffff"]
            });

            let last = performance.now();
            const start = last;

            const step = now => {
                const dt = Math.min(0.04, (now - last) / 1000);
                last = now;
                const t = (now - start) / 1000;

                for (const s of shards) {
                    s.vy += 2200 * dt;
                    s.x += s.vx * dt;
                    s.y += s.vy * dt;
                    s.r += s.vr * dt;
                    s.el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) rotate(${s.r.toFixed(1)}deg)`;
                    s.el.style.opacity = t > 1.4 ? Math.max(0, 1 - (t - 1.4) / 0.9).toFixed(2) : 1;
                }

                if (t < 2.4 && !fx.closed) raf = requestAnimationFrame(step);
            };

            raf = requestAnimationFrame(step);
        }, 1500);

        // 3) put the terminal back together
        fx.later(() => {
            shardHost.replaceChildren();
            term.style.visibility = "";
            term.classList.add("rebuild");
            play("poweron");
            toast({ icon: "\uD83D\uDD27", title: "Terminal rebuilt", text: "Please don't do that again.", duration: 3600 });
        }, 3800);

        fx.later(() => fx.close(), 4700);
    },

    /* ---------- freerobux ---------- */
    robux() {
        const target = 99999999999;

        const fx = layer("robux", "fx-robux", `
            <div class="robux-ui window">
                <div class="window-header">
                    <div class="traffic"><span class="red"></span><span class="yellow"></span><span class="green"></span></div>
                    <div class="title">robux-generator.exe</div>
                </div>
                <div class="robux-body">
                    <div class="robux-coin">R$</div>
                    <div class="robux-label">BALANCE</div>
                    <div class="robux-amount">0</div>
                    <div class="robux-gain">+99,999,999,999</div>
                    <div class="robux-bar"><i></i></div>
                    <div class="robux-status">Contacting totally-real servers...</div>
                    <div class="robux-foot">(just kidding, this isn't real)</div>
                </div>
            </div>`, { duration: 10500 });

        shineify(fx.el.querySelector(".robux-ui"), { delay: 0.3, duration: 6 });

        const amount = fx.el.querySelector(".robux-amount");
        const status = fx.el.querySelector(".robux-status");

        [[900, "Bypassing security..."], [1800, "Injecting Robux..."], [2900, "Success!"]].forEach(([ms, text]) => {
            fx.later(() => { status.textContent = text; play("blip"); }, ms);
        });

        let finished = false;

        fx.later(() => {
            const t0 = performance.now();

            fx.every(() => {
                if (finished) return;
                const p = Math.min(1, (performance.now() - t0) / 1900);
                amount.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US");
                if (Math.random() < 0.55) play("coin");

                if (p >= 1) {
                    finished = true;
                    amount.textContent = target.toLocaleString("en-US");
                    fx.el.classList.add("rich");
                    play("achievement");
                    play("chime");
                    confetti({ rain: true, emoji: "\uD83E\uDE99", count: 56, duration: 4600 });
                    confetti({ count: 90, origin: { x: 0.5, y: 0.45 }, colors: ["#ffd23f", "#ffe58a", "#ffb800", "#ffffff"] });
                }
            }, 45);
        }, 2900);

        fx.later(() => fx.el.classList.add("joke"), 6200);
    },

    /* ---------- wish ---------- */
    wish() {
        play("meteor");
        for (let i = 1; i < 7; i++) setTimeout(() => play("meteor"), i * 900);

        toast({ icon: "✨", title: "A wish drifts into the dark", text: "Watch the sky...", duration: 4200 });
        window.__sky?.shower(26, 7);
    }
};

/** Plays the named effect. Never throws: a broken effect must not break the terminal. */
export function runEffect(name) {
    const effect = EFFECTS[name];
    if (!effect) return;

    try {
        effect();
    } catch (error) {
        console.error(`Effect "${name}" failed`, error);
    }
}
