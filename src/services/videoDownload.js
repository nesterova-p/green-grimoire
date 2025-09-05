const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');
const { getPlatformSpecificOptions } = require('./platformDetection');
const { transcribeAudio } = require('./speechToText');
const { parseRecipe } = require('./recipeParser');
const { smartExtractTextFromVideo } = require('./smartTextExtraction');
const { getPlatformSpecificOptionsWithFallback } = require('./platformDetection');
let isDownloading = false;
const downloadQueue = [];
const pendingDownloads = new Map();
const { spawn } = require('child_process');

// Helper function to escape markdown characters
const escapeMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\(')
        .replace(/\)/g, '\)')
        .replace(/~/g, '\\~')
        .replace(/`/g, '\\`')
        .replace(/>/g, '\\>')
        .replace(/#/g, '\\#')
        .replace(/\+/g, '\\+')
        .replace(/-/g, '\\-')
        .replace(/=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\./g, '\.')
        .replace(/!/g, '\\!');
};

// buttons
const createDownloadConfirmationButtons = (videoInfo) => {
    return {
        reply_markup:{
            inline_keyboard:[
                [
                    { text: '✅ Yes, Download!', callback_data: 'download_confirm' },
                    { text: '❌ No, Cancel', callback_data: 'download_cancel' }
                ],
                [
                    { text: '📋 Video Info Only', callback_data: 'info_only' }
                ]
            ]
        }
    };
};

// single message that gets edited
const sendProgressUpdate = async (ctx, messageId, status, details = '') => {
    const progressSteps = {
        'analyzing': '🔮✨ Moss peers through the mystical portal... ✨🔮',
        'downloading': '🧙‍♀️⚡ Channeling ancient downloading spells... ⚡🧙‍♀️',
        'extracting': '🎵📜 Binding video essence and mystical voices... 📜🎵',
        'processing': '🧠🌿 Moss analyzes the captured culinary wisdom... 🌿🧠',
        'parsing': '🍳✨ Organizing ancient kitchen knowledge into sacred scrolls... ✨🍳'
    };

    const cleanDetails = details ? escapeMarkdown(details) : '';

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
        const plainMessage = message.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\\/g, '');
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

        if (url.includes('youtube')) {
            try {
                const infoOptions = [
                    '--dump-json',
                    '--no-download',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                ];

                videoInfo = await Promise.race([
                    global.ytDlpInstance.execPromise([url, ...infoOptions]).then(stdout => {
                        try {
                            return JSON.parse(stdout);
                        } catch (e) {
                            // If JSON parsing fails, create basic info
                            return {
                                title: 'YouTube Video',
                                duration: null,
                                uploader: 'YouTube User',
                                webpage_url: url
                            };
                        }
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('YouTube info timeout')), 30000))
                ]);
            } catch (youtubeError) {
                console.log('YouTube info extraction failed:', youtubeError.message);
                videoInfo = {
                    title: 'YouTube Video (Limited info)',
                    duration: null,
                    uploader: 'YouTube User',
                    webpage_url: url
                };
            }
        } else if (url.includes('tiktok')) {
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

        const videoTitle = escapeMarkdown(videoInfo.title || 'Unknown culinary wisdom');
        const videoUploader = escapeMarkdown(videoInfo.uploader || 'Unknown kitchen master');

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressId,
            null,
            `📜⚡ *Video portal successfully opened!* ⚡📜

🎬 **Mystical Content:** ${videoTitle}
⏱️ **Duration:** ${duration}
📺 **Sage Creator:** ${videoUploader}${platformWarning}

🤔💭 *Moss has examined the mystical portal...* 💭🤔

🔮 **Shall I capture this video in the physical realm?**

*The choice is yours, dear cook!* ✨🌿`,
            { parse_mode: 'Markdown',
                ...createDownloadConfirmationButtons(videoInfo),
            }
        );

        pendingDownloads.set(ctx.from.id, { url, videoInfo, progressId });
        return videoInfo;

    } catch (error) {
        console.error('Video info error:', error);
        const errorMessage = escapeMarkdown(error.message || 'Unknown magical interference detected');

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

*Error details:* ${errorMessage}

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
        const { getPlatformSpecificOptionsWithFallback } = require('./platformDetection');

        let downloadSuccess = false;
        let downloadError = null;
        let attemptNumber = 1;
        const maxAttempts = 4;

        // Determine platform for better error messages
        const platform = url.includes('instagram') ? 'Instagram' :
            url.includes('tiktok') ? 'TikTok' :
                url.includes('youtube') ? 'YouTube' : 'Unknown';

        while (!downloadSuccess && attemptNumber <= maxAttempts) {
            try {
                await sendProgressUpdate(ctx, progressId, 'downloading',
                    `📁 Capturing ${platform} video essence... (Attempt ${attemptNumber}/${maxAttempts})`);

                const downloadOptions = [
                    ...getPlatformSpecificOptionsWithFallback(url, attemptNumber),
                    '--output', outputTemplate,
                    '--no-playlist',
                    '--extract-audio',
                    '--audio-format', 'mp3',
                    '--audio-quality', '192K',
                    '--keep-video'
                ];

                console.log(`🔄 Download attempt ${attemptNumber} with options:`, downloadOptions.slice(0, 5));

                await global.ytDlpInstance.execPromise([url, ...downloadOptions]);

                const files = await fs.readdir('./temp');
                const videoFile = files.find(file =>
                    file.includes(safeTitle) && file.includes(timestamp.toString()) &&
                    (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
                );

                if (videoFile) {
                    const videoPath = `./temp/${videoFile}`;
                    const isValid = await validateVideoFile(videoPath);

                    if (isValid) {
                        downloadSuccess = true;
                        console.log(`✅ Download successful and validated on attempt ${attemptNumber}`);
                    } else {
                        console.log(`❌ Downloaded file is corrupted on attempt ${attemptNumber}`);
                        try {
                            await fs.remove(videoPath);
                        } catch (e) {}
                        if (attemptNumber < maxAttempts) {
                            await sendProgressUpdate(ctx, progressId, 'downloading',
                                `🔄 File corrupted, trying different approach... (${attemptNumber + 1}/${maxAttempts})`);
                            attemptNumber++;
                            continue;
                        } else {
                            throw new Error('All download attempts resulted in corrupted video files');
                        }
                    }
                } else {
                    throw new Error('No video file found after download');
                }

            } catch (error) {
                downloadError = error;
                console.log(`❌ Download attempt ${attemptNumber} failed: 
Error code: ${error.message}

Stderr:
${error.stderr || 'No additional error info'}`);

                // Check if this is a format-related error that we can retry
                const isRetryableError = error.message.includes('Requested format is not available') ||
                    error.message.includes('No video formats found') ||
                    error.message.includes('corrupted video files') ||
                    error.message.includes('format not found') ||
                    error.message.includes('Unable to extract');

                if (isRetryableError && attemptNumber < maxAttempts) {
                    console.log(`🔄 Trying different download strategy...`);
                    await sendProgressUpdate(ctx, progressId, 'downloading',
                        `🔄 ${platform} format issue detected, trying alternative method... (${attemptNumber + 1}/${maxAttempts})`);
                    attemptNumber++;
                    continue;
                } else {
                    // For non-retryable errors or when we've exhausted retries
                    if (attemptNumber >= maxAttempts) {
                        throw new Error(createDetailedErrorMessage(url, error, platform, attemptNumber));
                    } else {
                        throw error;
                    }
                }
            }
        }

        // If we get here, download was successful
        const files = await fs.readdir('./temp');
        const videoFile = files.find(file =>
            file.includes(safeTitle) && file.includes(timestamp.toString()) &&
            (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
        );
        const audioFile = files.find(file =>
            file.includes(safeTitle) && file.includes(timestamp.toString()) &&
            file.endsWith('.mp3')
        );

        const videoPath = `./temp/${videoFile}`;
        let audioPath = null;
        if (audioFile) {
            audioPath = `./temp/${audioFile}`;
        }

        await sendProgressUpdate(ctx, progressId, 'uploading',
            '🎬 Delivering your validated video...');

        const videoMessageInfo = await sendVideoToUser(ctx, videoPath, videoInfo, progressId);

        await sendProgressUpdate(ctx, progressId, 'processing',
            '🧠 Now analyzing the video content for recipe extraction...');

        const results = await intelligentContentExtraction(
            videoPath,
            audioPath,
            ctx,
            videoInfo,
            progressId,
            videoMessageInfo
        );

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressId,
            null,
            `✅ **Complete Recipe Package Delivered!** ✅

🎬 **Original video sent** ← Watch for visual cues
📝 **Recipe extracted above** ← Follow step-by-step instructions  
💾 **Both saved in your chat** ← Permanent cooking reference

🌿 *Perfect combo: Watch the video while following the recipe!* ✨

⚠️ *Files will be cleaned from bot storage in 1 hour*`,
            { parse_mode: 'Markdown' }
        );

        // Cleanup after 1 hour
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

        const errorMessage = escapeMarkdown(error.message || 'The video spirits are not cooperating today!');

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressId,
            null,
            getPlatformSpecificErrorMessage(url, error, errorMessage),
            { parse_mode: 'Markdown' }
        );
        return null;
    }
};

const createDetailedErrorMessage = (url, error, platform, attempts) => {
    const baseError = error.message || 'Unknown error';

    if (url.includes('instagram')) {
        if (baseError.includes('Requested format is not available')) {
            return `Instagram Reels download failed after ${attempts} attempts. Instagram frequently changes their video formats and may be blocking automated access. Try again in a few minutes, or the video may be private/restricted.`;
        } else if (baseError.includes('Private video')) {
            return `This Instagram Reel is private or restricted. Only public Instagram videos can be downloaded.`;
        } else if (baseError.includes('Unable to extract')) {
            return `Instagram is currently blocking video extraction for this Reel. This is common and usually temporary - try again in 10-15 minutes.`;
        }
        return `Instagram Reels download failed after ${attempts} attempts. Instagram actively prevents video downloads. Try again later or use a different video.`;
    } else if (url.includes('tiktok')) {
        return `TikTok download failed after ${attempts} attempts. TikTok has strong anti-bot measures. Try a different TikTok video or try again later.`;
    } else if (url.includes('youtube')) {
        if (baseError.includes('corrupted video files') || baseError.includes('protected')) {
            return `YouTube detected automated access and sent corrupted video after ${attempts} attempts. Wait 10-15 minutes and try the exact same link again.`;
        }
        return `YouTube download failed after ${attempts} attempts. Try again in a few minutes or use a different video.`;
    }

    return `Video download failed after ${attempts} attempts: ${baseError}`;
};

const getPlatformSpecificErrorMessage = (url, error, escapedErrorMessage) => {
    if (url.includes('instagram')) {
        if (error.message.includes('Requested format is not available') ||
            error.message.includes('Instagram')) {
            return `📸⚡ *Instagram Reels Portal Complications!* ⚡📸

🌿 Instagram has strengthened their magical defenses against video capture...

📱 **Instagram-Specific Issues:**
- Instagram actively blocks video downloading bots
- Reels formats change frequently 
- Some videos are private or region-restricted
- Success varies by video age and privacy settings

💡 **What usually works:**
- **Wait 10-15 minutes** and try the exact same link again
- Try a **different Instagram Reel** from the same creator
- **Public Instagram videos** work better than private ones
- **Older Reels** sometimes work better than brand new ones

🔄 **Alternative approach:**
- Try copying a different Instagram Reel link
- YouTube and TikTok often work more reliably
- Recipe content is often cross-posted on multiple platforms

*Instagram's anti-magic wards are particularly strong today!* 🛡️✨

🧙‍♀️ *Moss will keep evolving his Instagram portal spells!*`;
        }
    } else if (url.includes('tiktok')) {
        return `🎵⚡ *TikTok's magical defenses are too strong!* ⚡🎵

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

*Moss will keep trying different enchantments!* ✨🌱`;
    } else if (url.includes('youtube')) {
        if (error.message.includes('corrupted video files') || error.message.includes('protected')) {
            return `🎥 **YouTube Format Issue - Common & Fixable!** 🎥

🌿 YouTube detected automated access and sent corrupted video...

🎥 **YouTube Quality Issue:**
- YouTube detected automated access and sent corrupted video
- This specific video may have enhanced protection
- YouTube Shorts are particularly prone to this issue

💡 **What to try:**
- **Wait 10-15 minutes** and try the exact same link again
- Try a different YouTube Short or regular YouTube video
- Some videos work better at different times of day
- The same video often works if you try again later

🔄 **Why this happens:**
- YouTube's anti-bot measures cause this
- Different videos from the same creator usually work
- Regular YouTube videos often work more reliably than Shorts

*Try again in 10-15 minutes with the same link!* ✨🌱`;
        }
    }

    return `🐛⚡ *The downloading ritual encountered complications!* ⚡🐛

🌿 *Moss detected an issue with the video portal...*

*Error details:* ${escapedErrorMessage}

🧙‍♀️ *The good news:* This is usually temporary!
- Video platforms frequently update their defenses
- The same video often works if you try again later
- Different videos from the same creator usually work

*Try again in 10-15 minutes or try a different video!* ✨🌱`;
};

const validateVideoFile = async (videoPath) => {
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            videoPath
        ]);

        let output = '';
        let hasVideoStream = false;
        let hasValidDuration = false;

        ffprobe.stdout.on('data', (data) => {
            output += data.toString();
        });

        ffprobe.on('close', (code) => {
            if (code !== 0) {
                console.log('❌ Video validation failed - ffprobe error');
                resolve(false);
                return;
            }

            try {
                const info = JSON.parse(output);
                const videoStreams = info.streams?.filter(stream => stream.codec_type === 'video') || [];
                hasVideoStream = videoStreams.length > 0;
                const duration = parseFloat(info.format?.duration || '0');
                hasValidDuration = duration > 0;
                let hasValidVideo = false;
                if (hasVideoStream) {
                    const videoStream = videoStreams[0];
                    const width = parseInt(videoStream.width) || 0;
                    const height = parseInt(videoStream.height) || 0;
                    hasValidVideo = width > 50 && height > 50;
                }

                const isValid = hasVideoStream && hasValidDuration && hasValidVideo;

                console.log(`🔍 Video validation: streams=${hasVideoStream}, duration=${hasValidDuration}, valid=${hasValidVideo} → ${isValid ? 'VALID' : 'CORRUPTED'}`);

                resolve(isValid);

            } catch (error) {
                console.log('❌ Video validation failed - JSON parsing error:', error.message);
                resolve(false);
            }
        });

        ffprobe.on('error', () => {
            console.log('❌ Video validation failed - ffprobe spawn error');
            resolve(false);
        });

        setTimeout(() => {
            ffprobe.kill('SIGKILL');
            console.log('❌ Video validation timed out');
            resolve(false);
        }, 10000);
    });
};

const intelligentContentExtraction = async (videoPath, audioPath, ctx, videoInfo, progressId, videoMessageInfo = null) => {
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
        const structuredRecipe = await parseRecipe(textSources, ctx, videoInfo, true, videoMessageInfo); // silent mode

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
📜 *Send another video link anytime you're ready for downloading magic!*

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

const sendVideoToUser = async (ctx, videoPath, videoInfo, progressId) => {
    try {
        if (!await fs.pathExists(videoPath)) {
            console.log('Video file not found ');
            return { success: false };
        }

        const stats = await fs.stat(videoPath);
        const fileSizeMB = stats.size / (1024 * 1024);

        await sendProgressUpdate(ctx, progressId, 'uploading',
            `📤 Preparing to send original video (${fileSizeMB.toFixed(1)}MB)...`);

        if (fileSizeMB > 50) {
            await ctx.reply(`📱 **Original Video Too Large** 📱

🎬 **Video Size:** ${fileSizeMB.toFixed(1)}MB
⚠️ **Telegram Limit:** 50MB max for bots

📱 **Original video at:** ${videoInfo.original_video_url || videoInfo.webpage_url || 'source platform'}
🔍 **Recipe extraction continues below...**

*Moss will still extract the cooking wisdom for you!* ✨`,
                { parse_mode: 'Markdown' });
            return { success: false };
        }

        const videoTitle = escapeMarkdown(videoInfo.title || 'Cooking Video');
        const duration = videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}m ${Math.floor(videoInfo.duration % 60)}s` : 'Unknown';
        const platform = escapeMarkdown(videoInfo.video_platform || 'Unknown');

        const caption = `🎬 **Original Cooking Video** 🎬

📝 **Title:** ${videoTitle}
⏱️ **Duration:** ${duration}
📱 **Platform:** ${platform}

🔍 *Recipe extraction in progress... Stand by!* ⚡`;

        const sentVideo = await ctx.replyWithVideo(
            { source: videoPath },
            {
                caption: caption,
                parse_mode: 'Markdown',
                duration: videoInfo.duration,
                width: videoInfo.width,
                height: videoInfo.height,
                supports_streaming: true
            }
        );

        console.log(`📤 Video sent successfully: ${fileSizeMB.toFixed(1)}MB`);
        console.log(`📋 Video message ID: ${sentVideo.message_id}, File ID: ${sentVideo.video.file_id}`);
        return {
            success: true,
            messageId: sentVideo.message_id,
            fileId: sentVideo.video.file_id,
            chatId: ctx.chat.id
        };

    } catch (error) {
        console.error('Video sending error:', error);

        if (error.message.includes('file too large')) {
            await ctx.reply(`📱 **Video Upload Failed** 📱

⚠️ File too large for Telegram upload
📱 Access original video at source platform
🔍 **Recipe extraction continues below...**

*Moss will extract the cooking knowledge for you!* ✨`,
                { parse_mode: 'Markdown' });
        } else if (error.message.includes('timeout')) {
            await ctx.reply(`⏰ **Video Upload Timeout** ⏰

🌐 Network too slow for video upload
📱 Try accessing original video at source platform
🔍 **Recipe extraction continues below...**

*The cooking wisdom will still be captured!* ✨`,
                { parse_mode: 'Markdown' });
        } else {
            const errorMessage = escapeMarkdown(error.message || 'Unknown upload interference');
            await ctx.reply(`🐛 **Video Upload Error** 🐛

${errorMessage}
📱 Video may be accessible at source platform
🔍 **Recipe extraction continues below...**

*Moss will still capture the culinary secrets!* ✨`,
                { parse_mode: 'Markdown' });
        }
        return { success: false };
    }
};

module.exports = {
    downloadVideoInfo,
    downloadActualVideo,
    handleDownloadConfirmation,
    sendVideoToUser,
    pendingDownloads,
    processDownloadQueue: async () => {
        if (isDownloading || downloadQueue.length === 0) return;
        isDownloading = true;
        const { url, ctx } = downloadQueue.shift();
        try {
            await downloadVideoInfo(url, ctx);
        } finally {
            isDownloading = false;
            if (downloadQueue.length > 0) {
                setTimeout(() => module.exports.processDownloadQueue(), 1000);
            }
        }
    },
    isDownloading: () => isDownloading,
    addToQueue: (item) => downloadQueue.push(item),
    getQueueLength: () => downloadQueue.length
};