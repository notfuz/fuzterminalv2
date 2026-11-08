/*
 * Starts the site. On phones the heavy parts (animated sky, terminal) are NOT loaded
 * until the visitor presses Continue on the warning screen.
 */

async function start() {
    document.documentElement.classList.remove("mobile-gate");
    await import("./main.js");
    await import("./terminal.js");
}

if (document.documentElement.classList.contains("mobile-gate")) {
    document.getElementById("gate-continue").addEventListener("click", () => {
        try {
            sessionStorage.setItem("fz-mobile-ok", "1");
        } catch { /* fine */ }
        start();
    }, { once: true });
} else {
    start();
}
