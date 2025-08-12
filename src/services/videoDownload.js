const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');
const { getPlatformSpecificOptions } = require('./platformDetection');
const { transcribeAudio } = require('./speechToText');
const { parseRecipe } = require('./recipeParser');
const { smartExtractTextFromVideo } = require('./smartTextExtraction');

let isDownloading = false;
const downloadQueue = [];
const pendingDownloads = new Map();

// single message that gets edited
const sendProgressUpdate = async (ctx, messageId, status, details = '') => {
    const progressSteps = {
        'analyzing': '🔮✨ Moss peers through the mystical portal... ✨🔮',
        'downloading': '🧙‍♀️⚡ Channeling ancient downloading spells... ⚡🧙‍♀️',
        'extracting': '🎵📜 Binding video essence and mystical voices... 📜🎵',
        'processing': '🧠🌿 Moss analyzes the captured culinary wisdom... 🌿🧠',
        'parsing': '🍳✨ Organizing ancient kitchen knowledge into sacred scrolls... ✨🍳'
    };

    const cleanDetails = details ? details.replace(/\*/g, '').replace(/_/g, '') : '';  // clean details text; aviod md issues

    const message = `${progressSteps[status] || status}

${cleanDetails ? `${cleanDetails}\n` : ''}
*Ancient magic is flowing...* 🌿⚡`;

    try {
        if (messageId) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                messageId,
                null,
                message,
                { parse_mode: 'Markdown' }
            );
        } else {
            const sent = await ctx.reply(message, { parse_mode: 'Markdown' });
            return sent.message_id;
        }
    } catch (error) {
        console.error('Progress update error:', error.message);
        const plainMessage = message.replace(/\*\*/g, '').replace(/\*/g, '');
        try {
            if (messageId) {
                await ctx.telegram.editMessageText(ctx.chat.id, messageId, null, plainMessage);
            } else {
                const sent = await ctx.reply(plainMessage);
                return sent.message_id;
            }
        } catch (fallbackError) {
            console.error('Fallback message also failed:', fallbackError.message);
        }
    }
    return messageId;
};

const downloadVideoInfo = async (url, ctx) => {
    try {
        await fs.ensureDir('./temp');

        const platformName = url.includes('tiktok') ? 'TikTok' :
            url.includes('instagram') ? 'Instagram' :
                url.includes('youtube') ? 'YouTube' : 'unknown';

        const progressId = await sendProgressUpdate(ctx, null, 'analyzing',
            `🧙‍♀️ Moss examines the ${platformName} portal's mystical energies...`);

        if (!global.ytDlpInstance) {
            global.ytDlpInstance = new YTDlpWrap();
        }

        let videoInfo;
        if (url.includes('tiktok')) {
            try {
                videoInfo = await Promise.race([
                    global.ytDlpInstance.getVideoInfo(url),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('TikTok timeout')), 30000))
                ]);
            } catch (tiktokError) {
                videoInfo = {
                    title: 'TikTok Video (Limited info)',
                    duration: 'Unknown',
                    uploader: 'TikTok User'
                };
            }
        } else {
            videoInfo = await global.ytDlpInstance.getVideoInfo(url);
        }

        const duration = videoInfo.duration ?
            `${Math.floor(videoInfo.duration / 60)}m ${Math.floor(videoInfo.duration % 60)}s` : 'Unknown duration';

        const platformWarning = url.includes('tiktok') ?
            '\n⚠️ *TikTok portals can be tricky - success not guaranteed!* ⚠️' : '';

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressId,
            null,
            `📜⚡ *Video portal successfully opened!* ⚡📜

🎬 **Mystical Content:** ${videoInfo.title || 'Unknown culinary wisdom'}
⏱️ **Duration:** ${duration}
📺 **Sage Creator:** ${videoInfo.uploader || 'Unknown kitchen master'}${platformWarning}

🤔💭 *Moss has examined the mystical portal...* 💭🤔

🔮 **Shall I capture this video in the physical realm?**
📝 *Reply "yes" to proceed with the ancient ritual*
🚫 *Reply "no" to let the portal fade away*

*The choice is yours, dear cook!* ✨🌿`,
            { parse_mode: 'Markdown' }
        );

        pendingDownloads.set(ctx.from.id, { url, videoInfo, progressId });
        return videoInfo;

    } catch (error) {
        console.error('Video info error:', error);
        const errorMsg = url.includes('tiktok') && error.message.includes('extract') ?
            `🎵⚡ *TikTok's magical defenses are too strong!* ⚡🎵

🌿 This particular TikTok video has powerful anti-magic wards...

🧙‍♀️ *TikTok Portal Complications:*
- Video might be private or region-locked
- TikTok actively blocks video extraction spells
- Some TikTok videos work, others don't
- Success rate varies by video age and privacy

📱 *Moss suggests:*
- Try a different TikTok video
- YouTube and Instagram portals work much better!
- Public TikTok videos have better success rates

*Moss will keep trying different enchantments!* ✨🌱` :
            `🐛⚡ *Moss's mystical vision is clouded!* ⚡🐛

🌿 The video portal resisted the ancient magic... 

*Error whispers:* ${error.message || 'Unknown magical interference detected'}

🧙‍♀️ *Moss will grow stronger and try different spells next time!* 
🔮 *Send another video link to attempt a new ritual!* ✨🌱`;

        ctx.reply(errorMsg, { parse_mode: 'Markdown' });
        return null;
    }
};

const downloadActualVideo = async (url, ctx, videoInfo, progressId) => {
    try {
        const timestamp = Date.now();
        const safeTitle = videoInfo.title?.replace(/[^a-z0-9]/gi, '_').substring(0, 30) || 'video';
        const outputTemplate = `./temp/${safeTitle}_${timestamp}.%(ext)s`;

        // download
        await sendProgressUpdate(ctx, progressId, 'downloading',
            '📁 Capturing mystical video essence and binding audio spirits...');

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

        // find files
        const files = await fs.readdir('./temp');
        const videoFile = files.find(file =>
            file.includes(safeTitle) && file.includes(timestamp.toString()) &&
            (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
        );
        const audioFile = files.find(file =>
            file.includes(safeTitle) && file.includes(timestamp.toString()) &&
            file.endsWith('.mp3')
        );

        if (!videoFile) {
            throw new Error('Download completed but no video file found');
        }

        // set up path
        const videoPath = `./temp/${videoFile}`;
        let audioPath = null;
        if (audioFile) {
            audioPath = `./temp/${audioFile}`;
        }

        // process
        await sendProgressUpdate(ctx, progressId, 'processing',
            '🧠 Moss analyzes the captured essence for hidden culinary wisdom...');

        const results = await intelligentContentExtraction(
            videoPath,
            audioPath,
            ctx,
            videoInfo,
            progressId
        );

        // success
        const videoStats = await fs.stat(videoPath);
        const videoSizeMB = (videoStats.size / (1024 * 1024)).toFixed(1);

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressId,
            null,
            `📜🎉 *Moss has successfully captured the culinary essence!* 🎉📜

📊 **Mystical Results:**
${results.transcript ? '🗣️ Ancient voices deciphered' : '🔇 Silent video - no spoken wisdom detected'}
${results.ocrText ? '👁️ Visual runes and text captured' : '👁️ No text overlays found in the portal'}
${results.structuredRecipe ? '🍳 Recipe successfully extracted and organized!' : '📝 No structured recipe detected in the mystical content'}

📁 **Scroll Storage:** ${videoSizeMB}MB preserved in temporary grimoire
⚠️ *Files will be cleansed from storage in 1 hour* 

🌱 *Moss has completed the ancient ritual!* ✨🌿`,
            { parse_mode: 'Markdown' }
        );

        //  cleanup
        setTimeout(async () => {
            try {
                await fs.remove(videoPath);
                if (audioPath) await fs.remove(audioPath);
                console.log(`🧹 Cleaned up: ${videoFile}`);
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        }, 60 * 60 * 1000);

        return results;

    } catch (error) {
        console.error('Download error:', error);

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressId,
            null,
            `🐛⚡ *The downloading ritual has been disrupted!* ⚡🐛

🌿 *Moss encountered mystical interference...*

*Error whispers:* ${error.message || 'The video spirits are not cooperating today!'}

🧙‍♀️ *Possible causes:*
- Video portal defenses are too strong
- The sacred downloading tools need attention
- Network magical interference
- File too large for current spells

*Moss will study new enchantments and grow stronger!* ✨🌱`,
            { parse_mode: 'Markdown' }
        );
        return null;
    }
};

const intelligentContentExtraction = async (videoPath, audioPath, ctx, videoInfo, progressId) => {
    try {
        // audio
        let transcript = null;
        if (audioPath) {
            transcript = await transcribeAudio(audioPath, ctx, videoInfo, true); // silent mode
        }

        //description
        const descriptionText = extractVideoDescription(videoInfo);

        // ocr
        const contentAnalysis = { transcript, description: descriptionText, videoInfo };
        const ocrText = await smartExtractTextFromVideo(videoPath, ctx, videoInfo, contentAnalysis, true); // silent mode

        // parsing recipe
        await sendProgressUpdate(ctx, progressId, 'parsing',
            '🍳 Organizing culinary wisdom into structured recipe...');

        const textSources = { transcript, description: descriptionText, ocrText };
        const structuredRecipe = await parseRecipe(textSources, ctx, videoInfo, true); // silent mode

        return { transcript, description: descriptionText, ocrText, structuredRecipe };

    } catch (error) {
        console.error('Content extraction error:', error);
        throw error;
    }
};

const handleDownloadConfirmation = async (ctx, userMessage) => {
    const userId = ctx.from.id;
    const pending = pendingDownloads.get(userId);
    if (!pending) return false;

    const confirmWords = ['yes', 'y', 'ok', 'download'];
    const cancelWords = ['no', 'n', 'cancel', 'stop'];
    const lowerMessage = userMessage.toLowerCase().trim();

    if (confirmWords.some(word => lowerMessage.includes(word))) {
        pendingDownloads.delete(userId);

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            pending.progressId,
            null,
            `🔮⚡ *Moss prepares the downloading ritual!* ⚡🔮

🧙‍♀️ *Your wish is my command, dear cook!*
📜 *Beginning the sacred video capture...*

*Ancient magic is flowing...* 🌿⚡`,
            { parse_mode: 'Markdown' }
        );

        await downloadActualVideo(pending.url, ctx, pending.videoInfo, pending.progressId);
        return true;
    } else if (cancelWords.some(word => lowerMessage.includes(word))) {
        pendingDownloads.delete(userId);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            pending.progressId,
            null,
            `🌿✨ *Moss nods understandingly* ✨🌿

🧙‍♀️ *No worries, dear cook! The video portal remains open in the ether.*
📜 *Send another video link anytime you\'re ready for downloading magic!*

*Moss returns to tending the grimoire...* 🍄📚`,
            { parse_mode: 'Markdown' }
        );
        return true;
    }
    return false;
};

const extractVideoDescription = (videoInfo) => {
    const description = videoInfo.description || '';
    const title = videoInfo.title || '';

    let descriptionText = '';
    if (title) descriptionText += `TITLE: ${title}\n`;
    if (description && description.length > 10) {
        descriptionText += `DESCRIPTION: ${description}\n`;
    }

    return descriptionText.trim();
};

module.exports = {
    downloadVideoInfo,
    downloadActualVideo,
    handleDownloadConfirmation,
    processDownloadQueue: async () => {
        if (isDownloading || downloadQueue.length === 0) return;
        isDownloading = true;
        const { url, ctx } = downloadQueue.shift();
        try {
            await downloadVideoInfo(url, ctx);
        } finally {
            isDownloading = false;
            if (downloadQueue.length > 0) {
                setTimeout(processDownloadQueue, 1000);
            }
        }
    },
    isDownloading: () => isDownloading,
    addToQueue: (item) => downloadQueue.push(item),
    getQueueLength: () => downloadQueue.length
};