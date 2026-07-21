import { Capacitor } from '@capacitor/core';

/** @typedef {'capacitor' | 'web-mobile' | 'web-desktop'} PlatformKind */

export const PLATFORM = {
    CAPACITOR: 'capacitor',
    WEB_MOBILE: 'web-mobile',
    WEB_DESKTOP: 'web-desktop',
};

const PLATFORM_CLASSES = [
    'platform-web',
    'platform-web-desktop',
    'platform-web-mobile',
    'platform-capacitor',
    'platform-native',
    'platform-android',
    'is-capacitor',
];

const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/** @returns {boolean} */
export function isNativePlatform() {
    return Capacitor.isNativePlatform();
}

/** @returns {boolean} */
export function isAndroidNative() {
    return isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/** Detección de web móvil: viewport estrecho o UA móvil (solo en navegador). */
export function isWebMobileViewport() {
    if (isNativePlatform()) return false;
    const narrow = window.matchMedia('(max-width: 768px)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const mobileUA = MOBILE_UA.test(navigator.userAgent);
    return narrow || mobileUA || (coarse && mobileUA);
}

/** @returns {PlatformKind} */
export function getPlatform() {
    if (isNativePlatform()) return PLATFORM.CAPACITOR;
    return isWebMobileViewport() ? PLATFORM.WEB_MOBILE : PLATFORM.WEB_DESKTOP;
}

export function isWebDesktop() {
    return getPlatform() === PLATFORM.WEB_DESKTOP;
}

export function isWebMobile() {
    return getPlatform() === PLATFORM.WEB_MOBILE;
}

function clearPlatformClasses(targets) {
    targets.forEach((el) => {
        PLATFORM_CLASSES.forEach((cls) => el.classList.remove(cls));
    });
}

/** Aplica clases en html y body para CSS/JS por plataforma. */
export function applyPlatformClasses() {
    const root = document.documentElement;
    const body = document.body;
    const targets = [root, body];

    clearPlatformClasses(targets);

    const platform = getPlatform();
    root.dataset.platform = platform;

    if (platform === PLATFORM.CAPACITOR) {
        targets.forEach((el) => {
            el.classList.add('platform-capacitor', 'platform-native', 'is-capacitor');
            if (isAndroidNative()) el.classList.add('platform-android');
        });
        return;
    }

    targets.forEach((el) => el.classList.add('platform-web'));

    if (platform === PLATFORM.WEB_MOBILE) {
        targets.forEach((el) => el.classList.add('platform-web-mobile'));
    } else {
        targets.forEach((el) => el.classList.add('platform-web-desktop'));
    }
}

let resizeTimer = null;

/** Inicializa clases al arranque y actualiza web-mobile/desktop al redimensionar. */
export function initPlatformDetection() {
    applyPlatformClasses();

    if (isNativePlatform()) return;

    const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applyPlatformClasses, 150);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
}
