/**
 * Timbre de largada (~1.5s, un solo golpe tipo portería) para el cronometrista.
 * Web Audio API — sin archivo externo. Llamar unlockRaceStartBell() tras un gesto.
 */

let sharedCtx = null;
let lastPlayAt = 0;

const RING_DURATION_SEC = 1.5;

const getContext = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx) sharedCtx = new Ctx();
    return sharedCtx;
};

/** Desbloquea audio tras un click/tap del juez (autoplay policies). */
export const unlockRaceStartBell = () => {
    try {
        const ctx = getContext();
        if (ctx?.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
    } catch {
        // ignore
    }
};

/** Un solo timbre sostenido tipo portería (~1.5s). */
const scheduleDoorbell = (ctx, startAt, durationSec = RING_DURATION_SEC) => {
    // Cuerpo del timbre (zumbido)
    const buzz = ctx.createOscillator();
    const buzzGain = ctx.createGain();
    buzz.type = 'square';
    buzz.frequency.setValueAtTime(420, startAt);
    buzzGain.gain.setValueAtTime(0.0001, startAt);
    buzzGain.gain.exponentialRampToValueAtTime(0.1, startAt + 0.04);
    buzzGain.gain.setValueAtTime(0.1, startAt + durationSec * 0.75);
    buzzGain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
    buzz.connect(buzzGain);
    buzzGain.connect(ctx.destination);
    buzz.start(startAt);
    buzz.stop(startAt + durationSec + 0.05);

    // Tono de campana / portería
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(840, startAt);
    bellGain.gain.setValueAtTime(0.0001, startAt);
    bellGain.gain.exponentialRampToValueAtTime(0.26, startAt + 0.03);
    bellGain.gain.setValueAtTime(0.22, startAt + durationSec * 0.7);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(startAt);
    bell.stop(startAt + durationSec + 0.05);

    // Armónico superior (brillo del timbre)
    const high = ctx.createOscillator();
    const highGain = ctx.createGain();
    high.type = 'sine';
    high.frequency.setValueAtTime(1260, startAt);
    highGain.gain.setValueAtTime(0.0001, startAt);
    highGain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.025);
    highGain.gain.setValueAtTime(0.09, startAt + durationSec * 0.65);
    highGain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
    high.connect(highGain);
    highGain.connect(ctx.destination);
    high.start(startAt);
    high.stop(startAt + durationSec + 0.05);
};

/**
 * Timbre único de ~1.5s tipo portería.
 * Deduplica tocados muy seguidos (SignalR global + por fase).
 */
export const playRaceStartBell = ({ force = false } = {}) => {
    try {
        const now = Date.now();
        if (!force && now - lastPlayAt < 1800) return;
        lastPlayAt = now;

        const ctx = getContext();
        if (!ctx) return;

        const start = () => {
            scheduleDoorbell(ctx, ctx.currentTime + 0.02, RING_DURATION_SEC);
        };

        if (ctx.state === 'suspended') {
            ctx.resume().then(start).catch(() => {});
        } else {
            start();
        }
    } catch (err) {
        console.warn('[raceStartBell] no se pudo reproducir:', err);
    }
};

/**
 * ¿La largada es “en vivo” (no un catch-up al abrir una carrera vieja)?
 */
export const isFreshRaceStart = (t0Ms, nowMs = Date.now(), maxLagSec = 8) => {
    if (t0Ms == null || Number.isNaN(t0Ms)) return false;
    const lagSec = Math.abs(nowMs - t0Ms) / 1000;
    return lagSec <= maxLagSec;
};
