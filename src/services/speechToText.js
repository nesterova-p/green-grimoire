const OpenAI = require('openai');
const fs = require('fs-extra');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const transcribeAudio = async (audioPath, ctx, videoInfo, silent = false) => {
    try {
        if (!await fs.pathExists(audioPath)) {
            throw new Error('Audio file not found for transcription');
        }

        if (!silent) {
            const audioStats = await fs.stat(audioPath);
            const audioSizeMB = (audioStats.size / (1024 * 1024)).toFixed(2);

            ctx.reply(`🗣️ **Transcribing Audio** 🗣️

🔮 Processing ${audioSizeMB}MB of audio...
⏳ This may take a moment...

*Converting speech to text...* 🌿`,
                { parse_mode: 'Markdown' });
        }

        const audioStream = fs.createReadStream(audioPath);

        const transcription = await openai.audio.transcriptions.create({
            file: audioStream,
            model: 'whisper-1',
            response_format: 'text',
            temperature: 0.2,
            prompt: "This is a cooking video with recipe instructions, ingredients, and cooking techniques."
        });

        const transcript = transcription.trim();

        if (transcript && transcript.length > 10) {
            if (!silent) {
                const wordCount = transcript.split(' ').length;

                ctx.reply(`✅ **Speech Transcribed** ✅

🗣️ **Content Preview:**
"${transcript.substring(0, 200)}${transcript.length > 200 ? '...' : ''}"

📊 **Stats:** ${wordCount} words captured
🌱 *Speech analysis complete!*`,
                    { parse_mode: 'Markdown' });
            }

            return transcript;
        } else {
            if (!silent) {
                ctx.reply(`🔇 **No Speech Detected** 🔇

Video contains:
- Background music only
- No narration
- Very quiet audio

*This is normal for many cooking videos!* 🌿`,
                    { parse_mode: 'Markdown' });
            }
            return null;
        }

    } catch (error) {
        console.error('Speech transcription error:', error);

        if (!silent) {
            let errorMessage = `🐛 **Transcription Failed** 🐛\n\n`;

        if (error.message.includes('API key')) {
            errorMessage += `🔑 *OpenAI API Key Issue:*
- API key might be missing or invalid
- Check OPENAI_API_KEY in environment settings
- Verify API key has transcription permissions`;
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorMessage += `💰 *API Usage Limit Reached:*
- OpenAI free credits may be exhausted
- Check usage at platform.openai.com
- Transcription magic temporarily unavailable`;
        } else if (error.message.includes('file') || error.message.includes('format')) {
            errorMessage += `📁 *Audio File Issue:*
- Audio file may be corrupted
- Unsupported audio format
- File too large for transcription API`;
        } else {
            errorMessage += `🌿 *Unknown transcription interference:*
${error.message || 'The speech spirits are not cooperating today!'}`;
        }

            errorMessage += `\n\n🌿 *Other content sources will be used instead.*`;
            ctx.reply(errorMessage, { parse_mode: 'Markdown' });
        }

        return null;
    }
};

module.exports = {
    transcribeAudio
};