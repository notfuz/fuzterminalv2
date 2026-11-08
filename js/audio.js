/*
 * Procedural sound effects (Web Audio). No audio files to download, nothing to host.
 * Sounds only ever play in response to the visitor typing a command, and can be muted
 * with the `sound` command (remembered in localStorage).
 */

let ctx = null;
let master = null;
let noiseBuffer = null;
let enabled = readPref();

function readPref() {
    try {
        return localStorage.getItem("fz-sound") !== "off";
    } catch {
        return true;
    }
}

function writePref(value) {
    try {
        localStorage.setItem("fz-sound", value ? "on" : "off");
    } catch { /* storage unavailable - fine */ }
}

export function isEnabled() {
    return enabled;
}

export function setEnabled(value) {
    enabled = Boolean(value);
    writePref(enabled);
    if (enabled) play("pop");
}

function ensure() {
    if (!enabled) return null;

    if (!ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;

        ctx = new AudioContextClass();
        master = ctx.createGain();
        master.gain.value = 0.55;

        const compressor = ctx.createDynamicsCompressor();
        master.connect(compressor);
        compressor.connect(ctx.destination);

        // one shared second of white noise
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }

    if (ctx.state === "suspended") ctx.resume();
    return ctx;
}

function tone(freq, { type = "sine", dur = 0.2, vol = 0.2, at = 0, to = null, attack = 0.006, filter = null } = {}) {
    const c = ensure();
    if (!c) return;

    const t = c.currentTime + at;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = osc;
    if (filter) {
        const biquad = c.createBiquadFilter();
        biquad.type = "lowpass";
        biquad.frequency.value = filter;
        osc.connect(biquad);
        node = biquad;
    }

    node.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + dur + 0.05);
}

function noise({ dur = 0.2, vol = 0.2, at = 0, type = "bandpass", from = 1000, to = null, q = 1 } = {}) {
    const c = ensure();
    if (!c) return;

    const t = c.currentTime + at;
    const source = c.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.start(t, Math.random() * 0.5);
    source.stop(t + dur + 0.05);
}

/** Long low hum with a slow wobble (matrix, deep thought). */
function drone({ freq = 55, dur = 4, vol = 0.18, at = 0 } = {}) {
    const c = ensure();
    if (!c) return;

    const t = c.currentTime + at;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;

    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.7;
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);

    [1, 2, 3.01].forEach((mult, i) => {
        const osc = c.createOscillator();
        osc.type = i === 0 ? "sawtooth" : "sine";
        osc.frequency.value = freq * mult;
        lfoGain.connect(osc.frequency);
        const g = c.createGain();
        g.gain.value = i === 0 ? 0.6 : 0.25;
        osc.connect(g);
        g.connect(filter);
        osc.start(t);
        osc.stop(t + dur + 0.1);
    });

    filter.connect(gain);
    gain.connect(master);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
}

const SOUNDS = {
    pop() {
        tone(520, { to: 920, dur: 0.09, vol: 0.14 });
    },

    tick() {
        noise({ dur: 0.03, vol: 0.06, type: "highpass", from: 3500 });
    },

    achievement() {
        [659, 880, 1319].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, vol: 0.14, at: i * 0.09 }));
        tone(1760, { dur: 0.6, vol: 0.05, at: 0.28 });
    },

    chime() {
        [784, 988, 1175, 1568, 1976].forEach((f, i) => {
            tone(f, { type: "sine", dur: 0.7, vol: 0.11, at: i * 0.11 });
            tone(f * 2, { type: "sine", dur: 0.45, vol: 0.03, at: i * 0.11 });
        });
    },

    crack() {
        noise({ dur: 0.07, vol: 0.35, type: "highpass", from: 2500 });
        noise({ dur: 0.14, vol: 0.25, type: "lowpass", from: 600, at: 0.03 });
    },

    error() {
        tone(110, { type: "sawtooth", dur: 0.45, vol: 0.2, filter: 900 });
        tone(116, { type: "square", dur: 0.45, vol: 0.08, filter: 900 });
    },

    alarm() {
        for (let i = 0; i < 4; i++) {
            tone(i % 2 ? 660 : 880, { type: "square", dur: 0.16, vol: 0.09, at: i * 0.2, filter: 2400 });
        }
    },

    glitch() {
        for (let i = 0; i < 9; i++) {
            noise({ dur: 0.05, vol: 0.18, from: 300 + Math.random() * 4000, q: 4, at: i * 0.055 });
            if (i % 3 === 0) tone(80 + Math.random() * 500, { type: "sawtooth", dur: 0.05, vol: 0.07, at: i * 0.055 });
        }
    },

    whoosh() {
        noise({ dur: 0.55, vol: 0.2, from: 250, to: 3200, q: 0.8 });
    },

    poweroff() {
        tone(900, { to: 40, dur: 0.5, vol: 0.14, type: "sine" });
        noise({ dur: 0.1, vol: 0.2, type: "highpass", from: 4000, at: 0.45 });
    },

    poweron() {
        tone(50, { to: 700, dur: 0.45, vol: 0.12, type: "triangle" });
        noise({ dur: 0.12, vol: 0.12, type: "highpass", from: 3000 });
    },

    coffee() {
        // sad trombone
        [[293, 277], [277, 262], [262, 247], [247, 175]].forEach(([from, to], i) => {
            tone(from, { type: "sawtooth", to, dur: i === 3 ? 1 : 0.38, vol: 0.12, at: i * 0.4, filter: 700 });
        });
    },

    hum() {
        drone({ freq: 55, dur: 5.5, vol: 0.2 });
    },

    deep() {
        drone({ freq: 41, dur: 6, vol: 0.22 });
        [261.6, 329.6, 392, 523.3].forEach((f, i) => tone(f, { type: "sine", dur: 1.6, vol: 0.06, at: 4.1 + i * 0.03 }));
    },

    step() {
        noise({ dur: 0.09, vol: 0.2, type: "lowpass", from: 260 });
    },

    nom() {
        for (let i = 0; i < 3; i++) tone(240, { to: 110, dur: 0.09, vol: 0.16, at: i * 0.13, type: "triangle" });
    },

    wave() {
        tone(523, { type: "triangle", dur: 0.2, vol: 0.14 });
        tone(659, { type: "triangle", dur: 0.3, vol: 0.14, at: 0.12 });
    },

    meteor() {
        noise({ dur: 0.7, vol: 0.05, from: 5000, to: 1400, q: 2 });
        tone(2400, { to: 900, dur: 0.5, vol: 0.03 });
    },

    stamp() {
        tone(90, { to: 40, dur: 0.25, vol: 0.35, type: "sine" });
        noise({ dur: 0.1, vol: 0.2, type: "lowpass", from: 800 });
    },

    coin() {
        tone(988, { type: "square", dur: 0.07, vol: 0.05, filter: 4200 });
        tone(1319, { type: "square", dur: 0.22, vol: 0.05, at: 0.07, filter: 4200 });
    },

    rumble() {
        noise({ dur: 1.5, vol: 0.28, type: "lowpass", from: 90, to: 260, q: 0.7 });
        tone(48, { to: 70, dur: 1.5, vol: 0.2, type: "sawtooth", filter: 200 });
    },

    boom() {
        noise({ dur: 1.1, vol: 0.55, type: "lowpass", from: 1400, to: 60, q: 0.6 });
        noise({ dur: 0.18, vol: 0.4, type: "highpass", from: 2200 });
        tone(130, { to: 28, dur: 0.9, vol: 0.5, type: "sine" });
    },

    horn() {
        tone(311, { type: "sawtooth", dur: 0.55, vol: 0.14, filter: 900 });
        tone(392, { type: "sawtooth", dur: 0.55, vol: 0.12, filter: 900 });
        tone(311, { type: "sawtooth", dur: 0.7, vol: 0.14, at: 0.65, filter: 900 });
        tone(392, { type: "sawtooth", dur: 0.7, vol: 0.12, at: 0.65, filter: 900 });
    },

    sonar() {
        tone(1046, { dur: 0.9, vol: 0.12 });
        tone(1046, { dur: 0.6, vol: 0.04, at: 0.18 });
    },

    levelup() {
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, { type: "square", dur: 0.12, vol: 0.07, at: i * 0.075, filter: 3500 }));
    },

    blip() {
        tone(1200, { type: "square", dur: 0.04, vol: 0.04, filter: 3000 });
    }
};

export function play(name) {
    if (!enabled) return;
    const sound = SOUNDS[name];
    if (!sound) return;

    try {
        sound();
    } catch (error) {
        console.warn("Sound failed:", name, error);
    }
}
