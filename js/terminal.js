import commands, { secretNames } from "./commands.js";
import { h } from "./dom.js";
import { openGallery } from "./gallery.js";
import { openProfile } from "./profile.js";
import { runEffect, discover } from "./secrets.js";
import * as audio from "./audio.js";

const terminal = document.getElementById("terminal");
const body = document.getElementById("terminal-body");
const output = document.getElementById("output");
const inputLine = document.getElementById("input-line");
const input = document.getElementById("real-input");
const before = document.getElementById("t-before");
const cursor = document.getElementById("t-cursor");
const after = document.getElementById("t-after");

let windowLocked = false;
let busy = false;

function isLocked() {
    return windowLocked || busy;
}

function applyLock() {
    const locked = isLocked();
    input.disabled = locked;
    terminal.classList.toggle("locked", locked);

    if (!locked) {
        requestAnimationFrame(() => {
            input.focus({ preventScroll: true });
            renderInput();
            scrollBottom();
        });
    }
}

window.addEventListener("fz:windows", event => {
    windowLocked = event.detail.locked;
    applyLock();
});

function renderInput() {
    const value = input.value;
    const pos = Math.min(input.selectionStart ?? value.length, value.length);

    before.textContent = value.slice(0, pos);
    cursor.textContent = value[pos] ?? " ";
    after.textContent = value.slice(pos + 1);
}

function resetInput() {
    input.value = "";
    renderInput();
}

function scrollBottom() {
    body.scrollTop = body.scrollHeight;
}

function promptEl() {
    return h("span", { class: "prompt" },
        h("span", { class: "user" }, "fuz"), "@", h("span", { class: "host" }, "terminal"), ":~$");
}

function echo(text) {
    output.appendChild(h("div", { class: "line cmdline" }, promptEl(), h("span", { class: "typed-command" }, text)));
    scrollBottom();
}

let result = null;

function beginResult() {
    result = h("div", { class: "result" });
    output.appendChild(result);
}

function add(node) {
    if (!result) beginResult();
    node.classList.add("reveal");
    node.style.setProperty("--i", Math.min(result.children.length, 14));
    result.appendChild(node);
    scrollBottom();
    return node;
}

function printLine(text, className = "") {
    return add(h("div", { class: `line ${className}`.trim() }, text));
}

function printLink({ text, href }) {
    return add(h("div", { class: "line" }, h("a", { href, target: "_blank", rel: "noopener noreferrer" }, text)));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const lookup = new Map();

for (const [key, cmd] of Object.entries(commands)) {
    lookup.set(key.toLowerCase(), { key, cmd });
    for (const alias of cmd.aliases || []) lookup.set(alias.toLowerCase(), { key, cmd });
}

function findCommand(normalized) {
    const exact = lookup.get(normalized);
    if (exact) return { ...exact, args: [] };

    // "sound off", "cd ..", "sudo anything"
    const [first, ...args] = normalized.split(" ");
    const byName = lookup.get(first);
    return byName ? { ...byName, args } : null;
}

function visibleNames() {
    return [
        ...Object.entries(commands).filter(([, c]) => !c.hidden).map(([name]) => name),
        "help", "clear"
    ];
}

function distance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i++) {
        let prev = row[0];
        row[0] = i;

        for (let j = 1; j <= b.length; j++) {
            const temp = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = temp;
        }
    }

    return row[b.length];
}

function suggest(word) {
    let best = null;
    let bestScore = 3;

    for (const name of visibleNames()) {
        const score = distance(word, name);
        if (score < bestScore) {
            best = name;
            bestScore = score;
        }
    }

    return best;
}

function helpCard() {
    const rows = [
        ...Object.entries(commands).filter(([, c]) => !c.hidden).map(([name, c]) => [name, c.description]),
        ["help", "Show all commands"],
        ["clear", "Clear the terminal"]
    ];

    return h("div", { class: "card help-card sheen" },
        h("div", { class: "help-title" }, "Available commands"),
        h("div", { class: "help-grid" },
            rows.map(([name, description]) => [
                h("button", { class: "cmd-chip", type: "button", "data-cmd": name }, name),
                h("span", { class: "command-description" }, description)
            ])),
        h("div", { class: "help-foot" },
            h("span", {}, "↑/↓ history"),
            h("span", {}, "Tab autocomplete"),
            h("span", {}, "there are hidden commands ✦")));
}

async function launch(steps, open) {
    busy = true;
    applyLock();

    try {
        for (const [text, wait] of steps) {
            printLine(text, "info");
            await sleep(wait);
        }
        await open();
    } catch (error) {
        console.error(error);
        printLine("Something went wrong. Try again?");
    } finally {
        busy = false;
        applyLock();
    }
}

function runAction(action, args, normalized) {
    beginResult();

    if (action === "gallery") {
        return launch([["Launching gallery.", 250], ["Loading images...", 500], ["Done.", 250]], openGallery);
    }

    if (action === "profile") {
        return launch([["Connecting to Discord...", 300], ["Fetching profile...", 450], ["Done.", 150]], openProfile);
    }

    if (action === "sound") {
        const first = normalized.split(" ")[0];
        let next = !audio.isEnabled();

        if (first === "mute" || args[0] === "off") next = false;
        if (first === "unmute" || args[0] === "on") next = true;

        audio.setEnabled(next);
        printLine(next ? "Sound effects: on ♪" : "Sound effects: off");
        if (next) printLine("Secret commands now come with audio.", "info");
        else printLine("Type \"sound\" to turn them back on.", "info");
    }
}

async function execute(normalized) {
    if (normalized === "clear" || normalized === "cls") {
        output.textContent = "";
        result = null;
        return;
    }

    beginResult();

    if (normalized === "help") {
        add(helpCard());
        return;
    }

    const found = findCommand(normalized);

    if (!found) {
        const word = normalized.split(" ")[0];
        const hint = suggest(word);

        printLine(`Unknown command: ${normalized}`);
        if (hint) printLine(`Did you mean "${hint}"?`, "info");
        printLine('Type "help" to see all commands.', "info");
        return;
    }

    const { key, cmd, args } = found;

    if (cmd.action) {
        await runAction(cmd.action, args, normalized);
        return;
    }

    if (cmd.render) {
        add(cmd.render());
    } else {
        for (const item of cmd.output || []) {
            if (typeof item === "string") printLine(item);
            else printLink(item);
        }
    }

    if (cmd.effect) runEffect(cmd.effect);
    if (cmd.secret) discover(key, secretNames().length);
}

const history = [];
let historyIndex = 0;
let draft = "";

function normalize(raw) {
    return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

async function submit(raw) {
    const text = raw.trim();

    echo(text);
    result = null;

    const normalized = normalize(text);
    if (!normalized) return;

    if (history[history.length - 1] !== text) history.push(text);
    historyIndex = history.length;
    draft = "";

    await execute(normalized);
}

function runTyped(name) {
    if (isLocked()) return;
    resetInput();
    submit(name);
}

function setValue(value) {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
    renderInput();
}

function complete() {
    const value = input.value.trimStart();
    if (!value || value.includes(" ")) return;

    const matches = visibleNames().filter(name => name.startsWith(value.toLowerCase()));
    if (!matches.length) return;

    if (matches.length === 1) {
        setValue(matches[0] + " ");
        return;
    }

    let prefix = matches[0];
    for (const name of matches) while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (prefix.length > value.length) setValue(prefix);
}

input.addEventListener("keydown", event => {
    if (isLocked()) {
        event.preventDefault();
        return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        output.textContent = "";
        result = null;
        return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        echo(`${input.value}^C`);
        resetInput();
        return;
    }

    switch (event.key) {
        case "Enter": {
            event.preventDefault();
            const raw = input.value;
            resetInput();
            submit(raw);
            return;
        }

        case "ArrowUp":
            event.preventDefault();
            if (!history.length) return;
            if (historyIndex === history.length) draft = input.value;
            historyIndex = Math.max(0, historyIndex - 1);
            setValue(history[historyIndex]);
            return;

        case "ArrowDown":
            event.preventDefault();
            if (historyIndex >= history.length) return;
            historyIndex += 1;
            setValue(historyIndex === history.length ? draft : history[historyIndex]);
            return;

        case "Tab":
            event.preventDefault();
            complete();
            return;
    }

    requestAnimationFrame(renderInput);
});

input.addEventListener("input", renderInput);
input.addEventListener("keyup", renderInput);
input.addEventListener("click", renderInput);

function hasSelection() {
    return String(window.getSelection?.() || "") !== "";
}

document.addEventListener("pointerup", event => {
    if (isLocked() || hasSelection()) return;
    if (event.target.closest("a, button, .overlay, .fx-overlay, .toast")) return;
    input.focus({ preventScroll: true });
    renderInput();
});

input.addEventListener("blur", () => {
    if (isLocked() || hasSelection()) return;
    requestAnimationFrame(() => {
        if (!isLocked() && !hasSelection() && !document.activeElement?.closest("a, button")) {
            input.focus({ preventScroll: true });
        }
    });
});

output.addEventListener("click", event => {
    const chip = event.target.closest("[data-cmd]");
    if (chip) runTyped(chip.dataset.cmd);
});

document.querySelector("#terminal-header .red")?.addEventListener("click", () => runTyped("exit"));

window.addEventListener("load", () => {
    input.focus({ preventScroll: true });
    renderInput();
});

renderInput();
