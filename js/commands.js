import { getFound } from "./secrets.js";
import { petActive } from "./secrets2.js";
import { h } from "./dom.js";

// edit this to change the about command
const ABOUT = {
    name: "Fuz",
    handle: "@notfuz",
    tagline: "Hey! I'm Fuz. Welcome to my little corner of the internet.",
    rows: [
        ["Name", "Fuz"],
        ["Handle", "@notfuz"],
        ["Focus", "Building bots, mods & websites"],
        ["Hangout", "My Discord server (see socials)"],
        ["This site", "A terminal you're standing inside ✦"]
    ],
    tags: ["developer", "tinkerer", "night owl"]
};

// edit this to change the socials command
const SOCIALS = [
    {
        name: "Discord Server",
        detail: "discord.gg/kBeT6aRmEw",
        href: "https://discord.gg/kBeT6aRmEw",
        icon: "chat",
        accent: "#8c96ff"
    },
    {
        name: "GitHub",
        detail: "github.com/notfuz",
        href: "https://github.com/notfuz",
        icon: "code",
        accent: "#7ee0b0"
    }
];

const ICONS = {
    chat: () => h("svg:svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" },
        h("svg:path", { d: "M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" }),
        h("svg:circle", { cx: "8", cy: "11.5", r: "1", fill: "currentColor" }),
        h("svg:circle", { cx: "12", cy: "11.5", r: "1", fill: "currentColor" }),
        h("svg:circle", { cx: "16", cy: "11.5", r: "1", fill: "currentColor" })),

    code: () => h("svg:svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" },
        h("svg:polyline", { points: "8 6 2 12 8 18" }),
        h("svg:polyline", { points: "16 6 22 12 16 18" }),
        h("svg:line", { x1: "14", y1: "4", x2: "10", y2: "20" }))
};

function miniConstellation() {
    const pts = [[18, 78], [34, 46], [60, 58], [78, 24], [100, 40], [92, 92], [56, 100]];
    const lines = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 2]];

    return h("svg:svg", { viewBox: "0 0 120 120", class: "about-logo", "aria-hidden": "true" },
        ...lines.map(([a, b]) => h("svg:line", {
            x1: pts[a][0], y1: pts[a][1], x2: pts[b][0], y2: pts[b][1], class: "about-logo-line"
        })),
        ...pts.map(([x, y], i) => h("svg:circle", {
            cx: x, cy: y, r: i === 3 ? 3.6 : 2.4, class: "about-logo-star", style: `animation-delay:${(i * 0.45).toFixed(2)}s`
        })));
}

const commands = {

    about: {
        aliases: ["info", "whoami", "aboutme"],
        description: "Learn more about me",
        render: () => h("div", { class: "card about-card sheen" },
            miniConstellation(),
            h("div", { class: "about-body" },
                h("div", { class: "about-title" }, ABOUT.name, h("span", { class: "about-handle" }, ABOUT.handle)),
                h("div", { class: "about-tagline" }, ABOUT.tagline),
                h("dl", { class: "kv" }, ABOUT.rows.map(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])),
                h("div", { class: "tags" }, ABOUT.tags.map(tag => h("span", { class: "tag" }, tag))),
                h("div", { class: "about-foot" }, "psst... type ", cmdChip("socials"), " to find me elsewhere.")))
    },

    socials: {
        aliases: ["social", "links"],
        description: "View my social links",
        render: () => h("div", { class: "social-list" },
            SOCIALS.map((s, i) => h("a", {
                class: "social-card sheen",
                href: s.href,
                target: "_blank",
                rel: "noopener noreferrer",
                style: `--accent:${s.accent};--shine-delay:${(i * 1.7).toFixed(1)}s`
            },
                h("span", { class: "social-icon" }, ICONS[s.icon]()),
                h("span", { class: "social-text" }, h("b", {}, s.name), h("small", {}, s.detail)),
                h("span", { class: "social-arrow", "aria-hidden": "true" }, "↗"))))
    },

    projects: {
        aliases: ["project", "myprojects"],
        description: "View my projects",
        render: () => h("div", { class: "card empty-card" },
            h("div", { class: "empty-title" }, "Nothing here yet"),
            h("div", { class: "empty-sub" }, "Something good is being built. Check back soon ✦"))
    },

    gallery: {
        aliases: ["photos", "images"],
        description: "Open photo gallery",
        action: "gallery"
    },

    profile: {
        aliases: ["discord", "myprofile"],
        description: "Show my discord profile",
        action: "profile"
    },

    sound: {
        aliases: ["audio", "mute", "unmute"],
        description: "Toggle sound effects",
        action: "sound"
    },

    hostname: {
        secret: true,
        hidden: true,
        aliases: ["neofetch"],
        render: () => neofetch()
    },

    fortune: {
        secret: true,
        hidden: true,
        output: ["Achievement unlocked: Curiosity."],
        effect: "fortune"
    },

    coffee: {
        secret: true,
        hidden: true,
        output: ["Error:", "No coffee found.", "Try again tomorrow."],
        effect: "coffee"
    },

    sudo: {
        secret: true,
        hidden: true,
        output: ["Permission denied.", "nice try."],
        effect: "sudo"
    },

    "sudo make me a sandwich": {
        secret: true,
        hidden: true,
        output: ["Okay.", "🥪"],
        effect: "sandwich"
    },

    "rm -rf /": {
        secret: true,
        hidden: true,
        aliases: ["rm -rf /*", "rm -rf *", "rm -rf ~", "rm -rf"],
        output: ["Deleting website...", "0%", "Access denied.", "Nice try bud xD"],
        effect: "rm"
    },

    exit: {
        secret: true,
        hidden: true,
        aliases: ["logout"],
        output: ["Logout failed.", "You're here forever."],
        effect: "exit"
    },

    hack: {
        secret: true,
        hidden: true,
        output: ["Initializing Hollywood hacking sequence...", "Access denied."],
        effect: "hack"
    },

    hello: {
        secret: true,
        hidden: true,
        aliases: ["hi"],
        output: ["Hello! 👋"],
        effect: "hello"
    },

    cd: {
        secret: true,
        hidden: true,
        output: ["You wonder around for a bit...", "Nothing changed."],
        effect: "cd"
    },

    matrix: {
        secret: true,
        hidden: true,
        output: ["Wake up, Neo...", "The Matrix has you..."],
        effect: "matrix"
    },

    "42": {
        secret: true,
        hidden: true,
        output: ["The answer is 42.", "But what is the question?"],
        effect: "deep"
    },

    wish: {
        secret: true,
        hidden: true,
        aliases: ["wish upon a star", "shooting star", "meteor"],
        output: ["Close your eyes...", "Make a wish. ✨"],
        effect: "wish"
    },

    explode: {
        secret: true,
        hidden: true,
        aliases: ["boom", "kaboom", "self destruct"],
        output: ["Arming self-destruct sequence...", "Please stand back."],
        effect: "explode"
    },

    freerobux: {
        secret: true,
        hidden: true,
        aliases: ["robux", "free robux"],
        output: ["Contacting totally-legit Robux servers...", "Generating +99,999,999,999 Robux..."],
        effect: "robux"
    },

    sl: {
        secret: true,
        hidden: true,
        output: ["sl: a train has arrived.", "(you probably meant ls)"],
        effect: "sl"
    },

    vim: {
        secret: true,
        hidden: true,
        aliases: ["vi", "nano", "emacs"],
        output: ["Opening vim...", "Good luck getting out."],
        effect: "vim"
    },

    giftcard: {
        secret: true,
        hidden: true,
        aliases: ["gift"],
        output: ["Congratulations!", "You have been selected."],
        effect: "giftcard"
    },

    blackhole: {
        secret: true,
        hidden: true,
        aliases: ["black hole", "singularity"],
        output: ["Warning: gravitational anomaly detected.", "Hold on to something."],
        effect: "blackhole"
    },

    ping: {
        secret: true,
        hidden: true,
        output: args => [
            `PING ${args[0] || "fuz.terminal"} (127.0.0.1): 56 data bytes`,
            "64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.042 ms",
            "64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.039 ms",
            "64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=9999 ms",
            `--- ${args[0] || "fuz.terminal"} ping statistics ---`,
            "3 packets transmitted, 3 received, 0% packet loss",
            "(the third one went through a black hole)"
        ],
        effect: "ping"
    },

    konami: {
        secret: true,
        hidden: true,
        aliases: ["up up down down left right left right b a", "uuddlrlrba"],
        output: ["Cheat code accepted.", "+30 lives."],
        effect: "konami"
    },

    gravity: {
        secret: true,
        hidden: true,
        output: ["Gravity enabled.", "Everything not bolted down is falling."],
        effect: "gravity"
    },

    bsod: {
        secret: true,
        hidden: true,
        aliases: ["bluescreen", "blue screen", "crash"],
        output: ["Fatal error.", "Collecting error info..."],
        effect: "bsod"
    },

    cat: {
        secret: true,
        hidden: true,
        aliases: ["meow", "kitty", "kitten"],
        output: args => args.length
            ? [`cat: ${args.join(" ")}: No such file or directory`, "...but a cat showed up anyway."]
            : ["Meow."],
        effect: "cat"
    },

    earthquake: {
        secret: true,
        hidden: true,
        aliases: ["quake"],
        output: ["Seismic activity detected.", "Brace yourself."],
        effect: "earthquake"
    },

    flip: {
        secret: true,
        hidden: true,
        aliases: ["upsidedown"],
        output: ["Rotating the page 180 degrees...", "Hold on tight."],
        effect: "flip"
    },

    glitch: {
        secret: true,
        hidden: true,
        output: ["Warning: signal corrupted.", "this is fine."],
        effect: "glitch"
    },

    supernova: {
        secret: true,
        hidden: true,
        aliases: ["nova"],
        output: ["A star is running out of fuel...", "Watch the sky."],
        effect: "supernova"
    },

    rain: {
        secret: true,
        hidden: true,
        aliases: ["storm"],
        output: ["Clouds are gathering...", "Maybe bring an umbrella."],
        effect: "rain"
    },

    warp: {
        secret: true,
        hidden: true,
        aliases: ["hyperspace", "lightspeed"],
        output: ["Engaging hyperdrive...", "Jumping to lightspeed."],
        effect: "warp"
    },

    snake: {
        secret: true,
        hidden: true,
        output: ["Starting snake...", "Arrow keys to move. Don't hit the walls."],
        effect: "snake"
    },

    pet: {
        secret: true,
        hidden: true,
        output: args => {
            const action = args[0] || "";
            if (action === "feed") return ["You hold out a snack..."];
            if (action === "sleep") return ["Shh. Fuzzy is falling asleep."];
            if (action === "wake") return ["Fuzzy yawns and wakes up."];
            if (action === "bye" || action === "leave" || action === "remove") return [petActive() ? "Fuzzy waves goodbye." : "Fuzzy isn't here right now."];
            if (action) return [`pet: Fuzzy doesn't know the trick '${action}'.`, "Try: feed, sleep, wake, bye."];
            return petActive()
                ? ["Fuzzy is already here."]
                : ["A tiny creature appears.", "It follows your cursor. Try: pet feed, pet sleep, pet bye."];
        },
        effect: "pet"
    },

    flashlight: {
        secret: true,
        hidden: true,
        aliases: ["torch"],
        output: ["Lights out.", "Something might be hiding in the dark."],
        effect: "flashlight"
    },

    "8ball": {
        secret: true,
        hidden: true,
        aliases: ["magic8ball", "ball"],
        output: args => args.length
            ? [`Q: ${args.join(" ")}`, "Shaking the magic 8-ball..."]
            : ["You didn't ask anything.", "Shaking the magic 8-ball anyway..."],
        effect: "8ball"
    },

    roll: {
        secret: true,
        hidden: true,
        aliases: ["dice"],
        output: args => [`Rolling a d${Math.max(2, Math.min(1000, parseInt((args[0] || "6").replace(/^d/, ""), 10) || 6))}...`],
        effect: "roll"
    },

    coin: {
        secret: true,
        hidden: true,
        aliases: ["flip coin", "flipcoin", "toss"],
        output: ["Flipping a coin..."],
        effect: "coin"
    },

    "rm -rf --no-preserve-root": {
        secret: true,
        hidden: true,
        aliases: ["rm -rf --no-preserve-root /", "rm -rf / --no-preserve-root", "rm --no-preserve-root -rf /", "sudo rm -rf --no-preserve-root /"],
        output: ["Deleting everything...", "--no-preserve-root: there is no safety net."],
        effect: "nuke"
    },

    apt: {
        secret: true,
        hidden: true,
        output: args => {
            if (args[0] !== "install" || !args[1]) return [`E: Invalid operation ${args[0] || ""}`.trim(), "Usage: apt install <package>"];
            return [
                "Reading package lists... Done",
                "Building dependency tree... Done",
                "The following NEW packages will be installed:",
                `  ${args[1]}`,
                "0 upgraded, 1 newly installed, 0 to remove, 0 not upgraded."
            ];
        },
        effect: "apt"
    },

    git: {
        secret: true,
        hidden: true,
        output: args => {
            if (!args.length) return ["usage: git <command>", "try: git push --force"];
            if (args[0] === "push" && (args.includes("--force") || args.includes("-f"))) {
                return [
                    "Enumerating objects: 9001, done.",
                    "Counting objects: 100% (9001/9001), done.",
                    "remote: WARNING: force-pushing rewrites history",
                    "To github.com:notfuz/fuzterminal.git",
                    " + 4f2a9c1...e7b1d03 main -> main (forced update)"
                ];
            }
            if (args[0] === "push") return ["Everything up-to-date", "(try adding --force, I dare you)"];
            return [`git: '${args[0]}' is not a git command. See 'git --help'.`];
        },
        effect: "gitpush"
    },

    ssh: {
        secret: true,
        hidden: true,
        output: args => args.length
            ? [`ssh: connecting to ${args[0]}...`, "Authenticating..."]
            : ["usage: ssh user@host"],
        effect: "ssh"
    },

    curl: {
        secret: true,
        hidden: true,
        output: args => {
            if (!args.length) return ["curl: try 'curl ascii.theater'"];
            if (args.some(a => a.includes("ascii.theater"))) return ["Connecting to ascii.theater...", "HTTP/1.1 200 OK (streaming)"];
            return [`curl: (6) Could not resolve host: ${args[0]}`];
        },
        effect: "curl"
    },

    secrets: {
        hidden: true,
        render: () => secretsList()
    }
};

export function cmdChip(name, label = name) {
    return h("button", { class: "cmd-chip", type: "button", "data-cmd": name }, label);
}

export const secretNames = () => Object.keys(commands).filter(key => commands[key].secret);

function secretsList() {
    const names = secretNames();
    const found = getFound();
    const count = names.filter(name => found.has(name)).length;

    return h("div", { class: "card secrets-card sheen" },
        h("div", { class: "secrets-head" },
            h("span", {}, "Secrets"),
            h("span", { class: "secrets-count" }, `${count} / ${names.length} discovered`)),
        h("div", { class: "secrets-bar" }, h("i", { style: `width:${(count / names.length) * 100}%` })),
        h("div", { class: "secrets-grid" },
            names.map(name => h("button", {
                class: `secret-chip${found.has(name) ? " found" : ""}`,
                type: "button",
                "data-cmd": name,
                title: found.has(name) ? "Found" : "Not found yet"
            }, h("span", { class: "secret-mark" }, found.has(name) ? "✓" : "·"), name))),
        h("div", { class: "secrets-foot" }, "tap one to run it"));
}

export const DOCS = {
    help: { about: "Lists every command, or explains one in detail.", usage: [["help", "list all commands"], ["help <command>", "explain a command, e.g. help sound"]], aliases: [] },
    clear: { about: "Clears the terminal.", usage: [["clear", "wipe the screen"], ["Ctrl+L", "same thing, from the keyboard"]], aliases: ["cls"] },

    about: { about: "A card with a bit about me." },
    socials: { about: "Links to my Discord server and GitHub. Click a card to open it." },
    projects: { about: "What I'm working on." },
    gallery: { about: "Opens the photo gallery in its own window.", usage: [["click a photo", "open the viewer"], ["← / → or swipe", "browse"], ["Esc", "close"]] },
    profile: { about: "My live Discord profile: status, activities, Spotify and badges. Refreshes every 10 seconds.", usage: [["Esc", "close it"]] },
    sound: { about: "Turns the secret-command sound effects on or off. Remembered next visit.", usage: [["sound", "toggle"], ["sound on", "turn on"], ["sound off", "turn off"], ["mute / unmute", "the same, shorter"]] },

    hostname: { about: "A fake neofetch: system info for this terminal, with a live uptime counter." },
    fortune: { about: "Cracks open a fortune cookie with lucky numbers." },
    coffee: { about: "Brews a coffee. Spoiler: there isn't any." },
    sudo: { about: "Tries to get admin rights. Denied.", usage: [["sudo <anything>", "permission denied"], ["sudo make me a sandwich", "its own secret"]] },
    "sudo make me a sandwich": { about: "The classic. This time sudo works." },
    "rm -rf /": { about: "Tries to delete the website. The website disagrees.", usage: [["rm -rf /", "the original"], ["rm -rf *  /  ~  /*", "also count"]] },
    exit: { about: "Tries to log out. You can't. (Clicking the red dot on the terminal does this too.)" },
    hack: { about: "Starts a Hollywood-style hacking sequence." },
    hello: { about: "Say hi, get waved at." },
    cd: { about: "Goes nowhere.", usage: [["cd <anything>", "you wander around for a bit"]] },
    matrix: { about: "Digital rain falls over the page. You can keep typing." },
    "42": { about: "The answer to life, the universe and everything. Ask the question.", aliases: [] },
    wish: { about: "Make a wish on a shooting star.", usage: [["wish", "launch a meteor shower"]] },
    explode: { about: "Self-destructs the terminal. It rebuilds itself afterwards." },
    freerobux: { about: "Generates 99,999,999,999 Robux. Totally real. (It's a joke.)" },
    sl: { about: "A train runs along the bottom of the page. A tribute to everyone who typed sl instead of ls." },
    vim: { about: "Opens a fake vim editor. Getting out is the real challenge.", usage: [["i", "insert mode (type text)"], ["Esc", "back to normal mode"], [":", "command mode"], [":q!", "the way out"]] },
    giftcard: { about: "Claim a free gift card.", usage: [["Esc", "close it early"]] },
    blackhole: { about: "A black hole eats the sky and the terminal, then spits them back out." },
    ping: { about: "A fake ping with a suspicious result.", usage: [["ping", "ping this terminal"], ["ping <address>", "ping anything you like"]] },
    konami: { about: "The cheat code: +30 lives, rainbow sky, shooting stars.", usage: [["konami", "type the command"], ["↑ ↑ ↓ ↓ ← → ← → B A", "or press the keys anywhere on the page"]] },
    gravity: { about: "Turns gravity on. The text falls out of the terminal and you can drag it around.", usage: [["drag", "move the fallen text"], ["Esc / Put it back", "return everything"]] },
    bsod: { about: "Crashes the terminal with a blue screen, then reboots it." },
    cat: { about: "A cat shows up, lies down next to your text and bats it off the screen.", usage: [["cat", "summon the cat"], ["cat <file>", "no such file, but the cat comes anyway"]] },

    earthquake: { about: "The terminal and the page shake harder and harder. Cracks spread, the text jitters loose, then everything settles." },
    flip: { about: "Turns the whole page upside down for a few seconds. You can still type." },
    glitch: { about: "RGB-split, scanlines and scrambled text for a moment, then everything snaps back." },
    supernova: { about: "A star swells, blinds the screen white, then fades into a nebula." },
    rain: { about: "A storm rolls over the page, with lightning and thunder." },
    warp: { about: "The stars stretch into hyperspace lines as you jump to lightspeed." },
    snake: { about: "A playable game of Snake. Your best score is saved in this browser.", usage: [["arrows / WASD", "steer"], ["P", "pause"], ["Space", "play again"], ["Esc", "quit"]] },
    pet: { about: "A tiny pixel creature that lives on the page and follows your cursor.", usage: [["pet", "bring it out"], ["pet feed", "give it a snack"], ["pet sleep", "put it to bed"], ["pet wake", "wake it up"], ["pet bye", "send it away"]] },
    flashlight: { about: "Turns the lights off. Your cursor is a flashlight, and something is hiding in the dark.", usage: [["Esc", "lights back on"]] },
    "8ball": { about: "Ask the magic 8-ball a question.", usage: [["8ball <question>", "e.g. 8ball will it work"]], aliases: ["magic8ball", "ball"] },
    roll: { about: "Rolls a die with a little 3D tumble.", usage: [["roll", "a normal six-sided die"], ["roll d20", "any number of sides, up to 1000"]] },
    coin: { about: "Flips a coin.", usage: [["coin", "heads or tails"], ["flip coin", "the same thing"]] },
    "rm -rf --no-preserve-root": { about: "The bigger, scarier version of the delete joke. The page really does seem to vanish." },
    apt: { about: "A fake package manager with a progress bar.", usage: [["apt install <package>", "try more-ram, more-fps, rizz, motivation, sleep, bugs"]] },
    git: { about: "A fake git. One command in particular is very dramatic.", usage: [["git push --force", "the dramatic one"], ["git push", "boring by comparison"]] },
    ssh: { about: "Connects to a server. The server is not what you expected.", usage: [["ssh <host>", "e.g. ssh fuz@example.com"]] },
    curl: { about: "Fetches a URL. One site is worth visiting.", usage: [["curl ascii.theater", "a short ASCII show"]] },
    secrets: { about: "Lists every secret command and which ones you've found. Click one to run it.", usage: [["secrets", "show the tracker"]] }
};

const bootTime = performance.now();

function formatUptime(ms) {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m ? `${m}m ${s}s` : `${s}s`;
}

function neofetch() {
    const art = [
        "      .  ✦        ",
        "  ✧       .   *    ",
        " *   ╭───────╮     ",
        "  .  │ F U Z │  .  ",
        "     ╰───────╯  ✧  ",
        "  ✦    *     .    ",
        "      .     ✦    "
    ].join("\n");

    const sky = window.__sky;
    const uptime = h("dd", {}, formatUptime(performance.now() - bootTime));

    const rows = [
        ["OS", "FuzOS (GitHub Pages edition)"],
        ["Host", "GitHub"],
        ["Kernel", "JavaScript (ES modules)"],
        ["Uptime", uptime],
        ["Shell", "fuzsh 1.0"],
        ["Display", `${window.innerWidth}x${window.innerHeight} @${Math.min(window.devicePixelRatio || 1, 2)}x`],
        ["Sky", sky ? `${sky.stars} stars · ${sky.constellations} constellations` : "clear skies"],
        ["Theme", "Midnight ✦"]
    ];

    const card = h("div", { class: "card neofetch sheen" },
        h("pre", { class: "neofetch-art", "aria-hidden": "true" }, art),
        h("div", { class: "neofetch-info" },
            h("div", { class: "neofetch-title" }, h("span", { class: "user" }, "guest"), "@", h("span", { class: "host" }, "fuz-terminal")),
            h("div", { class: "neofetch-rule" }),
            h("dl", { class: "kv" }, rows.map(([k, v]) => [h("dt", {}, k), typeof v === "string" ? h("dd", {}, v) : v])),
            h("div", { class: "neofetch-swatches" }, ["#ff5f57", "#febc2e", "#28c840", "#5ca9ff", "#b79cff", "#e8ebf5"].map(c => h("i", { style: `background:${c}` })))));

    const timer = setInterval(() => {
        if (!card.isConnected) return clearInterval(timer);
        uptime.textContent = formatUptime(performance.now() - bootTime);
    }, 1000);

    return card;
}

export default commands;
