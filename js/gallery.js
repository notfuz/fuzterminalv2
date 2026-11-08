import loadAlbums from "./galleryData.js";
import { registerWindow, unregisterWindow, isWindowOpen, showOverlay, hideOverlay } from "./windows.js";
import { h } from "./dom.js";

const overlay = document.getElementById("gallery-overlay");
const content = document.getElementById("gallery-content");

const lightbox = document.getElementById("lightbox");
const viewport = document.getElementById("lightbox-viewport");
const prevButton = document.getElementById("lightbox-prev");
const nextButton = document.getElementById("lightbox-next");
const closeButton = document.getElementById("lightbox-close");
const caption = document.getElementById("lightbox-caption");
const counter = document.getElementById("lightbox-counter");

let albums = [];
let albumsPromise = null;
let rendered = false;

let albumIndex = 0;
let index = 0;
let media = null;
let renderToken = 0;

export async function openGallery() {
    registerWindow("gallery", closeGallery, { pauseSky: true });
    showOverlay(overlay);

    if (rendered) return;

    content.replaceChildren(h("div", { class: "gallery-empty" }, "Loading albums..."));

    try {
        albumsPromise ||= loadAlbums();
        albums = await albumsPromise;
    } catch (error) {
        console.error(error);
        albumsPromise = null;
        content.replaceChildren(h("div", { class: "gallery-empty" }, "Unable to load albums."));
        return;
    }

    if (!albums.length) {
        content.replaceChildren(h("div", { class: "gallery-empty" }, "No albums found."));
        return;
    }

    content.replaceChildren(...albums.map(buildAlbum));
    rendered = true;
}

export function closeGallery() {
    closeLightbox();
    hideOverlay(overlay);
    unregisterWindow("gallery");
}

function thumbFor(item) {
    return item.thumb || item.poster || (item.type === "video" ? null : item.src);
}

function buildTile(item, albumIdx, itemIdx, extra = 0) {
    const isVideo = item.type === "video";
    const thumb = thumbFor(item);
    const tile = h("button", {
        class: `gallery-preview-tile${isVideo ? " is-video" : ""}`,
        type: "button",
        "aria-label": `Open ${item.name || "item"}`,
        "data-album": albumIdx,
        "data-index": itemIdx
    });

    if (thumb) {
        const img = h("img", {
            class: "gallery-preview-media",
            alt: item.name || "",
            loading: "lazy",
            decoding: "async",
            draggable: false
        });
        img.addEventListener("load", () => tile.classList.add("loaded"), { once: true });
        img.addEventListener("error", () => { img.remove(); tile.classList.add("loaded", "broken"); }, { once: true });
        img.src = thumb;
        tile.append(img);
    } else if (isVideo) {
        const video = h("video", { class: "gallery-preview-media", muted: true, playsInline: true, preload: "metadata" });
        video.muted = true;
        video.addEventListener("loadeddata", () => tile.classList.add("loaded"), { once: true });
        video.src = `${item.src}#t=0.1`;
        tile.append(video);
    } else {
        tile.classList.add("loaded");
    }

    if (isVideo) tile.append(h("span", { class: "play-badge", "aria-hidden": "true" }, "▶"));
    if (extra > 0) tile.append(h("span", { class: "more-badge" }, `+${extra}`));

    return tile;
}

function buildAlbum(album, albumIdx) {
    const items = album.items || [];
    const preview = items.slice(0, 4);
    const extra = Math.max(0, items.length - 4);

    const photos = items.filter(i => i.type !== "video").length;
    const videos = items.length - photos;
    const parts = [];
    if (photos) parts.push(`${photos} photo${photos === 1 ? "" : "s"}`);
    if (videos) parts.push(`${videos} video${videos === 1 ? "" : "s"}`);

    const grid = h("div", { class: "gallery-preview-grid" },
        preview.length
            ? preview.map((item, i) => buildTile(item, albumIdx, i, i === 3 ? extra : 0))
            : h("div", { class: "gallery-placeholder" }, "No media yet"));

    return h("article", { class: "gallery-item sheen" },
        grid,
        h("div", { class: "gallery-info" },
            h("h2", {}, album.title),
            album.date ? h("div", { class: "gallery-date" }, album.date) : null,
            h("div", { class: "gallery-description" }, parts.join(" · ") || "Coming soon"),
            album.description ? h("p", { class: "gallery-about" }, album.description) : null));
}

content.addEventListener("click", event => {
    const tile = event.target.closest(".gallery-preview-tile");
    if (tile) openLightbox(Number(tile.dataset.album), Number(tile.dataset.index));
});

overlay.addEventListener("click", event => {
    if (event.target === overlay) closeGallery();
});

overlay.querySelector(".traffic .red")?.addEventListener("click", closeGallery);

const cam = { x: 0, y: 0, s: 1 };
const MAX_SCALE = 6;
let frame = 0;

function applyCamera() {
    frame = 0;
    if (media && media.tagName !== "VIDEO") {
        media.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.s})`;
    }
}

function schedule() {
    if (!frame) frame = requestAnimationFrame(applyCamera);
}

function resetCamera(animate = false) {
    cam.x = 0;
    cam.y = 0;
    cam.s = 1;
    if (animate) animateOnce();
    schedule();
}

function animateOnce() {
    if (!media) return;
    media.classList.add("animating");
    setTimeout(() => media?.classList.remove("animating"), 240);
}

function clampPan() {
    if (!media) return;
    const maxX = Math.max(0, (media.offsetWidth * cam.s - window.innerWidth) / 2);
    const maxY = Math.max(0, (media.offsetHeight * cam.s - window.innerHeight) / 2);
    cam.x = Math.max(-maxX, Math.min(maxX, cam.x));
    cam.y = Math.max(-maxY, Math.min(maxY, cam.y));
}

function zoomAt(clientX, clientY, nextScale) {
    if (!media) return;

    const rect = media.getBoundingClientRect();
    const mx = clientX - (rect.left + rect.width / 2);
    const my = clientY - (rect.top + rect.height / 2);

    const scale = Math.max(1, Math.min(MAX_SCALE, nextScale));
    const ratio = scale / cam.s;

    cam.x -= mx * (ratio - 1);
    cam.y -= my * (ratio - 1);
    cam.s = scale;

    if (cam.s <= 1.01) {
        cam.s = 1;
        cam.x = 0;
        cam.y = 0;
    } else {
        clampPan();
    }

    schedule();
}

function destroyMedia() {
    renderToken++;

    if (!media) return;

    if (media instanceof HTMLVideoElement) {
        media.pause();
        media.removeAttribute("src");
        media.load(); // aborts buffering
    } else {
        media.onload = null;
        media.onerror = null;
        media.removeAttribute("src");
    }

    media.remove();
    media = null;
}

function currentItems() {
    return albums[albumIndex]?.items || [];
}

function openLightbox(albumIdx, itemIdx) {
    albumIndex = albumIdx;
    index = itemIdx;

    if (!currentItems().length) return;

    registerWindow("lightbox", closeLightbox, { pauseSky: true });
    showOverlay(lightbox);
    renderItem();
}

function closeLightbox() {
    if (!isWindowOpen("lightbox")) {
        destroyMedia();
        return;
    }

    destroyMedia(); // stop the video before hiding
    hideOverlay(lightbox);
    unregisterWindow("lightbox");
}

function renderItem() {
    const items = currentItems();
    const item = items[index];
    if (!item) return;

    destroyMedia();
    resetCamera();

    const token = renderToken;
    const isVideo = item.type === "video";
    viewport.classList.add("loading");
    viewport.classList.remove("failed");

    let element;

    if (isVideo) {
        element = h("video", {
            class: "lightbox-media",
            controls: true,
            playsInline: true,
            preload: "auto",
            poster: item.thumb || item.poster || false
        });
        element.addEventListener("loadeddata", () => viewport.classList.remove("loading"), { once: true });
        element.addEventListener("error", () => { if (token === renderToken) viewport.classList.replace("loading", "failed"); }, { once: true });
        element.src = item.src;
        element.play?.().catch(() => { /* autoplay blocked: the controls are right there */ });
    } else {
        element = h("img", { class: "lightbox-media", alt: item.name || "", draggable: false, decoding: "async" });
        element.onload = () => { if (token === renderToken) viewport.classList.remove("loading"); };
        element.onerror = () => { if (token === renderToken) viewport.classList.replace("loading", "failed"); };
        element.src = item.src;
    }

    element.addEventListener("dragstart", e => e.preventDefault());
    viewport.appendChild(element);
    media = element;

    const album = albums[albumIndex];
    const details = [item.name, item.description, item.date].filter(Boolean);

    caption.replaceChildren(h("strong", {}, album.title), h("br"), details.join(" • ") || album.title);
    counter.textContent = `${index + 1} / ${items.length}`;

    const single = items.length < 2;
    prevButton.hidden = single;
    nextButton.hidden = single;

    const warm = () => [1, -1].forEach(step => {
        const neighbour = items[(index + step + items.length) % items.length];
        if (neighbour && neighbour.type !== "video") new Image().src = neighbour.src;
    });
    if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 1500 });
    else setTimeout(warm, 400);
}

function step(direction) {
    const items = currentItems();
    if (items.length < 2) return;
    index = (index + direction + items.length) % items.length;
    renderItem();
}

prevButton.addEventListener("click", () => step(-1));
nextButton.addEventListener("click", () => step(1));
closeButton.addEventListener("click", () => closeLightbox());

let downOnBackdrop = false;

lightbox.addEventListener("pointerdown", event => {
    downOnBackdrop = event.target === lightbox || event.target === viewport;
});

lightbox.addEventListener("click", event => {
    if (downOnBackdrop && (event.target === lightbox || event.target === viewport)) closeLightbox();
});

const pointers = new Map();
let dragStart = null;
let pinchStart = null;
let swipeStart = null;

const isImage = () => media && media.tagName === "IMG";

viewport.addEventListener("pointerdown", event => {
    if (!isImage() || event.target !== media) return;

    viewport.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
        dragStart = { x: event.clientX, y: event.clientY, cx: cam.x, cy: cam.y };
        swipeStart = { x: event.clientX, y: event.clientY, t: performance.now() };
        media.classList.add("dragging");
    } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: cam.s };
        dragStart = null;
        swipeStart = null;
    }
});

viewport.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinchStart.scale * (dist / pinchStart.dist));
    } else if (dragStart && cam.s > 1) {
        cam.x = dragStart.cx + (event.clientX - dragStart.x);
        cam.y = dragStart.cy + (event.clientY - dragStart.y);
        clampPan();
        schedule();
    }
});

function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);

    if (pointers.size < 2) pinchStart = null;

    if (swipeStart && event.type === "pointerup" && cam.s <= 1.05) {
        const dx = event.clientX - swipeStart.x;
        const dy = event.clientY - swipeStart.y;
        if (Math.abs(dx) > 70 && Math.abs(dy) < 60 && performance.now() - swipeStart.t < 600) step(dx < 0 ? 1 : -1);
    }

    if (pointers.size === 0) {
        dragStart = null;
        swipeStart = null;
        media?.classList.remove("dragging");
    }
}

viewport.addEventListener("pointerup", endPointer);
viewport.addEventListener("pointercancel", endPointer);

viewport.addEventListener("dblclick", event => {
    if (!isImage() || event.target !== media) return;
    event.preventDefault();
    animateOnce();
    if (cam.s > 1) resetCamera(true);
    else zoomAt(event.clientX, event.clientY, 2.5);
});

lightbox.addEventListener("wheel", event => {
    if (!isWindowOpen("lightbox")) return;
    event.preventDefault();
    if (!isImage()) return;
    zoomAt(event.clientX, event.clientY, cam.s * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
}, { passive: false });

document.addEventListener("keydown", event => {
    if (!isWindowOpen("lightbox")) return;

    if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    else if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    else if (event.key === "0") resetCamera(true);
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden && media instanceof HTMLVideoElement) media.pause();
});
