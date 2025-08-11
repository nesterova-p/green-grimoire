const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');
const { getPlatformSpecificOptions } = require('./platformDetection');
const { transcribeAudio } = require('./speechToText');
const { parseRecipe } = require('./recipeParser');

let isDownloading = false;
const downloadQueue = [];
const pendingDownloads = new Map();

const processDownloadQueue = async () => {
    if (isDownloading || downloadQueue.length === 0) return;

    isDownloading = true;
    const { url, ctx } = downloadQueue.shift();

    try {
        await downloadVideoInfo(url, ctx);
    } catch (error) {
        console.error('Queue processing error:', error);
    } finally {
        isDownloading = false;
        if (downloadQueue.length > 0) {
            setTimeout(processDownloadQueue, 1000);
        }
    }
};

const extractVideoDescription = (videoInfo) => {
    const description = videoInfo.description || '';
    const title = videoInfo.title || '';
    const uploader = videoInfo.uploader || '';

    let descriptionText = '';

    if (title) {
        descriptionText += `TITLE: ${title}\n`;
    }

    if (description && description.length > 10) {
        descriptionText += `DESCRIPTION: ${description}\n`;
    }

    if (uploader) {
        descriptionText += `CREATOR: ${uploader}\n`;
    }

    return descriptionText.trim();
};

const downloadVideoInfo = async (url, ctx) => {
    try {
        await fs.ensureDir('./temp');

        ctx.reply(`🔮✨ *Moss begins the mystical video extraction ritual...* ✨🔮

🧙‍♀️ *Channeling ancient downloading spells...*
📁 *Preparing sacred scroll storage...*

*Please wait while I peer through the portal...* 🌿⚡`,
            { parse_mode: 'Markdown' });

        // Initialize yt-dlp once
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

        // Special handling for TikTok
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
        pendingDownloads.set(userId, { url, videoInfo });

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
};

const downloadActualVideo = async (url, ctx, videoInfo) => {
    try {
        const timestamp = Date.now();
        const safeTitle = videoInfo.title?.replace(/[^a-z0-9]/gi, '_').substring(0, 50) || 'video';
        const outputTemplate = `./temp/${safeTitle}_${timestamp}.%(ext)s`;

        ctx.reply(`🔮⚡ *Moss begins the sacred downloading ritual!* ⚡🔮

🎬 **Capturing:** ${videoInfo.title}
📁 **Storing in temporary scrolls...**
🎵 **Extracting mystical audio essence...**
⏳ **This may take a moment...**

*Ancient magic is flowing...* 🌿✨`,
            { parse_mode: 'Markdown' });

        const downloadOptions = [
            ...getPlatformSpecificOptions(url),
            '--output', outputTemplate,
            '--no-playlist',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '192K',
            '--keep-video'
        ];

        await global.ytDlpInstance.execPromise([url, ...downloadOptions]);

        const files = await fs.readdir('./temp');

        const videoFile = files.find(file =>
            file.includes(safeTitle) &&
            file.includes(timestamp.toString()) &&
            (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
        );

        const audioFile = files.find(file =>
            file.includes(safeTitle) &&
            file.includes(timestamp.toString()) &&
            file.endsWith('.mp3')
        );

        if (videoFile) {
            const videoPath = `./temp/${videoFile}`;
            const videoStats = await fs.stat(videoPath);
            const videoSizeMB = (videoStats.size / (1024 * 1024)).toFixed(2);

            let audioPath = null;
            let audioSizeMB = 'N/A';

            if (audioFile) {
                audioPath = `./temp/${audioFile}`;
                const audioStats = await fs.stat(audioPath);
                audioSizeMB = (audioStats.size / (1024 * 1024)).toFixed(2);
            }

            const successMessage = audioFile ?
                `📜🎉 *Video AND Audio successfully captured!* 🎉📜

🎬 **Video File:** ${videoFile}
📊 **Video Size:** ${videoSizeMB} MB

🎵 **Audio File:** ${audioFile}
📊 **Audio Size:** ${audioSizeMB} MB
🔮 **Audio Quality:** MP3 (192kbps)

🌱 *Moss has bound both video essence and mystical voices!*
🧙‍♀️ *The recipe wisdom awaits transcription magic...*
🗣️ *Audio ready for future speech-to-text spells!*

⚠️ *Both files will be cleansed from storage in 1 hour* ✨🌿` :
                `📜🎉 *Video captured (audio not available)* 🎉📜

🎬 **Video File:** ${videoFile}
📊 **Video Size:** ${videoSizeMB} MB
📁 **Location:** Temporary mystical storage

🌱 *Video essence captured successfully!*
⚠️ *This video had no audio track to extract*

⚠️ *File will be cleansed from storage in 1 hour* ✨🌿`;

            ctx.reply(successMessage);

            if(audioPath){
                const transcript  = await transcribeAudio(audioPath, ctx, videoInfo);
                const descriptionText = extractVideoDescription(videoInfo);

                const textSource = {
                    transcript: transcript,
                    description: descriptionText,
                }

                const structuredRecipe = await parseRecipe(textSource, ctx, videoInfo);

                if(transcript){
                    console.log(`Transcript captured for: ${videoInfo.title}`);
                }

                if (structuredRecipe) {
                    console.log(`🍳 Recipe extracted for: ${videoInfo.title}`);
                }
            }

            setTimeout(async () => {
                try {
                    await fs.remove(videoPath);
                    console.log(`🧹 Cleaned up video: ${videoFile}`);

                    if (audioPath) {
                        await fs.remove(audioPath);
                        console.log(`🧹 Cleaned up audio: ${audioFile}`);
                    }
                } catch (error) {
                    console.error('Cleanup error:', error);
                }
            }, 60 * 60 * 1000); // 1 hour

            return {
                videoPath: videoPath,
                audioPath: audioPath,
                videoFile: videoFile,
                audioFile: audioFile
            };

        } else {
            throw new Error('Download completed but no video file found');
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
        } else if (error.message.includes('Postprocessing') && error.message.includes('ffmpeg')) {
            errorMessage += `🔧 FFmpeg Magical Tools Issue! 🔧

🌿 The audio extraction tools need attention...

🧙‍♀️ This shouldn't happen since you installed FFmpeg!
- Try restarting the bot
- Check if FFmpeg is in your PATH
- Video-only download should still work

*Moss's video magic is still strong!* ✨`;
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
};

const handleDownloadConfirmation = async (ctx, userMessage) => {
    const userId = ctx.from.id;
    const pending = pendingDownloads.get(userId);

    if (!pending) return false;

    const confirmWords = ['yes', 'download', 'y', 'ok', 'sure', 'proceed', 'go'];
    const cancelWords = ['no', 'cancel', 'stop', 'n', 'nope', 'skip'];

    const lowerMessage = userMessage.toLowerCase().trim();

    if (confirmWords.some(word => lowerMessage.includes(word))) {
        pendingDownloads.delete(userId);
        ctx.reply(`🔮⚡ *Moss prepares the downloading ritual!* ⚡🔮

🧙‍♀️ *Your wish is my command, dear cook!*
📜 *Beginning the sacred video capture...*

*Please wait while the magic unfolds...* ✨🌿`,
            { parse_mode: 'Markdown' });
        await downloadActualVideo(pending.url, ctx, pending.videoInfo);
        return true;
    } else if (cancelWords.some(word => lowerMessage.includes(word))) {
        pendingDownloads.delete(userId);
        ctx.reply(`🌿✨ *Moss nods understandingly* ✨🌿

🧙‍♀️ *No worries, dear cook! The video portal remains open in the ether.*
📜 *Send another video link anytime you're ready for downloading magic!*

*Moss returns to tending the grimoire...* 🍄📚`,
            { parse_mode: 'Markdown' });
        return true;
    }
    return false;
};

module.exports = {
    downloadVideoInfo,
    downloadActualVideo,
    handleDownloadConfirmation,
    processDownloadQueue,
    isDownloading: () => isDownloading,
    addToQueue: (item) => downloadQueue.push(item),
    getQueueLength: () => downloadQueue.length
};