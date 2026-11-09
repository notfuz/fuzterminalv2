import { play } from "./audio.js";
import { shineify, reducedMotion } from "./windows.js";
import { h } from "./dom.js";
import { layer, toast, confetti } from "./secrets.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const term = () => document.getElementById("terminal");
const scene = () => document.getElementById("scene");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function skipped(icon, title) {
    toast({ icon, title, text: "Skipped because reduced motion is on.", duration: 3000 });
}

function appendLine(text, className = "") {
    const results = document.querySelectorAll("#output .result");
    const host = results[results.length - 1] || document.getElementById("output");
    const line = h("div", { class: `line reveal ${className}`.trim() }, text);
    host.appendChild(line);
    const body = document.getElementById("terminal-body");
    if (body) body.scrollTop = body.scrollHeight;
    return line;
}

async function typeLines(lines, gap = 420, sound = "tick") {
    for (const line of lines) {
        appendLine(line);
        play(sound);
        await sleep(gap);
    }
}

function fullCanvas(className) {
    const canvas = h("canvas", { class: className });
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return canvas;
}

export const EFFECTS2 = {

    earthquake() {
        const t = term();
        if (!t) return;
        if (reducedMotion) return skipped("🌋", "Earthquake");

        const rect = t.getBoundingClientRect();
        const loose = [];
        let raf = 0;

        const cracks = [];
        const grow = (x, y, angle, len, depth, delay) => {
            let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
            let cx = x;
            let cy = y;
            const steps = Math.ceil(len / 22);

            for (let i = 0; i < steps; i++) {
                angle += rand(-0.45, 0.45);
                cx += Math.cos(angle) * 22;
                cy += Math.sin(angle) * 22;
                d += ` L${cx.toFixed(1)} ${cy.toFixed(1)}`;
                if (depth < 2 && Math.random() < 0.28) grow(cx, cy, angle + rand(-1.1, 1.1), len * 0.5, depth + 1, delay + i * 0.05);
            }

            cracks.push(`<path d="${d}" pathLength="1" style="--d:${delay.toFixed(2)}s" />`);
        };

        const origins = [[0.3, 0.35], [0.68, 0.6], [0.5, 0.15]];
        origins.forEach(([ox, oy], i) => {
            for (let k = 0; k < 4; k++) grow(rect.width * ox, rect.height * oy, rand(0, Math.PI * 2), rand(110, 230), 0, 1 + i * 0.7 + k * 0.12);
        });

        const fx = layer("earthquake", "fx-quake", `<svg class="quake-cracks" viewBox="0 0 ${rect.width} ${rect.height}" style="left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px">${cracks.join("")}</svg>`, {
            ambient: true,
            onClose: () => {
                cancelAnimationFrame(raf);
                loose.forEach(a => a.cancel());
                t.classList.remove("quaking");
                t.style.removeProperty("--q");
                scene()?.classList.remove("quaking");
                scene()?.style.removeProperty("--q");
            }
        });

        play("rumble");
        t.classList.add("quaking");
        scene()?.classList.add("quaking");

        const t0 = performance.now();
        fx.every(() => {
            const q = Math.min(1, (performance.now() - t0) / 3600).toFixed(2);
            t.style.setProperty("--q", q);
            scene()?.style.setProperty("--q", q);
        }, 50);

        [900, 1700, 2500].forEach(ms => fx.later(() => play("crack"), ms));
        fx.later(() => play("rumble"), 2200);

        fx.later(() => {
            document.querySelectorAll("#output .line, #terminal-body .banner").forEach(el => {
                loose.push(el.animate([
                    { transform: "translate(0, 0) rotate(0deg)" },
                    { transform: `translate(${rand(-9, 9)}px, ${rand(-5, 5)}px) rotate(${rand(-2.5, 2.5)}deg)` }
                ], { duration: rand(70, 140), iterations: Infinity, direction: "alternate", easing: "steps(2)" }));
            });
            play("stamp");
        }, 2600);

        fx.later(() => {
            loose.splice(0).forEach(a => a.cancel());
            t.classList.remove("quaking");
            scene()?.classList.remove("quaking");
            fx.el.classList.add("settle");
            play("poweron");
        }, 4600);

        fx.later(() => fx.close(), 6200);
    },

    flip() {
        const root = document.documentElement;
        const fx = layer("flip", "fx-flip", "", {
            ambient: true,
            lock: false,
            duration: 6500,
            onClose: () => {
                root.classList.remove("flipped");
                toast({ icon: "🙃", title: "Right side up again", text: "Hope you enjoyed the view.", duration: 2800 });
            }
        });
        root.classList.add("flipped");
        play("whoosh");
        return fx;
    },

    glitch({ ms = 3200 } = {}) {
        const t = term();
        if (!t) return;
        if (reducedMotion) return skipped("📺", "Glitch");

        const walker = document.createTreeWalker(document.getElementById("output") || t, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.trim()) nodes.push([walker.currentNode, walker.currentNode.nodeValue]);
        }

        const glyphs = "#%&@$?!<>/\\|01░▒▓";
        const restore = () => nodes.forEach(([node, original]) => { node.nodeValue = original; });

        const fx = layer("glitch", "fx-glitch", `<div class="glitch-scan"></div><div class="glitch-tear"></div><div class="glitch-tear"></div><div class="glitch-tear"></div>`, {
            ambient: true,
            duration: ms,
            onClose: () => {
                restore();
                t.classList.remove("glitching");
            }
        });

        t.classList.add("glitching");
        play("glitch");

        const tears = [...fx.el.querySelectorAll(".glitch-tear")];
        fx.every(() => {
            tears.forEach(tear => {
                tear.style.top = `${rand(0, 100)}%`;
                tear.style.height = `${rand(2, 34)}px`;
                tear.style.transform = `translateX(${rand(-40, 40)}px)`;
                tear.style.opacity = Math.random() < 0.7 ? 1 : 0;
            });
            nodes.forEach(([node, original]) => {
                node.nodeValue = original.replace(/\S/g, c => (Math.random() < 0.2 ? pick(glyphs) : c));
            });
        }, 80);

        fx.later(() => play("glitch"), 1400);
        fx.later(() => { restore(); }, Math.max(300, ms - 450));
    },

    supernova() {
        if (reducedMotion) return skipped("💥", "Supernova");

        const x = rand(20, 80);
        const y = rand(14, 34);
        const fx = layer("supernova", "fx-nova", `
            <div class="sn-star" style="left:${x}%;top:${y}%"></div>
            <div class="sn-nebula" style="left:${x}%;top:${y}%"><i></i><i></i><i></i></div>
            <div class="sn-flash"></div>`, { ambient: true, duration: 8200 });

        play("deep");
        fx.later(() => fx.el.classList.add("swell"), 60);
        fx.later(() => { fx.el.classList.add("blast"); play("boom"); }, 2700);
        fx.later(() => { play("chime"); window.__sky?.shower(14, 6); }, 3600);
    },

    rain() {
        if (reducedMotion) return skipped("🌧️", "Rain");

        const canvas = fullCanvas("fx-weather");
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const hh = canvas.height;
        const drops = Array.from({ length: 240 }, () => ({ x: rand(-100, w), y: rand(0, hh), l: rand(12, 28), v: rand(900, 1500) }));
        let flash = 0;
        let bolt = null;
        let raf = 0;

        const fx = layer("rain", "fx-rain", canvas, { ambient: true, pauseSky: true, duration: 8000, onClose: () => cancelAnimationFrame(raf) });
        play("rain");

        const strike = () => {
            let x = rand(w * 0.15, w * 0.85);
            let y = 0;
            const pts = [[x, y]];
            while (y < hh * rand(0.45, 0.75)) {
                x += rand(-34, 34);
                y += rand(18, 42);
                pts.push([x, y]);
            }
            bolt = pts;
            flash = 1;
            fx.later(() => { flash = 0.7; }, 90);
            fx.later(() => { flash = 1; }, 160);
            fx.later(() => { bolt = null; }, 260);
            fx.later(() => play("thunder"), 450);
        };

        [900, 3300, 5600].forEach(ms => fx.later(strike, ms));

        let last = performance.now();
        const frame = now => {
            const dt = Math.min(0.04, (now - last) / 1000);
            last = now;
            ctx.clearRect(0, 0, w, hh);

            ctx.fillStyle = `rgba(8, 14, 30, ${0.3})`;
            ctx.fillRect(0, 0, w, hh);

            ctx.strokeStyle = "rgba(170, 195, 255, .5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (const d of drops) {
                d.y += d.v * dt;
                d.x -= d.v * 0.18 * dt;
                if (d.y > hh) { d.y = -d.l; d.x = rand(-100, w); }
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + d.l * 0.18, d.y - d.l);
            }
            ctx.stroke();

            if (bolt) {
                ctx.strokeStyle = "#f4f7ff";
                ctx.shadowColor = "#9db8ff";
                ctx.shadowBlur = 18;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                bolt.forEach(([bx, by], i) => (i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by)));
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            if (flash > 0) {
                ctx.fillStyle = `rgba(225, 235, 255, ${flash * 0.45})`;
                ctx.fillRect(0, 0, w, hh);
                flash = Math.max(0, flash - dt * 2.2);
            }

            if (!fx.closed) raf = requestAnimationFrame(frame);
        };

        raf = requestAnimationFrame(frame);
    },

    warp() {
        if (reducedMotion) return skipped("🚀", "Warp");

        const canvas = fullCanvas("fx-weather");
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const hh = canvas.height;
        const cx = w / 2;
        const cy = hh / 2;
        const maxD = Math.hypot(cx, cy);
        const stars = Array.from({ length: 260 }, () => ({ a: rand(0, Math.PI * 2), d: rand(8, maxD), v: rand(0.6, 1.4), c: pick(["#ffffff", "#bcd0ff", "#a8c4ff", "#ffe9c4"]) }));
        const t0 = performance.now();
        let raf = 0;

        const fx = layer("warp", "fx-warp", canvas, { ambient: true, pauseSky: true, duration: 4600, onClose: () => cancelAnimationFrame(raf) });
        play("whoosh");
        fx.later(() => { play("boom"); fx.el.classList.add("jump"); }, 1500);
        fx.later(() => play("poweron"), 3300);

        let last = t0;
        const frame = now => {
            const dt = Math.min(0.04, (now - last) / 1000);
            last = now;
            const t = (now - t0) / 1000;
            const speed = t < 1.5 ? 1 + Math.pow(t / 1.5, 3) * 34 : t < 3.2 ? 35 : Math.max(1, 35 * (1 - (t - 3.2) / 1.2));

            ctx.clearRect(0, 0, w, hh);
            ctx.fillStyle = `rgba(2, 4, 14, ${Math.min(0.78, 0.15 + t * 0.4)})`;
            ctx.fillRect(0, 0, w, hh);
            ctx.lineCap = "round";

            for (const s of stars) {
                const prev = s.d;
                s.d += (40 + s.d * 1.6) * speed * s.v * dt * 0.6;
                if (s.d > maxD + 40) { s.d = rand(4, 40); s.a = rand(0, Math.PI * 2); continue; }
                const tail = Math.max(prev, s.d - Math.min(260, 4 + speed * s.d * 0.06));
                ctx.strokeStyle = s.c;
                ctx.globalAlpha = Math.min(1, s.d / 140);
                ctx.lineWidth = 1 + s.d / maxD * 2;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(s.a) * tail, cy + Math.sin(s.a) * tail);
                ctx.lineTo(cx + Math.cos(s.a) * s.d, cy + Math.sin(s.a) * s.d);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            if (!fx.closed) raf = requestAnimationFrame(frame);
        };

        raf = requestAnimationFrame(frame);
    },

    snake() {
        const COLS = 20;
        const ROWS = 15;
        const CELL = 18;
        const HI_KEY = "fz-snake-hi";
        let best = 0;
        try { best = Number(localStorage.getItem(HI_KEY)) || 0; } catch { /* no storage */ }

        let off = () => {};
        const fx = layer("snake", "fx-snake", `
            <div class="snake-ui window">
                <div class="window-header">
                    <div class="traffic"><span class="red"></span><span class="yellow"></span><span class="green"></span></div>
                    <div class="title">snake.exe</div>
                </div>
                <div class="snake-bar"><span class="snake-score"></span><span class="snake-best"></span></div>
                <canvas class="snake-canvas" width="${COLS * CELL}" height="${ROWS * CELL}"></canvas>
                <div class="snake-foot">arrows / WASD to move · P to pause · Esc to quit</div>
            </div>`, { closeOnClick: false, onClose: () => off() });

        shineify(fx.el.querySelector(".snake-ui"), { delay: 0.4, duration: 7 });
        const canvas = fx.el.querySelector(".snake-canvas");
        const ctx = canvas.getContext("2d");
        const scoreEl = fx.el.querySelector(".snake-score");
        const bestEl = fx.el.querySelector(".snake-best");

        let snake, dir, queue, food, score, dead, paused, started;

        const spawnFood = () => {
            do {
                food = { x: Math.floor(rand(0, COLS)), y: Math.floor(rand(0, ROWS)) };
            } while (snake.some(s => s.x === food.x && s.y === food.y));
        };

        const reset = () => {
            snake = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
            dir = { x: 1, y: 0 };
            queue = [];
            score = 0;
            dead = false;
            paused = false;
            started = false;
            spawnFood();
        };

        const draw = () => {
            ctx.fillStyle = "#0b0d10";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "rgba(255,255,255,.035)";
            for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if ((x + y) % 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);

            ctx.fillStyle = "#ff6b8a";
            ctx.beginPath();
            ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
            ctx.fill();

            snake.forEach((s, i) => {
                ctx.fillStyle = i === 0 ? "#9bffc8" : `hsl(150 70% ${58 - Math.min(i, 18) * 1.3}%)`;
                ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
            });

            scoreEl.textContent = `score ${score}`;
            bestEl.textContent = `best ${best}`;

            if (dead || paused || !started) {
                ctx.fillStyle = "rgba(0,0,0,.6)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#e8ebf5";
                ctx.font = "700 16px Consolas, monospace";
                ctx.textAlign = "center";
                ctx.fillText(dead ? "Game over" : paused ? "Paused" : "Press an arrow key", canvas.width / 2, canvas.height / 2 - 6);
                ctx.font = "13px Consolas, monospace";
                if (dead) ctx.fillText("Space to play again", canvas.width / 2, canvas.height / 2 + 16);
            }
        };

        const tick = () => {
            if (dead || paused || !started) return;
            if (queue.length) dir = queue.shift();

            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
            const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
            const hitSelf = snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y);

            if (hitWall || hitSelf) {
                dead = true;
                play("error");
                if (score > best) {
                    best = score;
                    try { localStorage.setItem(HI_KEY, String(best)); } catch { /* no storage */ }
                    toast({ icon: "🏆", title: "New high score", text: `${best} points`, duration: 2800 });
                }
                draw();
                return;
            }

            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) {
                score += 1;
                play("coin");
                spawnFood();
            } else {
                snake.pop();
            }
            draw();
        };

        const KEYS = {
            ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
            ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
            ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
            ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
        };

        const onKey = event => {
            if (event.ctrlKey || event.metaKey || event.altKey || event.key === "Escape") return;

            if (KEYS[event.key]) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const [x, y] = KEYS[event.key];
                const last = queue.length ? queue[queue.length - 1] : dir;
                if (last.x + x === 0 && last.y + y === 0) return;
                if (last.x === x && last.y === y) return;
                if (queue.length < 2) queue.push({ x, y });
                started = true;
                paused = false;
                return;
            }

            if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (dead) reset();
                draw();
                return;
            }

            if (event.key === "p" || event.key === "P") {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (started && !dead) paused = !paused;
                draw();
            }
        };

        window.addEventListener("keydown", onKey, true);
        off = () => window.removeEventListener("keydown", onKey, true);

        reset();
        draw();
        fx.every(tick, 105);
    },

    pet(args = []) {
        const action = args[0] || "";
        const state = petState;
        if (!["", "feed", "sleep", "wake", "bye", "leave", "remove"].includes(action)) return;

        const say = (icon, title, text) => toast({ icon, title, text, duration: 2600 });

        if (action === "bye" || action === "leave" || action === "remove") {
            if (!state.el) return say("👋", "Fuzzy isn't here", "Type pet to bring them back.");
            destroyPet();
            return;
        }

        if (!state.el) spawnPet();
        else if (!action) return say("🐾", "Fuzzy is already here", "Try pet feed, pet sleep or pet bye.");

        if (action === "sleep") {
            state.sleeping = true;
            state.el.classList.add("sleeping");
            play("hum");
        } else if (action === "wake") {
            state.sleeping = false;
            state.el.classList.remove("sleeping");
            play("pop");
        } else if (action === "feed") {
            if (state.sleeping) { state.sleeping = false; state.el.classList.remove("sleeping"); }
            dropFood();
        }
    },

    flashlight() {
        if (reducedMotion) return skipped("🔦", "Flashlight");

        const secrets = [
            ["psst... try `gravity`", 12, 18],
            ["there is a cat somewhere", 70, 12],
            ["`wish` on a star", 22, 72],
            ["have you tried turning it off? (`bsod`)", 62, 82],
            ["`hello` is a nice thing to say", 80, 46],
            ["the answer is `42`", 8, 46],
            ["not every command is in `help`", 44, 90],
            ["`secrets` keeps count", 46, 8]
        ];

        let off = () => {};
        const fx = layer("flashlight", "fx-flashlight", `
            <div class="fl-dark"></div>
            <div class="fl-secrets">${secrets.map(([text, x, y]) => `<span style="left:${x}%;top:${y}%">${text}</span>`).join("")}</div>`, {
            ambient: true,
            lock: false,
            duration: 30000,
            onClose: () => off()
        });

        const move = (x, y) => {
            fx.el.style.setProperty("--x", `${x}px`);
            fx.el.style.setProperty("--y", `${y}px`);
        };
        move(window.innerWidth / 2, window.innerHeight / 2);

        const onMove = event => move(event.clientX, event.clientY);
        const onKey = event => { if (event.key === "Escape") fx.close(); };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("keydown", onKey);
        off = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("keydown", onKey);
        };

        play("poweroff");
        toast({ icon: "🔦", title: "Lights out", text: "Move your cursor. Esc turns them back on.", duration: 3600 });
    },

    "8ball"(args = []) {
        const answers = [
            "It is certain", "Without a doubt", "Yes, definitely", "You may rely on it", "As I see it, yes",
            "Most likely", "Outlook good", "Signs point to yes", "Reply hazy, try again", "Ask again later",
            "Better not tell you now", "Cannot predict now", "Concentrate and ask again", "Don't count on it",
            "My reply is no", "My sources say no", "Outlook not so good", "Very doubtful"
        ];
        const answer = pick(answers);
        const question = args.join(" ");

        const fx = layer("8ball", "fx-8ball", `
            <div class="ball-wrap">
                <div class="ball"><div class="ball-window"><span class="ball-eight">8</span><span class="ball-answer"></span></div></div>
                ${question ? `<div class="ball-question"></div>` : ""}
                <div class="fx-hint" style="bottom:-60px">click anywhere to close</div>
            </div>`, { duration: 9000 });

        if (question) fx.el.querySelector(".ball-question").textContent = `"${question}"`;
        const ball = fx.el.querySelector(".ball");
        const label = fx.el.querySelector(".ball-answer");
        label.textContent = answer;

        fx.later(() => { ball.classList.add("shaking"); [0, 180, 360, 540, 720, 900, 1080].forEach(ms => setTimeout(() => play("tick"), ms)); }, 500);
        fx.later(() => { ball.classList.remove("shaking"); ball.classList.add("answered"); play("chime"); }, 2200);
        fx.later(() => appendLine(`The ball says: ${answer}.`, "info"), 2500);
    },

    roll(args = []) {
        const raw = (args[0] || "6").replace(/^d/, "");
        const sides = Math.max(2, Math.min(1000, parseInt(raw, 10) || 6));
        const result = 1 + Math.floor(Math.random() * sides);
        const cube = sides === 6;

        const faces = [[1, "rotateY(0deg)"], [6, "rotateY(180deg)"], [3, "rotateY(90deg)"], [4, "rotateY(-90deg)"], [2, "rotateX(90deg)"], [5, "rotateX(-90deg)"]];
        const fx = layer("roll", "fx-roll", `
            <div class="dice-wrap">
                ${cube
                    ? `<div class="dice-scene"><div class="dice">${faces.map(([n, t]) => `<div class="dice-face" style="transform:${t} translateZ(48px)">${n}</div>`).join("")}</div></div>`
                    : `<div class="dice-number"><small>d${sides}</small><b>?</b></div>`}
                <div class="fx-hint" style="bottom:-60px">click anywhere to close</div>
            </div>`, { duration: 7000 });

        const land = {
            1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0]
        };

        if (cube) {
            const dice = fx.el.querySelector(".dice");
            const [rx, ry] = land[result];
            for (let i = 0; i < 9; i++) fx.later(() => play("tick"), 150 + i * 180);
            fx.later(() => {
                dice.style.transition = "transform 1.9s cubic-bezier(.15,.7,.2,1)";
                dice.style.transform = `rotateX(${rx + 720}deg) rotateY(${ry + 1080}deg)`;
            }, 80);
        } else {
            const number = fx.el.querySelector(".dice-number b");
            fx.every(() => { if (!fx.el.classList.contains("landed")) { number.textContent = 1 + Math.floor(Math.random() * sides); play("tick"); } }, 90);
            fx.later(() => { number.textContent = result; }, 1900);
        }

        fx.later(() => {
            fx.el.classList.add("landed");
            play(result === sides ? "achievement" : "pop");
            if (result === sides) confetti({ count: 70, origin: { x: 0.5, y: 0.5 } });
            appendLine(`You rolled a ${result}${sides === 6 ? "" : ` (d${sides})`}.`, "info");
        }, 2100);
    },

    coin() {
        const heads = Math.random() < 0.5;
        const edges = Array.from({ length: 9 }, (_, i) => `<i class="coin-edge" style="--z:${i - 4}px"></i>`).join("");

        const fx = layer("coin", "fx-coin", `
            <div class="flip-wrap">
                <div class="flip-toss">
                    <div class="flipc">${edges}<b class="coin-face coin-front">H</b><b class="coin-face coin-back">T</b></div>
                </div>
                <div class="flip-result"></div>
                <div class="fx-hint" style="bottom:-60px">click anywhere to close</div>
            </div>`, { duration: 7000 });

        const coin = fx.el.querySelector(".flipc");
        const toss = fx.el.querySelector(".flip-toss");
        const label = fx.el.querySelector(".flip-result");

        play("whoosh");
        fx.later(() => {
            toss.classList.add("tossed");
            coin.style.transition = "transform 2s cubic-bezier(.2,.6,.3,1)";
            coin.style.transform = `rotateY(${1800 + (heads ? 0 : 180)}deg) rotateX(12deg)`;
            [0, 250, 500, 800, 1100, 1500].forEach(ms => setTimeout(() => play("coin"), ms));
        }, 120);

        fx.later(() => {
            label.textContent = heads ? "HEADS" : "TAILS";
            fx.el.classList.add("landed");
            play("stamp");
            appendLine(`The coin landed on ${heads ? "heads" : "tails"}.`, "info");
        }, 2300);
    },

    nuke() {
        const t = term();
        if (!t) return;
        if (reducedMotion) return skipped("☢️", "rm -rf");

        const lines = [...document.querySelectorAll("#output .line, #output .card, #terminal-body > .line, #terminal-body .banner")].reverse();
        const hidden = [];

        const fx = layer("nuke", "fx-nuke", `<div class="nuke-screen"><pre class="nuke-log"></pre></div>`, {
            closeOnClick: false,
            onClose: () => {
                hidden.forEach(el => { el.style.visibility = ""; });
                t.style.transition = "";
                t.style.opacity = "";
                const s = scene();
                if (s) { s.style.transition = ""; s.style.opacity = ""; }
            }
        });
        fx.el.style.background = "none";

        const log = fx.el.querySelector(".nuke-log");
        const screen = fx.el.querySelector(".nuke-screen");
        play("alarm");

        lines.forEach((el, i) => fx.later(() => {
            el.style.visibility = "hidden";
            hidden.push(el);
            if (i % 3 === 0) play("tick");
        }, 300 + i * 70));

        const wipe = 300 + lines.length * 70;
        fx.later(() => {
            t.style.transition = "opacity .7s ease";
            t.style.opacity = "0";
            const s = scene();
            if (s) { s.style.transition = "opacity 1.2s ease"; s.style.opacity = "0"; }
            play("poweroff");
        }, wipe + 200);

        fx.later(() => screen.classList.add("show"), wipe + 1100);

        const removing = ["/bin", "/boot", "/etc", "/home/fuz", "/lib", "/opt", "/usr/share/stars", "/usr/share/constellations", "/var/log", "/sys", "/proc", "/dev/null (already nothing)", "/"];
        const start = wipe + 1500;
        removing.forEach((path, i) => fx.later(() => { log.textContent += `removing '${path}'\n`; play("tick"); }, start + i * 170));

        const after = start + removing.length * 170;
        fx.later(() => { log.textContent += "\nNothing left to delete.\n_"; }, after + 500);
        fx.later(() => { log.textContent += "\n\n...just kidding."; play("chime"); }, after + 2300);

        fx.later(() => {
            screen.classList.remove("show");
            t.style.opacity = "1";
            const s = scene();
            if (s) s.style.opacity = "1";
            hidden.forEach(el => { el.style.visibility = ""; });
            play("poweron");
        }, after + 3600);

        fx.later(() => fx.close(), after + 4600);
    },

    apt(args = []) {
        if (args[0] !== "install" || !args[1]) return;
        const pkg = args[1];

        const replies = {
            "more-ram": "Your computer now has infinite RAM. Chrome is still using all of it.",
            "more-fps": "Framerate unlocked. Your monitor refuses to keep up.",
            rizz: "Rizz installed. Side effects: confidence, mild cringe.",
            motivation: "Motivation installed. It will start working tomorrow.",
            sleep: "Sleep installed. Nobody has ever managed to run it before 2 a.m.",
            friends: "E: Unable to locate package friends. Have you tried a Discord server?",
            bugs: "0 bugs installed. 14 bugs were already here.",
            coffee: "E: coffee: No such file or directory. See: the coffee command.",
            "free-robux": "Package is a total scam. Installed it anyway."
        };

        const fx = layer("apt", "fx-apt", `
            <div class="apt-card">
                <div class="apt-title">Installing ${pkg.replace(/[<>&]/g, "")}</div>
                <div class="apt-bar"><i></i></div>
                <div class="apt-status">Downloading...</div>
            </div>`, { ambient: true, duration: 6200 });

        const status = fx.el.querySelector(".apt-status");
        play("blip");
        fx.later(() => { status.textContent = "Unpacking..."; play("blip"); }, 1100);
        fx.later(() => { status.textContent = "Setting up..."; play("blip"); }, 2000);
        fx.later(() => {
            status.textContent = "Done.";
            fx.el.classList.add("done");
            play("achievement");
            appendLine(replies[pkg] || `${pkg} installed. It does absolutely nothing, but it's yours now.`, "info");
        }, 3000);
    },

    gitpush(args = []) {
        if (!args.includes("push") || !(args.includes("--force") || args.includes("-f"))) return;

        const fx = layer("gitpush", "fx-git", `<div class="git-alert"></div>`, { ambient: true, duration: 3600 });
        play("alarm");
        fx.later(() => play("alarm"), 800);
        fx.later(() => appendLine("remote: just kidding. Nothing was destroyed.", "info"), 2000);
    },

    async ssh(args = []) {
        if (!args.length) return;
        EFFECTS2.glitch({ ms: 2200 });
        await sleep(2300);
        await typeLines([
            "Welcome to the Backrooms (kernel 0.0.0)",
            "You are in room 37. There is no exit.",
            "fuz@backrooms:~$ whoami",
            "someone who should have stayed outside",
            "Connection closed by foreign host."
        ], 650);
    },

    curl(args = []) {
        if (!args.some(a => a.includes("ascii.theater"))) return;

        const W = 46;
        const H = 14;
        const stars = Array.from({ length: 14 }, () => [Math.floor(rand(0, W)), Math.floor(rand(0, H - 2))]);
        const frames = [];

        const blank = () => Array.from({ length: H }, () => Array(W).fill(" "));
        const put = (g, x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
        const base = () => {
            const g = blank();
            stars.forEach(([x, y]) => put(g, x, y, "."));
            for (let x = 0; x < W; x++) put(g, x, H - 1, "=");
            return g;
        };

        const cx = Math.floor(W / 2);
        for (let i = 0; i < H - 3; i++) {
            const g = base();
            const y = H - 3 - i;
            put(g, cx, y, "^");
            put(g, cx, y + 1, "A");
            put(g, cx - 1, y + 1, "/");
            put(g, cx + 1, y + 1, "\\");
            put(g, cx, y + 2, i % 2 ? "*" : "+");
            if (i > 1) put(g, cx, y + 3, ":");
            frames.push(g);
        }

        const burstY = 3;
        for (let r = 1; r <= 7; r++) {
            const g = base();
            for (let k = 0; k < 16; k++) {
                const a = (k / 16) * Math.PI * 2;
                const c = r < 4 ? "*" : r < 6 ? "+" : ".";
                put(g, Math.round(cx + Math.cos(a) * r * 2), Math.round(burstY + Math.sin(a) * r * 0.9), c);
            }
            frames.push(g);
        }

        const g = base();
        "THANKS FOR WATCHING".split("").forEach((c, i) => put(g, cx - 9 + i, 6, c));
        frames.push(g, g);

        const pre = h("pre", { class: "ascii-theater" });
        const results = document.querySelectorAll("#output .result");
        (results[results.length - 1] || document.getElementById("output")).appendChild(pre);

        const fx = layer("curl", "fx-none", "", { ambient: true, duration: frames.length * 110 + 600 });
        let i = 0;
        fx.every(() => {
            if (i >= frames.length) return;
            pre.textContent = frames[i].map(row => row.join("")).join("\n");
            const body = document.getElementById("terminal-body");
            if (body) body.scrollTop = body.scrollHeight;
            if (i % 4 === 0) play("tick");
            i += 1;
        }, 110);
    }
};

/* ---------- the pet ---------- */

const petState = { el: null, x: 0, y: 0, mx: 0, my: 0, raf: 0, sleeping: false, food: null, flip: 1, hop: 0, onMove: null, last: 0, blink: 0 };

export const petActive = () => Boolean(petState.el);

const PET_SVG = `
<svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true">
    <rect x="2" y="1" width="3" height="3" fill="#a98cff"/><rect x="11" y="1" width="3" height="3" fill="#a98cff"/>
    <rect x="3" y="3" width="10" height="9" fill="#b79cff"/><rect x="2" y="5" width="12" height="6" fill="#b79cff"/>
    <rect x="4" y="12" width="3" height="1" fill="#a98cff"/><rect x="9" y="12" width="3" height="1" fill="#a98cff"/>
    <rect x="4" y="9" width="2" height="1" fill="#ff9ec4"/><rect x="10" y="9" width="2" height="1" fill="#ff9ec4"/>
    <g class="pet-eyes"><rect x="5" y="6" width="2" height="2" fill="#17131f"/><rect x="9" y="6" width="2" height="2" fill="#17131f"/></g>
    <g class="pet-eyes-shut"><rect x="5" y="7" width="2" height="1" fill="#17131f"/><rect x="9" y="7" width="2" height="1" fill="#17131f"/></g>
    <rect x="7" y="8" width="2" height="1" fill="#17131f"/>
</svg>`;

function spawnPet() {
    const s = petState;
    s.el = h("div", { class: "pet" });
    s.el.innerHTML = `${PET_SVG}<span class="pet-zzz">z z z</span>`;
    document.body.appendChild(s.el);

    s.x = window.innerWidth - 90;
    s.y = window.innerHeight - 90;
    s.mx = s.x;
    s.my = s.y;
    s.sleeping = false;
    s.last = performance.now();

    s.onMove = event => { s.mx = event.clientX - 28; s.my = event.clientY - 40; };
    window.addEventListener("pointermove", s.onMove);

    s.el.classList.add("arrive");
    play("pop");
    toast({ icon: "🐾", title: "Fuzzy has arrived", text: "It follows your cursor. Try pet feed, pet sleep, pet bye.", duration: 3600 });

    const loop = now => {
        const dt = Math.min(0.05, (now - s.last) / 1000);
        s.last = now;

        if (s.el) {
            const target = s.food ? { x: s.food.x - 20, y: s.food.y - 30 } : { x: s.mx, y: s.my };
            const dx = target.x - s.x;
            const dy = target.y - s.y;
            const dist = Math.hypot(dx, dy);
            const stop = s.food ? 8 : 80;

            if (!s.sleeping && dist > stop) {
                const speed = Math.min(300, 60 + dist * 1.4);
                s.x += (dx / dist) * speed * dt;
                s.y += (dy / dist) * speed * dt;
                s.hop += dt * 14;
                if (Math.abs(dx) > 6) s.flip = dx > 0 ? 1 : -1;
            } else {
                s.hop = 0;
            }

            if (s.food && dist <= 12) eatFood();

            s.blink -= dt;
            if (s.blink < -3.2) s.blink = 0.14;
            s.el.classList.toggle("blink", s.blink > 0 && !s.sleeping);

            s.x = Math.max(0, Math.min(window.innerWidth - 56, s.x));
            s.y = Math.max(0, Math.min(window.innerHeight - 56, s.y));
            const bob = -Math.abs(Math.sin(s.hop)) * 10;
            s.el.style.transform = `translate(${s.x.toFixed(1)}px, ${(s.y + bob).toFixed(1)}px) scaleX(${s.flip})`;
        }

        s.raf = requestAnimationFrame(loop);
    };
    s.raf = requestAnimationFrame(loop);
}

function destroyPet() {
    const s = petState;
    cancelAnimationFrame(s.raf);
    window.removeEventListener("pointermove", s.onMove);
    s.food?.el.remove();
    s.food = null;
    const el = s.el;
    s.el = null;
    play("wave");
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 500);
}

function dropFood() {
    const s = petState;
    if (s.food) return;
    const x = rand(80, window.innerWidth - 120);
    const y = rand(100, window.innerHeight - 120);
    const el = h("div", { class: "pet-food" }, pick(["🍪", "🐟", "🍓", "🍰", "🍙"]));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    s.food = { x, y, el };
    play("pop");
}

function eatFood() {
    const s = petState;
    s.food.el.remove();
    s.food = null;
    play("nom");

    for (let i = 0; i < 3; i++) {
        const heart = h("div", { class: "pet-heart" }, "❤");
        heart.style.left = `${s.x + 14 + i * 12}px`;
        heart.style.top = `${s.y - 6}px`;
        heart.style.animationDelay = `${i * 0.12}s`;
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1400 + i * 120);
    }
}
