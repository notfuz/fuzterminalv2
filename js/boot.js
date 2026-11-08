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
