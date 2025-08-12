const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const smartExtractTextFromVideo = async (videoPath, ctx, videoInfo, contentAnalysis, silent = false) => {
    try {
        const ocrDecision = shouldRunEnhancedOCR(contentAnalysis, videoInfo);

        if (!ocrDecision.shouldRun) {
            if (!silent) {
                ctx.reply(`⚡ **OCR Skipped** ⚡

🧠 ${ocrDecision.reason}
✅ Using: ${ocrDecision.availableContent.join(', ')}

🌿 Being efficient! ✨`);
            }
            return null;
        }

        if (!silent) {
            ctx.reply(`👁️ **Visual Text Extraction** 👁️

🎯 Strategy: ${ocrDecision.strategy}
🔍 Analyzing frames for text overlays...

🌿 *Processing...* 📜`);
        }

        const frames = await extractAdaptiveFrames(videoPath, videoInfo, ocrDecision.strategy);

        if (frames.length === 0) {
            if (!silent) {
                ctx.reply(`🖼️ **No Text Found** 🖼️

No readable text overlays detected.
🌿 Audio and description will provide recipe content!`);
            }
            return null;
        }

        const extractedText = await processFramesWithEnhancedOCR(frames, ctx, silent);
        await cleanupFrames(frames);

        return extractedText;

    } catch (error) {
        console.error('Enhanced OCR error:', error);
        if (!silent) {
            ctx.reply(`🐛 **OCR Error** 🐛

${error.message}

🌿 Using other content sources instead...`);
        }
        return null;
    }
};

const shouldRunEnhancedOCR = (contentAnalysis, videoInfo) => {
    const { transcript, description } = contentAnalysis;
    
    const transcriptScore = getContentQuality(transcript);
    const descriptionScore = getContentQuality(description);

    const availableContent = [];
    if (transcriptScore > 0) availableContent.push(`Speech(${transcriptScore}%)`);
    if (descriptionScore > 0) availableContent.push(`Desc(${descriptionScore}%)`);

    const isVisualVideo = detectVisualVideo(videoInfo);
    const isShortForm = videoInfo.duration && videoInfo.duration < 300; // 5 minutes

    if (transcriptScore >= 85 && transcript && transcript.length > 800) {
        return {
            shouldRun: false,
            reason: "Excellent detailed narration detected",
            availableContent,
            timeSaved: "30s"
        };
    }

    // Almost always run 
    if (isVisualVideo || isShortForm) {
        return {
            shouldRun: true,
            reason: "Visual-style video - likely has text overlays",
            strategy: "dense_sampling",
            frameCount: "every 2-3 seconds",
            sampling: "High density",
            availableContent,
            timeSaved: "0s"
        };
    }

    // defin needs OCR
    if (transcriptScore < 30 && descriptionScore < 30) {
        return {
            shouldRun: true,
            reason: "Minimal audio/description content",
            strategy: "comprehensive",
            frameCount: "every 3-4 seconds",
            sampling: "Comprehensive",
            availableContent,
            timeSaved: "0s"
        };
    }

    // more aggressive than before
    if (transcriptScore < 60 || descriptionScore < 40) {
        return {
            shouldRun: true,
            reason: "Moderate content - OCR will enhance",
            strategy: "selective",
            frameCount: "every 4-5 seconds",
            sampling: "Selective",
            availableContent,
            timeSaved: "0s"
        };
    }

    // for most videos
    return {
        shouldRun: true,
        reason: "Standard video - visual text extraction",
        strategy: "standard",
        frameCount: "every 5-6 seconds",
        sampling: "Standard",
        availableContent,
        timeSaved: "0s"
    };
};

const getContentQuality = (content) => {
    if (!content || content.length < 10) return 0;

    let score = 0;

    // Length factor (0-30 points)
    score += Math.min(30, content.length / 15);

    // Word density and structure (0-25 points)
    const words = content.split(/\s+/).filter(word => word.length > 1);
    const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length || 0;

    score += Math.min(15, words.length / 3); // Word count
    score += Math.min(10, averageWordLength * 2); // Word quality

    // Numbers and measurements (0-20 points) - Universal indicators
    const numbers = content.match(/\d+/g) || [];
    const measurements = content.match(/\d+\s*(?:ml|l|g|kg|oz|lb|cup|tsp|tbsp|°|min|sec|cm|mm)/gi) || [];

    score += Math.min(10, numbers.length * 2);
    score += Math.min(10, measurements.length * 5);

    // Sentence structure (0-15 points)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
    score += Math.min(15, sentences.length * 2);

    // Special characters indicating structure (0-10 points)
    const structureChars = content.match(/[:;,()-]/g) || [];
    score += Math.min(10, structureChars.length / 2);

    return Math.min(100, Math.round(score));
};

const detectVisualVideo = (videoInfo) => {
    const title = (videoInfo.title || '').toLowerCase();
    const duration = videoInfo.duration || 0;

    // Platform-based detection
    const isFromVisualPlatform = videoInfo.extractor &&
        ['tiktok', 'instagram', 'youtube_shorts'].some(platform =>
            videoInfo.extractor.toLowerCase().includes(platform)
        );

    // short videos are typically visual
    const isShortDuration = duration > 0 && duration < 180; // 3 min

    // title indicators
    const hasVisualIndicators = title.includes('recipe') ||
        title.includes('cooking') ||
        title.includes('how to') ||
        /\d+\s*(min|sec|minute|second)/.test(title);

    return isFromVisualPlatform || isShortDuration || hasVisualIndicators;
};

const extractAdaptiveFrames = async (videoPath, videoInfo, strategy) => {
    const duration = videoInfo.duration || 60;
    let samplingInterval;
    let maxFrames;

    switch (strategy) {
        case 'dense_sampling':
            samplingInterval = 2; // 2 sec
            maxFrames = Math.min(30, Math.floor(duration / 2));
            break;

        case 'comprehensive':
            samplingInterval = 3; // 3 sec
            maxFrames = Math.min(25, Math.floor(duration / 3));
            break;

        case 'selective':
            samplingInterval = 4; // 4 sec
            maxFrames = Math.min(20, Math.floor(duration / 4));
            break;

        default: // 'standard'
            samplingInterval = 5; // 5 sec
            maxFrames = Math.min(15, Math.floor(duration / 5));
    }

    const timePoints = [];
    for (let time = 5; time < duration - 5; time += samplingInterval) {
        timePoints.push(time);
        if (timePoints.length >= maxFrames) break;
    }

    console.log(`Extracting ${timePoints.length} frames every ${samplingInterval}s from ${duration}s video`);

    return await extractFramesAtTimepoints(videoPath, timePoints);
};

const extractFramesAtTimepoints = async (videoPath, timePoints) => {
    const frames = [];
    const tempDir = './temp';

    await fs.ensureDir(tempDir);

    const extractPromises = timePoints.map(async (timePoint, index) => {
        const outputPath = path.join(tempDir, `frame_${Date.now()}_${index}.png`);

        try {
            await extractSingleFrame(videoPath, timePoint, outputPath);
            return outputPath;
        } catch (error) {
            console.log(`Failed to extract frame at ${timePoint}s:`, error.message);
            return null;
        }
    });

    const results = await Promise.all(extractPromises);
    return results.filter(path => path !== null);
};

const extractSingleFrame = async (videoPath, timePoint, outputPath) => {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-ss', timePoint.toString(),
            '-vframes', '1',
            '-q:v', '1', // Highest quality
            '-vf', [
                'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2',
                'unsharp=5:5:1.0:5:5:0.0', // sharpen text
                'eq=contrast=1.2:brightness=0.1'
            ].join(','),
            '-y',
            outputPath
        ]);

        let completed = false;

        ffmpeg.on('close', (code) => {
            if (!completed) {
                completed = true;
                if (code === 0 && fs.existsSync(outputPath)) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg failed with code ${code}`));
                }
            }
        });

        ffmpeg.on('error', (error) => {
            if (!completed) {
                completed = true;
                reject(error);
            }
        });

        // timeout
        setTimeout(() => {
            if (!completed) {
                completed = true;
                ffmpeg.kill('SIGKILL');
                reject(new Error('Frame extraction timeout'));
            }
        }, 12000);
    });
};

const processFramesWithEnhancedOCR = async (frames, ctx, silent = false) => {
    const extractedTexts = [];
    const uniqueTexts = new Set();
    let successCount = 0;

    const batchSize = 5;
    for (let i = 0; i < frames.length; i += batchSize) {
        const batch = frames.slice(i, i + batchSize);

        if (!silent && frames.length > 10) {
            ctx.reply(`🔍 Processing frames ${i + 1}-${Math.min(i + batchSize, frames.length)} of ${frames.length}...`);
        }

        for (const framePath of batch) {
            try {
                const result = await performEnhancedOCR(framePath);

                if (result.text && result.text.length > 15 && result.confidence > 30) {
                    const isUnique = !Array.from(uniqueTexts).some(existingText =>
                        textSimilarity(existingText, result.text) > 0.8
                    );

                    if (isUnique) {
                        extractedTexts.push(result.text);
                        uniqueTexts.add(result.text);
                        successCount++;
                    }
                }
            } catch (error) {
                console.log(`OCR failed for frame:`, error.message);
            }

            try {
                await fs.remove(framePath);
            } catch (cleanupError) {
                // silent cleanup failure
            }
        }
    }

    if (extractedTexts.length > 0) {
        const combinedText = extractedTexts.join('\n\n').trim();

        if (!silent) {
            ctx.reply(`✅ **Text Extracted** ✅

📊 Found: ${successCount} unique text blocks from ${frames.length} frames
📝 Total: ${combinedText.length} characters
🎯 Success: ${Math.round((successCount / frames.length) * 100)}%

✨ Visual content captured! 🌿`);
        }

        return combinedText;
    } else {
        if (!silent) {
            ctx.reply(`❌ **No readable text found in ${frames.length} frames**

🤔 Video uses audio/visual instruction without text overlays.
🌿 Other content sources will provide the recipe!`);
        }
        return null;
    }
};

const performEnhancedOCR = async (imagePath) => {
    const strategies = [
        {
            options: ['-l', 'eng+rus+pol+ukr+deu+fra+spa', '--psm', '6', '--oem', '3'],
            description: 'Standard multi-language'
        },
        {
            options: ['-l', 'eng+rus+pol+ukr+deu+fra+spa', '--psm', '8', '--oem', '3'],
            description: 'Single text block'
        },
        {
            options: ['-l', 'eng+rus+pol+ukr+deu+fra+spa', '--psm', '13', '--oem', '3'],
            description: 'Single word mode'
        },
        {
            options: ['-l', 'eng+rus+pol+ukr+deu+fra+spa', '--psm', '11', '--oem', '3'],
            description: 'Sparse text'
        }
    ];

    let bestResult = { text: '', confidence: 0, strategy: '' };

    for (const strategy of strategies) {
        try {
            const result = await performOCRWithOptions(imagePath, strategy.options);
            if (result.confidence > bestResult.confidence && result.text.length > 10) {
                bestResult = { ...result, strategy: strategy.description };
            }
        } catch (error) {
            continue;
        }
    }

    return bestResult;
};

const performOCRWithOptions = async (imagePath, options) => {
    return new Promise((resolve) => {
        const tesseract = spawn('tesseract', [
            imagePath,
            'stdout',
            ...options,
            '-c', 'tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюяĄĆĘŁŃÓŚŹŻąćęłńóśźżÄÖÜßäöüéèêëîïôûùúÇçñ .,!?:;()-/\'\"°%',
            '-c', 'tessedit_unrej_any_wd=1'
        ]);

        let ocrOutput = '';
        let completed = false;

        tesseract.stdout.on('data', (data) => {
            ocrOutput += data.toString();
        });

        tesseract.on('close', (code) => {
            if (!completed) {
                completed = true;
                if (code === 0) {
                    const cleanText = cleanOCRText(ocrOutput);
                    const confidence = calculateAdvancedConfidence(cleanText);
                    resolve({ text: cleanText, confidence });
                } else {
                    resolve({ text: '', confidence: 0 });
                }
            }
        });

        tesseract.on('error', () => {
            if (!completed) {
                completed = true;
                resolve({ text: '', confidence: 0 });
            }
        });

        setTimeout(() => {
            if (!completed) {
                completed = true;
                tesseract.kill('SIGKILL');
                resolve({ text: '', confidence: 0 });
            }
        }, 15000);
    });
};

const cleanOCRText = (text) => {
    return text
        // remove weird chars
        .replace(/[^\w\s\.,!?:;()-\/\'\"°%А-Яа-яĄĆĘŁŃÓŚŹŻąćęłńóśźżÄÖÜßäöüéèêëîïôûùúÇçñ]/g, '')
        // normal whitespaces
        .replace(/\s+/g, ' ')
        // single chars
        .replace(/\b[a-zA-ZА-Яа-я]\b/g, '')
        .replace(/[.,!?]{2,}/g, '.')
        .trim();
};

const calculateAdvancedConfidence = (text) => {
    if (!text || text.length < 5) return 0;

    let confidence = 0;
    confidence += Math.min(20, text.length / 5);

    const words = text.split(' ').filter(word => word.length > 2);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length || 0;
    confidence += Math.min(15, words.length * 1.5);
    confidence += Math.min(10, avgWordLength * 2);

    const numbers = (text.match(/\d+/g) || []).length;
    const measurements = (text.match(/\d+\s*(?:ml|l|g|kg|oz|lb|cup|tsp|tbsp|°|min|sec|г|мл|л|кг|мин|сек)/gi) || []).length;
    confidence += Math.min(15, numbers * 2);
    confidence += Math.min(10, measurements * 5);

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    confidence += Math.min(20, sentences.length * 3);

    const hasCoherentWords = words.filter(word => word.length > 3).length;
    confidence += Math.min(10, hasCoherentWords);

    return Math.min(100, Math.round(confidence));
};

const textSimilarity = (text1, text2) => {
    if (!text1 || !text2) return 0;

    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
};

const cleanupFrames = async (frames) => {
    for (const framePath of frames) {
        try {
            await fs.remove(framePath);
        } catch (error) {
        }
    }
};

module.exports = {
    smartExtractTextFromVideo
};