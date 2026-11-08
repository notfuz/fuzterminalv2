const stack = [];

function emit() {
    const locking = stack.filter(w => w.lock);

    document.body.classList.toggle("has-window", locking.length > 0);

    window.dispatchEvent(new CustomEvent("fz:windows", {
        detail: {
            locked: locking.length > 0,
            pauseSky: stack.some(w => w.pauseSky),
            top: stack.length ? stack[stack.length - 1].id : null
        }
    }));
}

/**
 * @param {string} id
 * @param {Function} close
 * 
 * @param {{lock?:boolean, pauseSky?:boolean}} opts
 */
export function registerWindow(id, close, { lock = true, pauseSky = false } = {}) {
    unregisterWindow(id, true);
    stack.push({ id, close, lock, pauseSky });
    emit();
}

export function unregisterWindow(id, silent = false) {
    const index = stack.findIndex(w => w.id === id);
    if (index === -1) return;
    stack.splice(index, 1);
    if (!silent) emit();
}

export function isWindowOpen(id) {
    return id ? stack.some(w => w.id === id) : stack.length > 0;
}

export function closeTopWindow() {
    const top = stack[stack.length - 1];
    if (top) top.close();
}

document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !stack.length) return;
    event.preventDefault();
    closeTopWindow();
});

const hideTimers = new WeakMap();

export function showOverlay(el) {
    clearTimeout(hideTimers.get(el));
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    void el.offsetWidth;
    el.classList.add("open");
}

export function hideOverlay(el, ms = 220) {
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
    clearTimeout(hideTimers.get(el));
    hideTimers.set(el, setTimeout(() => { el.hidden = true; }, ms));
}

export function shineify(el, { delay = Math.random() * 6, duration = 9 + Math.random() * 5 } = {}) {
    if (el.querySelector(":scope > .ring")) return el;

    const ring = document.createElement("i");
    ring.className = "ring";
    ring.setAttribute("aria-hidden", "true");
    ring.appendChild(document.createElement("i"));
    ring.style.setProperty("--shine-delay", `${delay.toFixed(2)}s`);
    ring.style.setProperty("--shine-dur", `${duration.toFixed(2)}s`);
    el.prepend(ring);
    return el;
}

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
