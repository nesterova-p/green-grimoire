require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

if(!process.env.BOT_TOKEN){
    console.error('Error! BOT_TOKEN environment variable is required!');
    process.exit(1);
}

/*
--------- USE ---------
 */

bot.use((ctx, next) => {
    const user = ctx.from.username || ctx.from.first_name;
    console.log(`${user} sent: "${ctx.message?.text || 'non-text message'}"`);
    return next();
})

/*
--------- START ---------
 */

bot.start((ctx) => {
    const username = ctx.from.first_name || ctx.from.username;
    const welcomeMessage = `🌿✨ *Greetings, ${username}!* ✨🌿

*Moss the Green Keeper awakens from the ancient grimoire...*

🍄 I am the guardian of this enchanted recipe tome! Within these pages lie the culinary secrets of countless realms and kitchens.

🔮 *Current magical abilities:*
- Conversing with fellow cooks
- Sensing recipe energies  
- Detecting mystical cooking videos

🌱 *Soon I shall master:*
- Extracting recipes from videos
- Translating ancient cooking tongues
- Organizing recipes in sacred scrolls

*Send /help to view my spell book, dear cook!* 📜⚡`;

    ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

/*
--------- HELP ---------
 */

bot.help((ctx) => {
    const helpMessage = `📜⚡ *Moss's Spell Book* ⚡📜

🌿 **Herb Gathering Commands:**
/start - Awaken the Green Keeper
/help - Open this ancient spell book
/ping - Check the grimoire's life force
/about - Learn of my grand quest

🔮 **Mystical Abilities:**
- Send me any message and I'll respond with woodland wisdom
- Share cooking videos (I'm learning to extract their secrets!)
- Send images of recipes (future magic!)

*"In every recipe lies a story, in every ingredient, a memory..."*
                                    — Ancient Kitchen Proverb 🌱✨`;

    ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

/*
--------- PING ---------
 */

bot.command('ping', (ctx) => {
    const uptime = Math.floor(process.uptime());
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;

    ctx.reply(`⚡🌿 *Grimoire Status Check* 🌿⚡

🕯️ *Moss has been awake for:* ${minutes}m ${seconds}s
🌱 *Life force:* Vibrant and growing
📚 *Grimoire pages:* All intact
🔮 *Magic level:* Ready for recipe enchantments!

*The ancient tome pulses with mystical energy...*`,
        { parse_mode: 'Markdown' });
});

/*
--------- VIDEO DETECTION FUNCTIONS ---------
 */

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
}

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

/*
--------- VIDEO DOWNLOAD ---------
 */

const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');

// to prevent multiple downloads at once
let isDownloading = false;
const downloadQueue = [];

const processDownloadQueue = async() => {
    if(isDownloading || downloadQueue.length === 0) return;

    isDownloading = true;

    const {url, ctx} = downloadQueue.shift();

    try{
        await downloadVideoInfo(url, ctx);
    } catch (error) {
        console.error('Queue processing error:', error);
    } finally {
        // process next in queue
        isDownloading = false;
        if(downloadQueue.length > 0){
            setTimeout(processDownloadQueue, 1000) // 1 sec
        }
    }
}

const downloadVideoInfo = async (url, ctx) => {
    try {
        await fs.ensureDir('./temp');

        ctx.reply(`🔮✨ *Moss begins the mystical video extraction ritual...* ✨🔮

🧙‍♀️ *Channeling ancient downloading spells...*
📁 *Preparing sacred scroll storage...*

*Please wait while I peer through the portal...* 🌿⚡`,
            { parse_mode: 'Markdown' });

        // initialize yt dlp once
        if (!global.ytDlpInstance) {
            try {
                global.ytDlpInstance = new YTDlpWrap();
                console.log('yt-dlp instance created!');
            } catch (error) {
                console.log('yt-dlp initialization issue:', error.message);
                throw new Error('Could not initialize video magic tools');
            }
        }

        let videoInfo;

        // special handling for TikTok
        if (url.includes('tiktok')) {
            try {
                videoInfo = await Promise.race([
                    global.ytDlpInstance.getVideoInfo(url),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('TikTok portal timeout')), 30000)
                    )
                ]);
            } catch (tiktokError) {
                console.log('TikTok info extraction failed, using minimal info:', tiktokError.message);
                videoInfo = {
                    title: 'TikTok Video (Info extraction blocked)',
                    duration: 'Unknown',
                    view_count: 'Unknown',
                    uploader: 'TikTok User'
                };
            }
        } else {
            // nnormal handling for other platforms
            videoInfo = await Promise.race([
                global.ytDlpInstance.getVideoInfo(url),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Video portal took too long to respond')), 100000)
                )
            ]);
        }

        const duration = (videoInfo.duration && !isNaN(videoInfo.duration)) ?
            `${Math.floor(videoInfo.duration / 60)}m ${Math.floor(videoInfo.duration % 60)}s` : 'Unknown';

        const views = videoInfo.view_count ? videoInfo.view_count.toLocaleString() : 'Unknown';

        const platformWarning = url.includes('tiktok') ?
            `\n⚠️ *TikTok videos are tricky! Download success not guaranteed.* ⚠️\n` : '';

        ctx.reply(`📜⚡ *Video portal successfully opened!* ⚡📜

🎬 **Title:** ${videoInfo.title || 'Unknown mystical content'}
⏱️ **Duration:** ${duration}
👁️ **Views:** ${views}
📺 **Channel:** ${videoInfo.uploader || 'Unknown sage'}
${platformWarning}
🤔💭 *Moss has examined the mystical portal...* 💭🤔

🔮 **Shall I capture this video in the physical realm?**
📝 *Reply "yes" or "download" to proceed*
🚫 *Reply "no" or "cancel" to skip*

*The choice is yours, dear cook!* ✨🌿`,
            { parse_mode: 'Markdown' });

        const userId = ctx.from.id;
        pendingDownloads.set(userId, {url, videoInfo})

        return videoInfo;

    } catch (error) {
        console.error('Video info error:', error);

        if (url.includes('tiktok') && error.message.includes('Unable to extract')) {
            ctx.reply(`🎵⚡ *TikTok's magical defenses are too strong!* ⚡🎵

🌿 This particular TikTok video has powerful anti-magic wards...

🧙‍♀️ *TikTok Portal Issues:*
- Video might be private or region-locked
- TikTok actively blocks video extraction
- Some TikTok videos work, others don't
- Success rate varies by video age and privacy

📱 *Suggestions:*
- Try a different TikTok video
- YouTube and Instagram work much better
- Public TikTok videos have better success rates

*Moss will keep trying different enchantments!* ✨🌱`,
                { parse_mode: 'Markdown' });
        } else {
            ctx.reply(`🐛⚡ *Moss's mystical vision is clouded!* ⚡🐛

🌿 The video portal resisted my ancient magic... 

*Error whispers:* ${error.message || 'Unknown magical interference'}

🧙‍♀️ *I shall grow stronger and try different spells!* ✨🌱`,
                { parse_mode: 'Markdown' });
        }

        return null;
    }
}

/*
--------- DOWNLOAD VIDEO INFO ---------
 */

const getPlatformSpecificOptions = (url) => {
    if (url.includes('tiktok')) {
        return [
            '--format', 'best[height<=720]',
            '--max-filesize', '100M',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ];
    } else if (url.includes('instagram')) {
        return [
            '--format', 'best[height<=720]',
            '--max-filesize', '100M'
        ];
    } else {
        // You Tube and others
        return [
            '--format', 'best[height<=720]/bestvideo[height<=720]+bestaudio/best',
            '--max-filesize', '100M'
        ];
    }
};

const downloadActualVideo = async(url, ctx, videoInfo) => {
    try{
        const timestamp = Date.now();
        const safeTitle = videoInfo.title?.replace(/[^a-z0-9]/ig, '_').substring(0,50) || 'video';
        const outputTemplate = `./temp/${safeTitle}_${timestamp}.%(ext)s`

        ctx.reply(`🔮⚡ *Moss begins the sacred downloading ritual!* ⚡🔮

🎬 **Capturing:** ${videoInfo.title}
📁 **Storing in temporary scrolls...**
⏳ **This may take a moment...**

*Ancient magic is flowing...* 🌿✨`,
            { parse_mode: 'Markdown' });

        // download options
        const downloadOptions = [
            ...getPlatformSpecificOptions(url),
            '--output', outputTemplate,
            '--no-playlist'
        ];

        const filePath = await global.ytDlpInstance.execPromise([url, ...downloadOptions]);

        // find downloaded file
        const files = await fs.readdir('./temp');
        const downloadedFile = files.find(file => file.includes(safeTitle) && file.includes(timestamp.toString()));

        if (downloadedFile) {
            const fullPath = `./temp/${downloadedFile}`;
            const stats = await fs.stat(fullPath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            ctx.reply(`📜🎉 *Video successfully captured in the grimoire!* 🎉📜

🎬 **File:** ${downloadedFile}
📊 **Size:** ${fileSizeMB} MB
📁 **Location:** Temporary mystical storage

🌱 *Moss has bound the video essence to the physical realm!*
🧙‍♀️ *Soon I'll learn to extract recipe wisdom from within...*

⚠️ *File will be cleansed from temporary storage in 1 hour* ✨🌿`,
                );


            setTimeout(async () => {
                try {
                    await fs.remove(fullPath);
                    console.log(` Cleaned up: ${downloadedFile}`);
                } catch (error) {
                    console.error('Cleanup error:', error);
                }
            }, 60 * 60 * 1000); // 1 hour

            return fullPath;
        } else {
            throw new Error('Download completed but file not found');
        }

    } catch (error) {
        console.error('Video download error:', error);

        let errorMessage = '🐛⚡ The downloading ritual has been disrupted! ⚡🐛\n\n';

        if (error.message.includes('TikTok') && error.message.includes('Unable to extract')) {
            errorMessage += `🎵 TikTok Portal Complications! 🎵

🌿 TikTok's magical wards are particularly strong today...

🧙‍♀️ Possible solutions:
- Try a different TikTok video
- TikTok frequently blocks video magic
- The video might be private or restricted
- Our spells may need updating

📱 YouTube and Instagram portals work more reliably! ✨`;
        } else if (error.message.includes('filesize')) {
            errorMessage += `📊 Video Too Large for Current Magic! 📊

🌿 This video exceeds our 100MB limit.

🧙‍♀️ Try a shorter video or different platform! ✨`;
        } else {
            errorMessage += `🌿 Unknown magical interference detected...

${error.message || 'The video spirits are not cooperating today!'}

🔮 Moss will grow stronger with each attempt! ✨🌱`;
        }

        ctx.reply(errorMessage);

        return null;
    }
}

const pendingDownloads = new Map();

const handleDownloadConfirmation = async (ctx, userMessage) => {
    const userId = ctx.from.id;
    const pending = pendingDownloads.get(userId);

    if(!pending) return false; // no dowloads pending

    const confirmWords = ['yes', 'download', 'y', 'ok', 'sure', 'proceed', 'go'];
    const cancelWords = ['no', 'cancel', 'stop', 'n', 'nope', 'skip'];

    const lowerMessage = userMessage.toLowerCase().trim();

    if(confirmWords.some(word => lowerMessage.includes(word))) {
        pendingDownloads.delete(userId);
        ctx.reply(`🔮⚡ *Moss prepares the downloading ritual!* ⚡🔮

🧙‍♀️ *Your wish is my command, dear cook!*
📜 *Beginning the sacred video capture...*

*Please wait while the magic unfolds...* ✨🌿`,
            { parse_mode: 'Markdown' });
        await downloadActualVideo(pending.url, ctx, pending.videoInfo);
        return true;
    }else if(cancelWords.some(word => lowerMessage.includes(word))) {
        pendingDownloads.delete(userId);
        ctx.reply(`🌿✨ *Moss nods understandingly* ✨🌿

🧙‍♀️ *No worries, dear cook! The video portal remains open in the ether.*
📜 *Send another video link anytime you're ready for downloading magic!*

*Moss returns to tending the grimoire...* 🍄📚`,
            { parse_mode: 'Markdown' });
        return true;
    }
    return false;
}


/*
--------- TEXT ---------
 */

bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;

    if (userMessage.startsWith('/')) {
        return;
    }

    const handledConfirmation = await handleDownloadConfirmation(ctx, userMessage);
    if(handledConfirmation) return;

    if (detectedVideoLink(userMessage)) {
        const urlMatch = userMessage.match(/(https?:\/\/[^\s]+)/);
        const url = urlMatch ? urlMatch[0] : '';

        if(isDownloading){
            downloadQueue.push({url, ctx});
            ctx.reply(`🕰️✨ *Moss is busy with another portal...* ✨🕰️

🌿 *Your request has been added to the mystical queue!*
📜 *Position in line: ${downloadQueue.length}*

*Please be patient while I finish the current ritual...* 🧙‍♀️⚡`,
                { parse_mode: 'Markdown' });
            return;
        }

        await downloadVideoInfo(url, ctx);

        setTimeout(processDownloadQueue, 5000); // check queue when finished
        return;
    }

    const sageResponses = [
        `🌿 *Moss nods thoughtfully* "${userMessage}" - I sense wisdom in your words, dear cook...`,
        `📜 *scribbles in grimoire* Your message "${userMessage}" has been recorded in the ancient scrolls!`,
        `✨ *Moss's eyes glow* Fascinating! "${userMessage}" - this knowledge shall help future recipes!`,
        `🍄 *rustles through herb pouches* "${userMessage}" - reminds me of an old kitchen tale...`,
        `🌱 *Moss smiles warmly* I hear you say "${userMessage}" - tell me more of your culinary adventures!`
    ];

    const randomResponse = sageResponses[Math.floor(Math.random() * sageResponses.length)];
    ctx.reply(randomResponse, { parse_mode: 'Markdown' });
});

/*
--------- VIDEO ---------
 */

bot.on('video', (ctx) => {
    ctx.reply(`🎬 Ooh, a video! Soon I'll extract recipes from these! 📝`);
});

/*
--------- PHOTO ---------
 */

bot.on('photo', (ctx) => {
    ctx.reply(`📸 Nice photo! Future me will read recipe text from images! 👁️`);
});

/*
--------- DOCUMENT ---------
 */

bot.on('document', (ctx) => {
    ctx.reply(`📄 A document! Maybe a PDF recipe? I'm still learning! 🌱`);
});

/*
--------- CATCH ---------
 */

bot.catch((err,ctx) => {
    console.error('🐛 Oops! Something went wrong:', err);
    ctx.reply('🔧 Sorry, I had a little magical malfunction! Try again? ⚡').catch(() => console.error('Could not even send error message!'))
})

/*
--------- LAUNCH ---------
 */

bot.launch().then(() => {
    console.log('✅ Bot is alive and ready for magic!');
    console.log('🔮 Try /start, /help, /ping in Telegram!');
})
    .catch((err) => {
        console.error('❌ Failed to start bot:', err);
        process.exit(1);
    })
console.log('🌿 Starting GreenGrimoire bot...');