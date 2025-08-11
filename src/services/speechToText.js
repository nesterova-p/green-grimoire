const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const transcribeAudio = async (audioPath, ctx, videoInfo) => {
    try {
        if (!await fs.pathExists(audioPath)) {
            throw new Error('Audio file not found for transcription');
        }

        const audioStats = await fs.stat(audioPath);
        const audioSizeMB = (audioStats.size / (1024 * 1024)).toFixed(2);
        const estimatedDuration = Math.round(audioStats.size / (24000));

        ctx.reply(`🗣️✨ *Moss begins deciphering the mystical voices...* ✨🗣️

🔮 *Listening to ${audioSizeMB}MB of ancient cooking wisdom...*
⏱️ *Estimated duration: ~${estimatedDuration} seconds*
📝 *Translating speech into sacred text...*
⏳ *This spell requires deep concentration...*

*Ancient transcription magic is flowing...* 🌿📜`,
            { parse_mode: 'Markdown' });

        const audioStream = fs.createReadStream(audioPath);

        const transcription = await openai.audio.transcriptions.create({
            file: audioStream,
            model: 'whisper-1',
            response_format: 'text',
            temperature: 0.2, // lower for more accurate transcription
            prompt: "This is a cooking video with recipe instructions, ingredients, and cooking techniques."
        });

        const transcript = transcription.trim();

        if (transcript && transcript.length > 10) {
            const wordCount = transcript.split(' ').length;

            ctx.reply(`📜✨ *The voices have been decoded!* ✨📜

🗣️ **Recipe Transcription:**
"${transcript}"

📊 **Transcription Stats:**
- Words captured: ${wordCount}
- Audio size: ${audioSizeMB}MB
- Video: ${videoInfo.title}

🌱 *Moss has captured the spoken culinary secrets!*
🧙‍♀️ *The chef's wisdom is now preserved in text form!*
📝 *Ready for recipe parsing magic!*

*Ancient knowledge successfully transcribed!* ✨🌿`,
                { parse_mode: 'Markdown' });

            return transcript;

        } else {
            ctx.reply(`🔇✨ *The voices are silent in this mystical portal...* ✨🔇

🌿 *Moss detects:*
- Video may have no spoken words
- Background music only
- Very quiet audio
- Non-speech content

🧙‍♀️ *Not all cooking videos contain spoken recipes!*
📹 *The video file is still safely captured for visual reference.*

*Sometimes the magic is in watching, not listening!* ✨🌱`,
                { parse_mode: 'Markdown' });

            return null;
        }

    } catch (error) {
        console.error('Speech transcription error:', error);

        let errorMessage = `🐛🗣️ *The transcription ritual encountered resistance!* 🗣️🐛\n\n`;

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

        errorMessage += `\n\n🎬 *The video and audio files are still safely captured!*
🧙‍♀️ *Moss will grow stronger with each attempt!* ✨🌱`;

        ctx.reply(errorMessage);
        return null;
    }
};

module.exports = {
    transcribeAudio
};