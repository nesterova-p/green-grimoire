const { detectedVideoLink } = require('../services/platformDetection');
const {
    downloadVideoInfo,
    handleDownloadConfirmation,
    processDownloadQueue,
    isDownloading,
    addToQueue,
    getQueueLength
} = require('../services/videoDownload');

const textHandler = async (ctx) => {
    const userMessage = ctx.message.text;

    if (userMessage.startsWith('/')) {
        return;
    }

    // Check for download confirmation first
    const handledConfirmation = await handleDownloadConfirmation(ctx, userMessage);
    if (handledConfirmation) return;

    // Check for video links
    if (detectedVideoLink(userMessage)) {
        const urlMatch = userMessage.match(/(https?:\/\/[^\s]+)/);
        const url = urlMatch ? urlMatch[0] : '';

        if (isDownloading()) {
            addToQueue({ url, ctx });
            ctx.reply(`🕰️✨ *Moss is busy with another portal...* ✨🕰️

🌿 *Your request has been added to the mystical queue!*
📜 *Position in line: ${getQueueLength()}*

*Please be patient while I finish the current ritual...* 🧙‍♀️⚡`,
                { parse_mode: 'Markdown' });
            return;
        }

        await downloadVideoInfo(url, ctx);
        setTimeout(processDownloadQueue, 5000);
        return;
    }

    // Regular sage responses
    const sageResponses = [
        `🌿 *Moss nods thoughtfully* "${userMessage}" - I sense wisdom in your words, dear cook...`,
        `📜 *scribbles in grimoire* Your message "${userMessage}" has been recorded in the ancient scrolls!`,
        `✨ *Moss's eyes glow* Fascinating! "${userMessage}" - this knowledge shall help future recipes!`,
        `🍄 *rustles through herb pouches* "${userMessage}" - reminds me of an old kitchen tale...`,
        `🌱 *Moss smiles warmly* I hear you say "${userMessage}" - tell me more of your culinary adventures!`
    ];

    const randomResponse = sageResponses[Math.floor(Math.random() * sageResponses.length)];
    ctx.reply(randomResponse, { parse_mode: 'Markdown' });
};

module.exports = textHandler;