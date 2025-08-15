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
            '--format', 'best[height<=720]',
            '--max-filesize', '100M'
        ];
    } else if (url.includes('youtube')) {
        // Better YouTube Shorts handling
        return [
            '--format', 'best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best',
            '--max-filesize', '100M',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ];
    } else {
        return [
            '--format', 'best[height<=720]/bestvideo[height<=720]+bestaudio/best',
            '--max-filesize', '100M'
        ];
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
    detectPlatformFromUrl
};