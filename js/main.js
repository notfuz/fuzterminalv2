/*
 * Sky renderer: starfield + shooting stars + constellations on one canvas.
 *
 * Performance notes
 *  - renders at the device pixel ratio (capped at 2) so stars are crisp but not wasteful
 *  - the nebula / milky way is rendered once per resize, not per frame
 *  - the loop is paused when the tab is hidden or a full-screen window (gallery, profile)
 *    covers the sky
 *  - prefers-reduced-motion gets a single static frame
 */

import { Starfield } from "./stars.js";
import { Constellations } from "./constellations.js";

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const terminal = document.getElementById("terminal");

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

const sky = new Starfield();
const constellations = new Constellations();

const camera = { x: 0, y: 0 };
const mouse = { x: -9999, y: -9999, active: false };

let width = 0;
let height = 0;
let running = false;
let rafId = 0;
let last = 0;
let skyPaused = false;

function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sky.motion = !reduced.matches;
    sky.resize(width, height, dpr);
    constellations.layout(width, height, terminal ? terminal.getBoundingClientRect() : null);

    if (!running) renderFrame(performance.now(), 0);
}

let resizeTimer = 0;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
});

window.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
}, { passive: true });

document.addEventListener("pointerleave", () => { mouse.active = false; });

// click empty space for a shooting star
document.addEventListener("pointerdown", event => {
    if (reduced.matches || skyPaused) return;
    if (event.target.closest("#terminal, .overlay, .fx-overlay, .toast")) return;

    sky.shoot({
        x: event.clientX - 60,
        y: event.clientY - 40,
        direction: 1,
        angle: 0.5,
        speed: 1200,
        life: 0.7,
        fireball: false
    });
});

function renderFrame(now, dt) {
    const targetX = mouse.active ? (mouse.x - width / 2) * 0.05 : 0;
    const targetY = mouse.active ? (mouse.y - height / 2) * 0.05 : 0;

    camera.x += (targetX - camera.x) * 0.05;
    camera.y += (targetY - camera.y) * 0.05;

    sky.update(dt);
    constellations.update(dt);

    sky.draw(ctx, now, camera);
    constellations.draw(ctx, now, camera, mouse, sky.motion);
}

function frame(now) {
    rafId = requestAnimationFrame(frame);

    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    renderFrame(now, dt);
}

function start() {
    if (running || reduced.matches || document.hidden || skyPaused) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
}

function stop() {
    running = false;
    cancelAnimationFrame(rafId);
}

document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

window.addEventListener("fz:windows", event => {
    skyPaused = event.detail.pauseSky;
    if (skyPaused) stop();
    else start();
});

reduced.addEventListener?.("change", () => {
    sky.motion = !reduced.matches;
    reduced.matches ? stop() : start();
});

// terminal.js uses this for secrets (`wish`) and `hostname`
window.__sky = {
    get stars() { return sky.count; },
    get constellations() { return constellations.count; },
    shoot: options => sky.shoot(options),
    shower: (count, seconds) => {
        if (skyPaused) return;
        sky.shower(count, seconds);
        start();
    }
};

resize();
start();
