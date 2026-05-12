/**
 * Utility to parse User Agent strings and return device info
 */
export const parseUserAgent = (ua) => {
    if (!ua) return { type: 'unknown', name: 'Desconocido', icon: '❓' };

    const lowerUA = ua.toLowerCase();
    
    // OS Detection
    let os = 'PC';
    if (lowerUA.includes('android')) os = 'Android';
    else if (lowerUA.includes('iphone') || lowerUA.includes('ipad')) os = 'iOS';
    else if (lowerUA.includes('macintosh')) os = 'macOS';
    else if (lowerUA.includes('windows')) os = 'Windows';
    else if (lowerUA.includes('linux')) os = 'Linux';

    // Browser Detection
    let browser = 'Browser';
    if (lowerUA.includes('edg/')) browser = 'Edge';
    else if (lowerUA.includes('chrome')) browser = 'Chrome';
    else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) browser = 'Safari';
    else if (lowerUA.includes('firefox')) browser = 'Firefox';

    return {
        os,
        browser,
        isMobile: os === 'Android' || os === 'iOS',
        fullName: `${browser} en ${os}`
    };
};
