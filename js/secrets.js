import { play } from "./audio.js";
import { registerWindow, unregisterWindow, shineify, reducedMotion } from "./windows.js";
import { h } from "./dom.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const terminalEl = () => document.getElementById("terminal");

const STORE_KEY = "fz-secrets-found";

export function getFound() {
    try {
        return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]"));
    } catch {
        return new Set();
    }
}

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

const active = new Map();

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

export function toast({ icon = "", title, text, duration = 3800, progress = null }) {
    let host = document.getElementById("toast-host");
    if (!host) {
        host = h("div", { id: "toast-host" });
        document.body.appendChild(host);
    }

    const card = h("div", { class: "toast" },
        h("div", { class: "toast-body" },
            h("div", { class: "toast-title" }, title),
            text ? h("div", { class: "toast-text" }, text) : null),
        progress != null ? h("div", { class: "toast-bar" }, h("i", { style: `width:${Math.round(progress * 100)}%` })) : null);

    host.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("show")));

    setTimeout(() => {
        card.classList.remove("show");
        setTimeout(() => card.remove(), 400);
    }, duration);
}

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

    coffee() {
        const fx = layer("coffee", "fx-coffee", `
            <div class="coffee-ui window">
                <div class="cup-wrap">
                    <div class="steam"><i></i><i></i><i></i></div>
                    <div class="cup"><div class="cup-fill"><div class="cup-level"></div></div><div class="cup-handle"></div></div>
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

    sandwich() {
        play("nom");
        toast({ icon: "🥪", title: "Order up!", text: "One sandwich, coming right up.", duration: 3200 });
        confetti({ rain: true, emoji: "🥪", count: 46, duration: 4200 });
    },

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

    hello() {
        play("wave");

        layer("hello", "fx-hello", `
            <div class="hello-bubble"><span class="wave">👋</span><span class="hello-text">Hello there!</span></div>`, { lock: false, ambient: true, duration: 3200 });

        confetti({ count: 90, origin: { x: 0.5, y: 0.75 } });
    },

    cd() {
        const steps = 12;
        const html = Array.from({ length: steps }, (_, i) =>
            `<i class="${i % 2 ? "r" : "l"}" style="left:${6 + i * 7.4}%;--d:${(i * 0.24).toFixed(2)}s"></i>`).join("");

        const fx = layer("cd", "fx-steps", html, { lock: false, ambient: true, duration: 4600 });

        for (let i = 0; i < steps; i++) fx.later(() => play("step"), i * 240);
    },

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
            pauseSky: true,
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

        play("rumble");
        term.classList.add("rumbling");
        const t0 = performance.now();
        fx.every(() => term.style.setProperty("--r", Math.min(1, (performance.now() - t0) / 1500).toFixed(2)), 40);
        [0, 300, 560, 760, 900, 1020, 1120, 1210, 1290, 1360, 1420, 1470].forEach(ms => fx.later(() => play("blip"), ms));

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

            const bodyEl = term.querySelector("#terminal-body");
            const tpl = term.cloneNode(true);
            tpl.classList.remove("rumbling", "locked");
            tpl.classList.add("shard-clone");
            tpl.setAttribute("inert", "");
            tpl.querySelectorAll(".ring").forEach(n => n.remove());

            const view = bodyEl.getBoundingClientRect();
            const origKids = [...term.querySelectorAll("#output > *, #terminal-body > .banner, #terminal-body > .line")];
            const cloneKids = [...tpl.querySelectorAll("#output > *, #terminal-body > .banner, #terminal-body > .line")];
            origKids.forEach((node, i) => {
                const r = node.getBoundingClientRect();
                if (r.bottom < view.top - 8 || r.top > view.bottom + 8) {
                    const c = cloneKids[i];
                    c.replaceChildren();
                    c.style.boxSizing = "border-box";
                    c.style.height = `${r.height}px`;
                    c.style.padding = "0";
                    c.style.border = "0";
                }
            });

            const scroll = bodyEl.scrollTop;
            const blast = { x: rect.width / 2 + rand(-90, 90), y: rect.height / 2 + rand(-50, 50) };
            const shards = [];

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const poly = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
                    const xs = poly.map(p => p.x);
                    const ys = poly.map(p => p.y);
                    const minX = Math.min(...xs), maxX = Math.max(...xs);
                    const minY = Math.min(...ys), maxY = Math.max(...ys);
                    const cx = poly.reduce((sum, p) => sum + p.x, 0) / 4;
                    const cy = poly.reduce((sum, p) => sum + p.y, 0) / 4;

                    const wrap = h("div", { class: "shard" });
                    wrap.style.cssText = `left:${rect.left + minX}px;top:${rect.top + minY}px;width:${maxX - minX}px;height:${maxY - minY}px;` +
                        `transform-origin:${cx - minX}px ${cy - minY}px;` +
                        `clip-path:polygon(${poly.map(p => `${(p.x - minX).toFixed(1)}px ${(p.y - minY).toFixed(1)}px`).join(",")})`;

                    const clone = tpl.cloneNode(true);
                    clone.style.cssText = `left:${-minX}px !important;top:${-minY}px !important;width:${rect.width}px !important;height:${rect.height}px !important;`;
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
                count: 70,
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

                if (t < 2.3 && !fx.closed) raf = requestAnimationFrame(step);
            };

            raf = requestAnimationFrame(step);
        }, 1500);

        fx.later(() => {
            shardHost.replaceChildren();
            term.style.visibility = "";
            term.classList.add("rebuild");
            play("poweron");
            toast({ icon: "\uD83D\uDD27", title: "Terminal rebuilt", text: "Please don't do that again.", duration: 3600 });
        }, 3800);

        fx.later(() => fx.close(), 4700);
    },

    robux() {
        const target = 99999999999;

        const fx = layer("robux", "fx-robux", `
            <div class="robux-ui window">
                <div class="window-header">
                    <div class="traffic"><span class="red"></span><span class="yellow"></span><span class="green"></span></div>
                    <div class="title">robux-generator.exe</div>
                </div>
                <div class="robux-body">
                    <div class="robux-coin"><div class="coin-glow"></div><div class="coin-spin">${Array.from({ length: 9 }, (_, i) => `<i class="coin-edge" style="--z:${i - 4}px"></i>`).join("")}<b class="coin-face coin-front">R$</b><b class="coin-face coin-back">R$</b></div></div>
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

    sl() {
        if (reducedMotion) {
            toast({ icon: "🚂", title: "Choo choo", text: "The train skipped your screen (reduced motion).", duration: 3000 });
            return;
        }

        const art = [
            "      ~  ~",
            "     (    )",
            "   _[======]__      ______      ______      ______",
            "  |  CHOO!   |_____|  []  |____|  []  |____|  []  |",
            "  |__________|=====|______|====|______|====|______|",
            "    (o)  (o)  (o)    (o)(o)      (o)(o)      (o)(o)"
        ].join("\n");

        const fx = layer("sl", "fx-sl", `<pre class="sl-train">${art}</pre>`, { ambient: true, lock: false, duration: 6200 });
        play("horn");
        [300, 480, 660, 840, 1020, 1200, 1380, 1560, 1740, 1920, 2100, 2280, 2460, 2640, 2820, 3000, 3180, 3360, 3540, 3720].forEach(ms => fx.later(() => play("step"), ms));
    },

    vim() {
        const text = ["Dear diary,", "today I opened vim.", "I have been here for a while."];
        let mode = "normal";
        let cmd = "";
        let msg = "";
        let off = () => {};

        const fx = layer("vim", "fx-vim", `
            <div class="vim-ui window">
                <div class="window-header">
                    <div class="traffic"><span class="red"></span><span class="yellow"></span><span class="green"></span></div>
                    <div class="title">vim - notes.txt</div>
                </div>
                <pre class="vim-screen"></pre>
                <div class="vim-status"><span class="vim-file">notes.txt [+]</span><span class="vim-mode"></span></div>
                <div class="vim-cmdline"></div>
            </div>`, { closeOnClick: false, onClose: () => off() });

        const screen = fx.el.querySelector(".vim-screen");
        const modeEl = fx.el.querySelector(".vim-mode");
        const cmdEl = fx.el.querySelector(".vim-cmdline");

        const render = () => {
            const rows = text.map((line, i) => line + (mode !== "command" && i === text.length - 1 ? "█" : ""));
            while (rows.length < 12) rows.push("~");
            screen.textContent = rows.join("\n");
            modeEl.textContent = mode === "insert" ? "-- INSERT --" : mode === "command" ? "-- COMMAND --" : "NORMAL";
            cmdEl.textContent = mode === "command" ? `:${cmd}█` : msg;
            cmdEl.classList.toggle("typing", mode === "command");
        };

        const run = () => {
            const c = cmd.trim();
            mode = "normal";
            cmd = "";
            if (c === "q!" || c === "qa!") {
                fx.close();
                toast({ icon: "🏃", title: "You escaped", text: "Few ever do.", duration: 3600 });
                play("achievement");
                return;
            }
            play("error");
            if (c === "q" || c === "qa") msg = "E37: No write since last change (add ! to override)";
            else if (c === "wq" || c === "x") msg = "E45: 'readonly' option is set (add ! to override)";
            else if (c === "w") msg = "E212: Can't open file for writing";
            else msg = `E492: Not an editor command: ${c}`;
        };

        const onKey = event => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key === "Shift" || event.key === "CapsLock") return;
            event.preventDefault();
            event.stopImmediatePropagation();
            play("tick");
            msg = "";

            if (mode === "normal") {
                if (event.key === "i" || event.key === "a") mode = "insert";
                else if (event.key === "o") { text.push(""); mode = "insert"; }
                else if (event.key === ":") { mode = "command"; cmd = ""; }
            } else if (mode === "insert") {
                const last = text.length - 1;
                if (event.key === "Escape") mode = "normal";
                else if (event.key === "Enter") text.length < 11 && text.push("");
                else if (event.key === "Backspace") text[last] = text[last].slice(0, -1);
                else if (event.key.length === 1 && text[last].length < 46) text[last] += event.key;
            } else {
                if (event.key === "Escape") { mode = "normal"; cmd = ""; }
                else if (event.key === "Enter") run();
                else if (event.key === "Backspace") { if (cmd) cmd = cmd.slice(0, -1); else mode = "normal"; }
                else if (event.key.length === 1 && cmd.length < 16) cmd += event.key;
            }
            render();
        };

        window.addEventListener("keydown", onKey, true);
        off = () => window.removeEventListener("keydown", onKey, true);

        fx.el.querySelector(".traffic .red").addEventListener("click", () => { msg = "Nice try. Press Esc, then type :q! and Enter"; play("error"); render(); });
        shineify(fx.el.querySelector(".vim-ui"), { delay: 0.4, duration: 7 });
        render();

        fx.later(() => { if (mode !== "command") { msg = "hint: press Esc, then type :q! and press Enter"; render(); } }, 9000);
        fx.later(() => { fx.close(); toast({ icon: "🙏", title: "Rescued", text: "A kind stranger closed vim for you.", duration: 3600 }); }, 40000);
    },

    rickroll() {
        const frames = ["\\o/\n |\n/ \\", " o/\n/|\n/ >", "\\o \n |\\\n< \\", " o \n/|\\\n/ \\"];

        const fx = layer("rickroll", "fx-rick", `
            <div class="rick-ui window">
                <div class="window-header">
                    <div class="traffic"><span class="red"></span><span class="yellow"></span><span class="green"></span></div>
                    <div class="title">gift-card.exe</div>
                </div>
                <div class="rick-body">
                    <div class="rick-gift">🎁</div>
                    <div class="rick-title">YOU WON A $500 GIFT CARD!</div>
                    <div class="rick-sub">Claiming your prize...</div>
                    <div class="rick-bar"><i></i></div>
                    <pre class="rick-dance"></pre>
                    <div class="rick-got">You just got rickrolled.</div>
                    <div class="rick-small">(no song quoted, I'm not getting sued)</div>
                </div>
            </div>`, { duration: 10500 });

        shineify(fx.el.querySelector(".rick-ui"), { delay: 0.3, duration: 5 });
        const title = fx.el.querySelector(".rick-title");
        const sub = fx.el.querySelector(".rick-sub");
        const dance = fx.el.querySelector(".rick-dance");

        fx.later(() => { sub.textContent = "Verifying you are a very lucky person..."; play("blip"); }, 1300);
        fx.later(() => { sub.textContent = "Almost there..."; play("blip"); }, 2500);

        fx.later(() => {
            fx.el.classList.add("rolled");
            title.textContent = "GOTCHA!";
            sub.textContent = "";
            play("achievement");
            let i = 0;
            dance.textContent = frames[0];
            fx.every(() => { i += 1; dance.textContent = frames[i % frames.length]; play(i % 2 ? "tick" : "step"); }, 300);
            confetti({ count: 100, origin: { x: 0.5, y: 0.5 } });
        }, 3600);
    },

    blackhole() {
        const term = terminalEl();
        const scene = document.getElementById("scene");
        if (!term || reducedMotion) {
            toast({ icon: "🕳️", title: "Singularity", text: "Skipped (reduced motion).", duration: 3000 });
            return;
        }

        const w = window.innerWidth;
        const hh = window.innerHeight;
        const cx = w / 2;
        const cy = hh / 2;
        const canvas = h("canvas", { class: "fx-bh" });
        canvas.width = w;
        canvas.height = hh;
        const ctx = canvas.getContext("2d");
        let raf = 0;

        const fx = layer("blackhole", "fx-blackhole", canvas, {
            ambient: true,
            pauseSky: true,
            onClose: () => {
                cancelAnimationFrame(raf);
                term.classList.remove("sucked", "spat");
                scene?.classList.remove("bh-eat", "bh-spit");
                document.querySelector(".vignette")?.classList.remove("bh-hide");
            }
        });

        const maxD = Math.hypot(cx, cy);
        const parts = Array.from({ length: 70 }, () => ({
            a: rand(0, Math.PI * 2), d: rand(120, maxD), s: rand(0.8, 1.8), v: rand(0.8, 1.3),
            c: pick(["#ffffff", "#bcd0ff", "#ffe2b0"]), out: false
        }));

        play("whoosh");
        fx.later(() => { scene?.classList.add("bh-eat"); term.classList.add("sucked"); play("deep"); }, 700);
        fx.later(() => {
            scene?.classList.remove("bh-eat");
            scene?.classList.add("bh-spit");
            term.classList.remove("sucked");
            term.classList.add("spat");
            parts.forEach(p => { p.out = true; p.d = rand(30, 80); p.v = rand(500, 1100); });
            play("boom");
        }, 3700);
        fx.later(() => fx.close(), 5000);

        const t0 = performance.now();
        let last = t0;

        const frame = now => {
            const dt = Math.min(0.04, (now - last) / 1000);
            last = now;
            const t = (now - t0) / 1000;
            ctx.clearRect(0, 0, w, hh);

            const grow = Math.min(1, t / 0.7);
            const shrink = t > 3.9 ? Math.max(0, 1 - (t - 3.9) / 0.9) : 1;
            const r = 64 * grow * shrink;

            for (const p of parts) {
                const px = cx + Math.cos(p.a) * p.d;
                const py = cy + Math.sin(p.a) * p.d * 0.9;

                if (p.out) p.d += p.v * dt;
                else if (t > 0.7) {
                    p.a += (1.2 + 260 / p.d) * dt;
                    p.d -= (16 + 9000 / p.d) * dt * p.v;
                    if (p.d < r * 0.8) p.d = 9999;
                }

                ctx.strokeStyle = p.c;
                ctx.globalAlpha = Math.min(1, p.d / 160);
                ctx.lineWidth = p.s;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(cx + Math.cos(p.a) * p.d, cy + Math.sin(p.a) * p.d * 0.9);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;

            if (r > 1) {
                const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 3.2);
                glow.addColorStop(0, "rgba(255,170,70,.55)");
                glow.addColorStop(0.45, "rgba(150,70,255,.22)");
                glow.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2);
                ctx.fill();

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(-0.25);
                ctx.scale(1, 0.22);
                ctx.strokeStyle = "rgba(255,200,120,.9)";
                ctx.lineWidth = r * 0.22;
                ctx.beginPath();
                ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                ctx.fillStyle = "#000";
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            }

            if (!fx.closed) raf = requestAnimationFrame(frame);
        };

        raf = requestAnimationFrame(frame);
    },

    ping() {
        if (reducedMotion) return;
        const fx = layer("ping", "fx-ping", `<i></i><i></i><i></i>`, { ambient: true, lock: false, duration: 3600 });
        play("sonar");
        fx.later(() => play("sonar"), 900);
        fx.later(() => play("sonar"), 1800);
    },

    konami() {
        const fx = layer("konami", "fx-konami", `<div class="konami-text">+30 LIVES</div><div class="konami-sub">CHEAT CODE ACTIVATED</div>`, { ambient: true, lock: false, duration: 6500 });
        play("levelup");
        window.__sky?.shower(34, 7);
        confetti({ count: 160, origin: { x: 0.5, y: 0.75 }, colors: ["#ff4d6d", "#ffd23f", "#7ee0b0", "#5ca9ff", "#b79cff"] });
        fx.later(() => confetti({ count: 120, origin: { x: 0.2, y: 0.8 } }), 700);
        fx.later(() => confetti({ count: 120, origin: { x: 0.8, y: 0.8 } }), 1100);
    },

    gravity() {
        const body = document.getElementById("terminal-body");
        if (!body) return;

        if (reducedMotion) {
            toast({ icon: "\uD83C\uDF4E", title: "Gravity", text: "Things would have fallen (reduced motion).", duration: 3000 });
            return;
        }

        const view = body.getBoundingClientRect();
        const selector = ".banner, #output .line, #output .card, #output .social-card, #terminal-body > .line:not(#input-line)";
        let candidates = [...body.querySelectorAll(selector)];
        candidates = candidates.filter(el => !candidates.some(other => other !== el && other.contains(el)));

        const items = candidates
            .map(el => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.height > 0 && r.bottom > view.top && r.top < view.bottom)
            .slice(-26);

        const host = h("div", { class: "gravity-host" });
        document.body.appendChild(host);
        const pieces = [];
        let z = 10;
        let raf = 0;

        const G = 2600;
        const margin = 8;

        const place = p => {
            p.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.rot.toFixed(1)}deg)`;
        };

        const finish = () => {
            cancelAnimationFrame(raf);
            pieces.forEach(p => {
                p.held = true;
                p.el.animate([
                    { transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)` },
                    { transform: `translate(${p.origin.left}px, ${p.origin.top}px) rotate(0deg)` }
                ], { duration: 520, easing: "cubic-bezier(.2, .9, .2, 1)", fill: "forwards" });
            });
            setTimeout(() => {
                pieces.forEach(p => { p.source.style.visibility = ""; });
                host.remove();
            }, 560);
        };

        const fx = layer("gravity", "fx-gravity", "", { ambient: true, duration: 120000, onClose: finish });
        play("whoosh");

        const textBox = el => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let left = Infinity;
            let right = -Infinity;
            while (walker.nextNode()) {
                if (!walker.currentNode.nodeValue.trim()) continue;
                const range = document.createRange();
                range.selectNodeContents(walker.currentNode);
                const box = range.getBoundingClientRect();
                if (!box.width) continue;
                left = Math.min(left, box.left);
                right = Math.max(right, box.right);
            }
            return right > left ? { left, width: right - left } : null;
        };

        items.forEach(({ el, r }, i) => {
            const tight = el.classList.contains("line") || el.classList.contains("banner") ? textBox(el) : null;
            const left = tight ? tight.left : r.left;
            const width = tight ? Math.ceil(tight.width) + 4 : r.width;

            const piece = h("div", { class: "g-piece" });
            const copy = el.cloneNode(true);
            copy.style.cssText = `position:relative;left:${r.left - left}px;width:${r.width}px;margin:0`;
            piece.appendChild(copy);
            piece.style.width = `${width}px`;
            piece.style.overflow = "hidden";
            host.appendChild(piece);
            el.style.visibility = "hidden";

            const p = {
                el: piece, source: el, origin: { left, top: r.top },
                x: left, y: r.top, w: width, h: r.height,
                vx: rand(-160, 160), vy: 0, rot: 0, vr: rand(-45, 45),
                start: performance.now() + 250 + i * 45 + rand(0, 100),
                held: false, asleep: false
            };
            pieces.push(p);
            place(p);
        });

        const step = (now, dt) => {
            for (const p of pieces) {
                if (p.held || p.asleep || now < p.start) continue;

                p.vy += G * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += p.vr * dt;

                const floor = window.innerHeight - p.h - margin;
                const right = window.innerWidth - p.w - margin;

                if (p.x < margin) { p.x = margin; p.vx = Math.abs(p.vx) * 0.5; }
                if (p.x > right) { p.x = right; p.vx = -Math.abs(p.vx) * 0.5; }

                if (p.y >= floor) {
                    p.y = floor;
                    if (p.vy > 260) play("stamp");
                    p.vy = p.vy > 220 ? -p.vy * 0.32 : 0;
                    p.vx *= 0.7;
                    p.vr *= 0.4;
                    p.rot = Math.max(-18, Math.min(18, p.rot));
                    if (!p.vy && Math.abs(p.vx) < 8) { p.vx = 0; p.vr = 0; p.asleep = true; }
                }

                place(p);
            }
        };

        let last = performance.now();
        const loop = now => {
            const dt = Math.min(0.033, (now - last) / 1000);
            last = now;
            step(now, dt);
            if (!fx.closed) raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        let drag = null;

        host.addEventListener("pointerdown", event => {
            const el = event.target.closest(".g-piece");
            const p = pieces.find(item => item.el === el);
            if (!p || performance.now() < p.start) return;

            drag = { p, dx: event.clientX - p.x, dy: event.clientY - p.y, trail: [] };
            p.held = true;
            p.asleep = false;
            p.vx = p.vy = p.vr = 0;
            el.style.zIndex = String(++z);
            el.classList.add("dragging");
            el.setPointerCapture(event.pointerId);
            event.preventDefault();
        });

        host.addEventListener("pointermove", event => {
            if (!drag) return;
            const { p } = drag;
            p.x = event.clientX - drag.dx;
            p.y = event.clientY - drag.dy;
            drag.trail.push({ x: p.x, y: p.y, t: performance.now() });
            if (drag.trail.length > 6) drag.trail.shift();
            place(p);
        });

        const release = () => {
            if (!drag) return;
            const { p, trail } = drag;
            const a = trail[0];
            const b = trail[trail.length - 1];
            p.el.classList.remove("dragging");

            if (a && b && b.t > a.t && performance.now() - b.t < 120) {
                const span = (b.t - a.t) / 1000;
                p.vx = Math.max(-2200, Math.min(2200, (b.x - a.x) / span));
                p.vy = Math.max(-2200, Math.min(2200, (b.y - a.y) / span));
                p.vr = p.vx * 0.03;
            }

            p.held = false;
            drag = null;
        };

        host.addEventListener("pointerup", release);
        host.addEventListener("pointercancel", release);

        const hint = h("div", { class: "g-hint" }, "Drag the text around.", h("button", { type: "button" }, "Put it back"));
        hint.querySelector("button").addEventListener("click", () => fx.close());
        host.appendChild(hint);
    },

    bsod() {
        const term = terminalEl();
        const fx = layer("bsod", "fx-bsod", `
            <div class="bsod-ui">
                <div class="bsod-face">:(</div>
                <div class="bsod-text">Your terminal ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</div>
                <div class="bsod-pct"><span>0</span>% complete</div>
                <div class="bsod-foot">
                    <div class="bsod-qr" aria-hidden="true"></div>
                    <div class="bsod-small">If you call a support person, give them this info:<br>Stop code: SKILL_ISSUE_EXCEPTION<br>What failed: fuz.sys</div>
                </div>
            </div>
            <div class="bsod-restart">Restarting...</div>`, {
            closeOnClick: false,
            onClose: () => { if (term) term.style.visibility = ""; }
        });

        if (term) term.style.visibility = "hidden";
        play("glitch");
        fx.later(() => play("poweroff"), 150);

        const pct = fx.el.querySelector(".bsod-pct span");
        let value = 0;
        fx.later(() => {
            fx.every(() => {
                value = Math.min(100, value + Math.ceil(rand(1, 7)));
                pct.textContent = value;
            }, 170);
        }, 900);

        fx.later(() => { fx.el.classList.add("restarting"); play("poweroff"); }, 5200);
        fx.later(() => {
            if (term) { term.style.visibility = ""; term.classList.add("rebuild"); setTimeout(() => term.classList.remove("rebuild"), 900); }
            play("poweron");
            fx.close();
            toast({ icon: "🖥️", title: "Back online", text: "Have you tried turning it off and on again?", duration: 3600 });
        }, 6400);
    },

    cat() {
        const victim = [...document.querySelectorAll("#output .result .line")].pop() || null;

        if (reducedMotion || !victim) {
            toast({ icon: "🐱", title: "Meow", text: "A cat appeared. Briefly.", duration: 3000 });
            return;
        }

        const r = victim.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(victim);
        const textRight = range.getBoundingClientRect().right;

        const catSvg = `
            <svg class="cat-svg" viewBox="0 0 40 22" shape-rendering="crispEdges" aria-hidden="true">
                <g class="cat-tail"><rect x="1" y="5" width="2" height="6" fill="#d9893a"/><rect x="3" y="9" width="3" height="2" fill="#d9893a"/></g>
                <rect x="5" y="8" width="18" height="9" fill="#e8a05a"/>
                <rect x="9" y="8" width="2" height="9" fill="#d9893a"/><rect x="14" y="8" width="2" height="9" fill="#d9893a"/>
                <rect x="21" y="3" width="10" height="10" fill="#e8a05a"/>
                <rect x="21" y="1" width="3" height="3" fill="#e8a05a"/><rect x="28" y="1" width="3" height="3" fill="#e8a05a"/>
                <rect x="22" y="2" width="1" height="1" fill="#f6c6a0"/><rect x="29" y="2" width="1" height="1" fill="#f6c6a0"/>
                <rect x="24" y="6" width="2" height="2" fill="#16130f"/><rect x="28" y="6" width="2" height="2" fill="#16130f"/>
                <rect x="26" y="9" width="2" height="1" fill="#e07a8f"/>
                <g class="cat-legs-a"><rect x="6" y="17" width="3" height="5" fill="#d9893a"/><rect x="18" y="17" width="3" height="5" fill="#d9893a"/></g>
                <g class="cat-legs-b"><rect x="11" y="17" width="3" height="5" fill="#d9893a"/><rect x="22" y="17" width="3" height="5" fill="#d9893a"/></g>
                <g class="cat-paw"><rect x="30" y="10" width="5" height="3" fill="#e8a05a"/><rect x="34" y="10" width="3" height="3" fill="#f6c6a0"/></g>
            </svg>`;

        const fx = layer("cat", "fx-cat", `<div class="cat flipped"><div class="cat-flip">${catSvg}</div><div class="cat-bubble">meow</div></div>`, {
            ambient: true,
            duration: 11500,
            onClose: () => { dropHost?.remove(); victim.style.visibility = ""; }
        });
        const cat = fx.el.querySelector(".cat");
        let dropHost = null;
        const size = 110;
        const svgH = size * 22 / 40;
        const left = Math.min(window.innerWidth - size - 10, textRight + 18);
        const top = Math.max(8, r.bottom - svgH + 6);
        let fall = null;

        cat.style.cssText = `left:${left}px;top:${-svgH - 20}px;width:${size}px`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            cat.style.transition = "top .65s cubic-bezier(.5, 0, 1, .6)";
            cat.style.top = `${top}px`;
        }));

        fx.later(() => { cat.classList.add("land"); play("stamp"); }, 700);
        fx.later(() => { cat.classList.remove("land"); cat.classList.add("lying"); }, 1300);
        fx.later(() => cat.classList.add("pawing"), 1900);

        const nudge = (ms, big) => fx.later(() => {
            play("tick");
            if (!big) victim.animate([{ transform: "none" }, { transform: "translateX(-12px)" }, { transform: "none" }], { duration: 260, easing: "ease-out" });
            else {
                play("crack");
                const copy = h("div", { class: "g-piece" });
                copy.appendChild(victim.cloneNode(true));
                copy.style.cssText = `left:${r.left}px;top:${r.top}px;width:${Math.ceil(range.getBoundingClientRect().width) + 4}px`;
                dropHost = h("div", { class: "gravity-host" }, copy);
                document.body.appendChild(dropHost);
                victim.style.visibility = "hidden";
                const drop = window.innerHeight - r.top + 60;
                fall = copy.animate([
                    { transform: "none", opacity: 1 },
                    { transform: "translate(-30px, -6px) rotate(-6deg)", opacity: 1, offset: 0.15 },
                    { transform: `translate(-110px, ${drop}px) rotate(-38deg)`, opacity: 1 }
                ], { duration: 1100 + drop * 0.5, easing: "cubic-bezier(.5, 0, .9, .6)", fill: "forwards" });
                fall.finished.then(() => dropHost?.remove()).catch(() => {});
            }
        }, ms);

        nudge(2220, false);
        nudge(2920, false);
        nudge(3620, true);

        fx.later(() => { cat.classList.remove("pawing", "lying"); cat.classList.add("meow"); play("wave"); }, 4300);

        fx.later(() => {
            fall?.cancel();
            dropHost?.remove();
            victim.style.visibility = "";
            victim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
            cat.classList.remove("meow", "flipped");
            cat.classList.add("walking");
            cat.style.transition = "left 2.6s linear";
            cat.style.left = `${window.innerWidth + 20}px`;
        }, 5800);
    },

    wish() {
        play("meteor");
        for (let i = 1; i < 7; i++) setTimeout(() => play("meteor"), i * 900);

        toast({ icon: "✨", title: "A wish drifts into the dark", text: "Watch the sky...", duration: 4200 });
        window.__sky?.shower(26, 7);
    }
};

export function runEffect(name) {
    const effect = EFFECTS[name];
    if (!effect) return;

    try {
        effect();
    } catch (error) {
        console.error(`Effect "${name}" failed`, error);
    }
}
