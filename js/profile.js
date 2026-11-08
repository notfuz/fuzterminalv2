import { registerWindow, unregisterWindow, showOverlay, hideOverlay } from "./windows.js";
import { h } from "./dom.js";

/* ------------------------------------------------------------------ */
/* settings                                                           */
/* ------------------------------------------------------------------ */

const USER_ID = "1187401892435869737";
const API = `https://api.lanyard.rest/v1/users/${USER_ID}`;
const POLL_MS = 10000;
const FETCH_TIMEOUT_MS = 8000;

// Discord does not expose bios through Lanyard, so edit your "About Me" here.
// Leave it empty ("") to hide the section.
const BIO = "Hey! I'm Fuz.";

const STATUS = {
    online: { name: "Online", colour: "#23a55a" },
    idle: { name: "Idle", colour: "#f0b232" },
    dnd: { name: "Do Not Disturb", colour: "#f23f43" },
    offline: { name: "Offline", colour: "#80848e" },
    streaming: { name: "Streaming", colour: "#9b6bff" }
};

/* Discord public flags. `fallback` is shown if there is no image in assets/badges/. */
const BADGES = [
    { flag: 1 << 0, image: "staff", title: "Discord Staff", fallback: "🛡️" },
    { flag: 1 << 1, image: "partner", title: "Partnered Server Owner", fallback: "🤝" },
    { flag: 1 << 2, image: "hypesquad-events", title: "HypeSquad Events", fallback: "🎉" },
    { flag: 1 << 3, image: "bug-hunter", title: "Bug Hunter", fallback: "🐛" },
    { flag: 1 << 6, image: "hypesquad-bravery", title: "HypeSquad Bravery", fallback: "🟣" },
    { flag: 1 << 7, image: "hypesquad-brilliance", title: "HypeSquad Brilliance", fallback: "🟠" },
    { flag: 1 << 8, image: "hypesquad-balance", title: "HypeSquad Balance", fallback: "🟢" },
    { flag: 1 << 9, image: "early-supporter", title: "Early Supporter", fallback: "🌱" },
    { flag: 1 << 14, image: "bug-hunter-level-2", title: "Bug Hunter Level 2", fallback: "🐞" },
    { flag: 1 << 17, image: "verified-developer", title: "Early Verified Bot Developer", fallback: "🤖" },
    { flag: 1 << 18, image: "certified-moderator", title: "Moderator Programs Alumni", fallback: "🛡️" },
    { flag: 1 << 22, image: "active-developer", title: "Active Developer", fallback: "🛠️" }
];

const ACTIVITY_LABELS = { 0: "Playing", 1: "Streaming", 2: "Listening to", 3: "Watching", 5: "Competing in" };

/* ------------------------------------------------------------------ */
/* elements                                                           */
/* ------------------------------------------------------------------ */

const $ = id => document.getElementById(id);

const overlay = $("profile-overlay");
const loading = $("profile-loading");
const card = $("profile-card");
const banner = $("profile-banner");
const avatar = $("profile-avatar");
const decoration = $("profile-decoration");
const statusDot = $("profile-status-dot");
const displayName = $("profile-display-name");
const username = $("profile-username");
const guildTag = $("profile-guild-tag");
const customStatus = $("profile-custom-status");
const status = $("profile-status");
const aboutSection = $("profile-about-section");
const about = $("profile-about");
const activity = $("profile-activity");
const activityCount = $("profile-activity-count");
const devices = $("profile-devices");
const created = $("profile-created");
const discordId = $("profile-id");
const copyButton = $("copy-id");
const badges = $("profile-badges");

/* ------------------------------------------------------------------ */
/* state                                                              */
/* ------------------------------------------------------------------ */

let pollTimer = null;
let tickTimer = null;
let controller = null;
let lastSignature = "";
let lastPayload = null;
let timed = []; // elements that need a live clock

/* ------------------------------------------------------------------ */
/* open / close                                                       */
/* ------------------------------------------------------------------ */

export function openProfile() {
    registerWindow("profile", closeProfile, { pauseSky: true });
    showOverlay(overlay);

    if (lastPayload) {
        // instant reopen with the last known data, refresh quietly behind it
        card.hidden = false;
        loading.hidden = true;
        startTick();
    } else {
        card.hidden = true;
        loading.hidden = false;
        loading.textContent = "Connecting to Discord...";
    }

    startPolling();
    refresh();
}

export function closeProfile() {
    stopPolling();
    stopTick();
    controller?.abort();
    hideOverlay(overlay);
    unregisterWindow("profile");
}

overlay.addEventListener("click", event => {
    if (event.target === overlay) closeProfile();
});

overlay.querySelector(".traffic .red")?.addEventListener("click", closeProfile);

function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
        if (!document.hidden) refresh();
    }, POLL_MS);
}

function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
}

function startTick() {
    stopTick();
    updateClocks();
    if (timed.length) tickTimer = setInterval(updateClocks, 1000);
}

function stopTick() {
    clearInterval(tickTimer);
    tickTimer = null;
}

/* ------------------------------------------------------------------ */
/* fetching                                                           */
/* ------------------------------------------------------------------ */

async function refresh() {
    controller?.abort();
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(API, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`Lanyard responded ${response.status}`);

        const json = await response.json();
        if (!json.success || !json.data) throw new Error("Lanyard returned no data");

        // closed while we were waiting
        if (overlay.hidden) return;

        const signature = JSON.stringify(json.data);

        if (signature !== lastSignature) {
            lastSignature = signature;
            lastPayload = json.data;
            render(json.data);
        }

        loading.hidden = true;
        card.hidden = false;
    } catch (error) {
        if (error.name === "AbortError" && overlay.hidden) return;
        console.warn("Profile refresh failed:", error);

        if (!lastPayload) {
            loading.hidden = false;
            loading.textContent = "Couldn't reach Discord. Retrying...";
        }
    } finally {
        clearTimeout(timeout);
    }
}

/* ------------------------------------------------------------------ */
/* rendering                                                          */
/* ------------------------------------------------------------------ */

function render(data) {
    const user = data.discord_user || {};
    const all = Array.isArray(data.activities) ? data.activities : [];

    // type 4 is the custom status (the emoji + text under your name). It is NOT an activity.
    const custom = all.find(a => a.type === 4) || null;
    const isStreaming = all.some(a => a.type === 1);
    const state = isStreaming ? "streaming" : (data.discord_status in STATUS ? data.discord_status : "offline");

    renderBanner(user, state);
    renderAvatar(user, state);
    renderNames(user, state);
    renderCustomStatus(custom);
    renderAbout();
    renderActivities(data, all);
    renderDevices(data);
    renderBadges(user);
    renderMemberSince(user);

    if (!overlay.hidden) startTick();
}

function renderBanner(user, state) {
    if (user.banner) {
        const ext = user.banner.startsWith("a_") ? "gif" : "png";
        banner.style.background = `center / cover url("https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=600")`;
        return;
    }

    const colour = user.banner_color || (user.accent_color != null ? `#${user.accent_color.toString(16).padStart(6, "0")}` : STATUS[state].colour);
    banner.style.background = `linear-gradient(135deg, ${colour}, #1b1d36 80%)`;
}

function renderAvatar(user, state) {
    const id = user.id || "0";
    const hash = user.avatar;
    const ext = hash && hash.startsWith("a_") ? "gif" : "png";

    avatar.src = hash
        ? `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=256`
        : "https://cdn.discordapp.com/embed/avatars/0.png";
    avatar.alt = user.username || "Discord user";

    if (user.avatar_decoration_data?.asset) {
        decoration.src = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png`;
        decoration.style.display = "block";
    } else {
        decoration.removeAttribute("src");
        decoration.style.display = "none";
    }

    statusDot.style.background = STATUS[state].colour;
}

function renderNames(user, state) {
    displayName.textContent = user.display_name || user.global_name || user.username || "Unknown";
    username.textContent = `@${user.username || "unknown"}`;

    const tag = user.primary_guild;
    guildTag.replaceChildren();
    guildTag.hidden = !(tag?.identity_enabled && tag.tag);

    if (!guildTag.hidden) {
        if (tag.badge && tag.identity_guild_id) {
            guildTag.append(h("img", {
                src: `https://cdn.discordapp.com/guild-tag-badges/${tag.identity_guild_id}/${tag.badge}.png?size=32`,
                alt: "",
                decoding: "async"
            }));
        }
        guildTag.append(tag.tag);
    }

    status.textContent = STATUS[state].name;
    status.style.setProperty("--status", STATUS[state].colour);
}

function emojiNode(emoji) {
    if (!emoji) return null;

    if (emoji.id) {
        return h("img", {
            class: "custom-emoji",
            alt: emoji.name || "",
            src: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "webp"}?size=48&quality=lossless`,
            decoding: "async"
        });
    }

    return emoji.name ? h("span", { class: "custom-emoji" }, emoji.name) : null;
}

function renderCustomStatus(custom) {
    customStatus.replaceChildren();

    const emoji = emojiNode(custom?.emoji);
    const text = custom?.state;

    if (!emoji && !text) {
        customStatus.hidden = true;
        return;
    }

    customStatus.hidden = false;
    if (emoji) customStatus.append(emoji);
    if (text) customStatus.append(h("span", { class: "custom-text" }, text));
}

function renderAbout() {
    aboutSection.hidden = !BIO;
    about.textContent = BIO;
}

function renderMemberSince(user) {
    discordId.textContent = user.id || "";

    try {
        const timestamp = Number(BigInt(user.id) >> 22n) + 1420070400000;
        created.textContent = new Date(timestamp).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
        created.textContent = "Unknown";
    }
}

function renderDevices(data) {
    const list = [];
    if (data.active_on_discord_desktop) list.push("Desktop");
    if (data.active_on_discord_web) list.push("Web");
    if (data.active_on_discord_mobile) list.push("Mobile");
    if (data.active_on_discord_embedded) list.push("Embedded");
    if (data.active_on_discord_vr) list.push("VR");
    if (!list.length) list.push("Offline");

    devices.replaceChildren(...list.map(name => h("div", { class: "device" }, name)));
}

function renderBadges(user) {
    const flags = user.public_flags || 0;
    const items = BADGES.filter(b => flags & b.flag);

    badges.hidden = items.length === 0;
    badges.replaceChildren(...items.map(badge => {
        const img = h("img", { class: "badge", src: `assets/badges/${badge.image}.png`, alt: badge.title, title: badge.title, decoding: "async" });
        img.addEventListener("error", () => {
            img.replaceWith(h("span", { class: "badge badge-fallback", title: badge.title, "aria-label": badge.title }, badge.fallback));
        }, { once: true });
        return img;
    }));
}

/* ----- activities ----- */

const isSpotifyActivity = a => a.id === "spotify:1" || (a.type === 2 && a.name === "Spotify");

function renderActivities(data, all) {
    timed = [];

    const cards = [];
    const spotify = data.listening_to_spotify && data.spotify ? data.spotify : null;

    if (spotify) cards.push(spotifyCard(spotify));

    for (const a of all) {
        if (a.type === 4) continue; // custom status lives under the name
        if (spotify && isSpotifyActivity(a)) continue; // already shown from the richer `spotify` object
        cards.push(activityCard(a));
    }

    activityCount.textContent = cards.length > 1 ? `${cards.length} activities` : "";
    activityCount.hidden = cards.length < 2;

    if (!cards.length) {
        activity.replaceChildren(h("div", { class: "activity-card empty" },
            h("div", { class: "activity-info" },
                h("div", { class: "activity-title" }, "No current activity"),
                h("div", { class: "activity-extra" }, "Nothing is being shared right now."))));
        return;
    }

    activity.replaceChildren(...cards);
}

function imageBlock(large, small, largeAlt, smallAlt) {
    if (!large) return null;

    const wrap = h("div", { class: "activity-assets" });
    const img = h("img", { class: "activity-large", alt: largeAlt || "", src: large, decoding: "async", loading: "lazy", draggable: false });
    img.addEventListener("error", () => wrap.remove(), { once: true });
    wrap.append(img);

    if (small) {
        const badge = h("img", { class: "activity-small", alt: smallAlt || "", src: small, decoding: "async", loading: "lazy", draggable: false });
        badge.addEventListener("error", () => badge.remove(), { once: true });
        wrap.append(badge);
    }

    return wrap;
}

function spotifyCard(s) {
    const body = h("div", { class: "activity-info" },
        h("div", { class: "activity-app" }, "Listening to Spotify"),
        s.track_id
            ? h("a", { class: "activity-title link", href: `https://open.spotify.com/track/${s.track_id}`, target: "_blank", rel: "noopener noreferrer" }, s.song)
            : h("div", { class: "activity-title" }, s.song),
        s.artist ? h("div", { class: "activity-details" }, `by ${s.artist.replaceAll(";", ",")}`) : null,
        s.album ? h("div", { class: "activity-extra" }, `on ${s.album}`) : null,
        progressBar(s.timestamps?.start, s.timestamps?.end, "#1db954"));

    return h("div", { class: "activity-card sheen spotify" }, imageBlock(s.album_art_url, null, s.album), body);
}

function activityCard(a) {
    const large = resolveImage(a, a.assets?.large_image);
    const small = resolveImage(a, a.assets?.small_image);
    const label = a.type === 2 && a.name ? `Listening to ${a.name}` : ACTIVITY_LABELS[a.type] || "Activity";

    const start = a.timestamps?.start;
    const end = a.timestamps?.end;
    let timeNode = null;

    if (start && end) {
        timeNode = progressBar(start, end, "#8ab4ff");
    } else if (start) {
        timeNode = h("div", { class: "activity-timestamp" }, h("span", { class: "clock", "data-start": start }, "0:00"), " elapsed");
        timed.push(timeNode.querySelector(".clock"));
    }

    const party = a.party?.size ? `${a.party.size[0]} of ${a.party.size[1]}` : "";

    const body = h("div", { class: "activity-info" },
        h("div", { class: "activity-app" }, label),
        h("div", { class: "activity-title" }, a.type === 2 ? (a.details || a.name) : a.name),
        a.type !== 2 && a.details ? h("div", { class: "activity-details" }, a.details) : null,
        a.state ? h("div", { class: "activity-extra" }, party ? `${a.state} (${party})` : a.state) : null,
        timeNode);

    return h("div", { class: "activity-card sheen" }, imageBlock(large, small, a.assets?.large_text, a.assets?.small_text), body);
}

function progressBar(start, end, colour) {
    if (!start) return null;

    const fill = h("div", { class: "activity-progress-fill", style: `background:${colour}` });
    const left = h("span", {}, "0:00");
    const right = h("span", {}, end ? formatDuration(end - start) : "Live");

    const box = h("div", { class: "activity-progress-container" },
        h("div", { class: "activity-progress-bar" }, fill),
        h("div", { class: "activity-progress-text" }, left, right));

    box.__live = { start: Number(start), end: end ? Number(end) : null, fill, left };
    timed.push(box);
    return box;
}

/** Updates every running clock in place. No re-rendering, no flicker. */
function updateClocks() {
    const now = Date.now();

    for (const el of timed) {
        if (el.__live) {
            const { start, end, fill, left } = el.__live;
            const elapsed = Math.max(0, now - start);

            if (end) {
                const total = Math.max(1, end - start);
                fill.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
                left.textContent = formatDuration(Math.min(elapsed, total));
            } else {
                left.textContent = formatDuration(elapsed);
            }
        } else if (el.dataset.start) {
            el.textContent = formatDuration(now - Number(el.dataset.start));
        }
    }
}

function formatDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = n => String(n).padStart(2, "0");

    return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/* ----- images ----- */

function resolveImage(a, image) {
    if (!image) return null;

    if (image.startsWith("spotify:")) return `https://i.scdn.co/image/${image.slice(8)}`;

    // mp:external/<hash>/https/example.com/pic.png  ->  Discord's media proxy
    if (image.startsWith("mp:external/")) return `https://media.discordapp.net/external/${image.slice(12)}`;
    if (image.startsWith("mp:")) return `https://media.discordapp.net/${image.slice(3)}`;

    if (image.startsWith("twitch:")) return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${image.slice(7)}-440x248.jpg`;
    if (image.startsWith("youtube:")) return `https://i.ytimg.com/vi/${image.slice(8)}/hqdefault_live.jpg`;

    if (a.application_id) return `https://cdn.discordapp.com/app-assets/${a.application_id}/${image}.png`;

    return null;
}

/* ------------------------------------------------------------------ */
/* misc                                                               */
/* ------------------------------------------------------------------ */

copyButton.addEventListener("click", async () => {
    const original = "Copy";

    try {
        await navigator.clipboard.writeText(discordId.textContent);
        copyButton.textContent = "Copied!";
    } catch {
        copyButton.textContent = "Press Ctrl+C";
        const range = document.createRange();
        range.selectNodeContents(discordId);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    setTimeout(() => { copyButton.textContent = original; }, 1600);
});

avatar.addEventListener("error", () => {
    avatar.src = "https://cdn.discordapp.com/embed/avatars/0.png";
}, { once: true });

decoration.addEventListener("error", () => {
    decoration.style.display = "none";
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !overlay.hidden) refresh();
});
