const detectedVideoLink = (text) => {
    const videoPatterns = [
        /tiktok\.com/i,
        /instagram\.com/i,
        /youtube\.com/i,
        /youtu\.be/i,
        /facebook\.com.*\/videos/i,
        /twitter\.com.*\/status/i
    ];

    return videoPatterns.some(pattern => pattern.test(text));
};

const getPlatformResponse = (url) => {
    if (url.includes('tiktok')) {
        return `🎵 *TikTok Portal Detected!* Often contains quick recipe enchantments with mystical background music! 🎶`;
    } else if (url.includes('instagram')) {
        return `📸 *Instagram Scroll Detected!* Usually holds beautiful food imagery with recipe secrets! ✨`;
    } else if (url.includes('youtube')) {
        return `🎥 *YouTube Tome Detected!* Likely contains detailed cooking tutorials from kitchen masters! 📚`;
    } else if (url.includes('facebook')) {
        return `👥 *Facebook Gathering Detected!* Shared wisdom from the cooking community! 🍲`;
    } else {
        return `🔮 *Unknown Video Magic Detected!* A mysterious portal to culinary knowledge! 🌟`;
    }
};

const getPlatformSpecificOptions = (url) => {
    if (url.includes('tiktok')) {
        return [
            '--format', 'best/worst',
            '--max-filesize', '100M',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ];
    } else if (url.includes('instagram')) {
        return [
            '--format', 'best',
            '--max-filesize', '100M'
        ];
    } else if (url.includes('youtube')) {
        return [
            '--format', 'best[height<=720]/best[ext=mp4]/best[ext=webm]/best',
            '--max-filesize', '100M',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            '--no-check-formats',
            '--prefer-free-formats'
        ];
    } else {
        return [
            '--format', 'best[height<=720]/bestvideo[height<=720]+bestaudio/best',
            '--max-filesize', '100M'
        ];
    }
};

const getPlatformSpecificOptionsWithFallback = (url, attemptNumber = 1) => {
    if (url.includes('instagram')) {
        switch (attemptNumber) {
            case 1:
                return [
                    '--format', 'best',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
                ];
            case 2:
                return [
                    '--format', 'mp4/best',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                ];
            case 3:
                return [
                    '--format', 'worst',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                    '--no-check-formats'
                ];
            case 4:
                return [
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (Android 10; Mobile; rv:81.0) Gecko/81.0 Firefox/81.0',
                    '--no-check-formats'
                ];
            default:
                return [
                    '--format', 'best',
                    '--max-filesize', '100M'
                ];
        }
    } else if (url.includes('youtube')) {
        switch (attemptNumber) {
            case 1:
                return [
                    '--format', 'best[height<=720]/best[ext=mp4]/best',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    '--no-check-formats'
                ];
            case 2:
                return [
                    '--format', 'best/worst',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    '--no-check-formats',
                    '--prefer-free-formats'
                ];
            case 3:
                return [
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    '--prefer-free-formats'
                ];
            case 4:
                return [
                    '--format', 'bestvideo[height<=480]+bestaudio/best[height<=480]',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                    '--prefer-free-formats',
                    '--merge-output-format', 'mp4'
                ];
            default:
                return getPlatformSpecificOptions(url);
        }
    } else if (url.includes('tiktok')) {
        switch (attemptNumber) {
            case 1:
                return [
                    '--format', 'best',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
                ];
            case 2:
                return [
                    '--format', 'worst',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                ];
            case 3:
                return [
                    '--format', 'mp4',
                    '--max-filesize', '100M',
                    '--user-agent', 'Mozilla/5.0 (Android 10; Mobile; rv:81.0) Gecko/81.0 Firefox/81.0',
                    '--no-check-formats'
                ];
            case 4:
                return [
                    '--max-filesize', '100M',
                    '--user-agent', 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet',
                    '--no-check-formats'
                ];
            default:
                return getPlatformSpecificOptions(url);
        }
    } else {
        return getPlatformSpecificOptions(url);
    }
};

const detectPlatformFromUrl = (url) => {
    if (!url) return 'unknown';
    if (url.includes('tiktok')) return 'tiktok';
    if (url.includes('instagram')) return 'instagram';
    if (url.includes('youtube')) return 'youtube';
    if (url.includes('facebook')) return 'facebook';
    return 'file_upload';
};

module.exports = {
    detectedVideoLink,
    getPlatformResponse,
    getPlatformSpecificOptions,
    getPlatformSpecificOptionsWithFallback,
    detectPlatformFromUrl
};