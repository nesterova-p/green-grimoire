// Updated src/handlers/textHandler.js
const { detectedVideoLink } = require('../services/platformDetection');
const {
    downloadVideoInfo,
    handleDownloadConfirmation,
    processDownloadQueue,
    isDownloading,
    addToQueue,
    getQueueLength
} = require('../services/videoDownload');
const { rateRecipe, getRecipeRating } = require('../database/ratingService');
const { handleCustomScalingInput } = require('./scaleHandlers'); // NEW IMPORT

const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const handleRatingNotes = async (ctx, userMessage) => {
    if (!global.pendingRatingNotes) return false;
    const userId = ctx.from.id;
    const pendingNote = global.pendingRatingNotes.get(userId);
    if (!pendingNote) return false;


    if (Date.now() - pendingNote.timestamp > 5 * 60 * 1000) {
        global.pendingRatingNotes.delete(userId);
        await ctx.reply('⏰ Rating notes session expired. Please use /rate to try again.');
        return true;
    }

    if (userMessage.toLowerCase().trim() === '/cancel') {
        global.pendingRatingNotes.delete(userId);
        await ctx.reply('❌ Rating notes cancelled.');
        return true;
    }

    try {
        // get existing rating
        const existingRating = await getRecipeRating(pendingNote.recipeId, ctx.dbUser.id);
        const rating = existingRating ? existingRating.rating : 3; // Default to 3 if no rating exists

        // save rating with notes
        const result = await rateRecipe(pendingNote.recipeId, ctx.dbUser.id, rating, userMessage);

        if (result.success) {
            const stars = '⭐'.repeat(rating);
            await ctx.reply(`✅ **Rating Notes Saved!** ✅

📝 **Recipe:** ${pendingNote.recipeTitle}
⭐ **Rating:** ${stars} (${rating}/5)
💭 **Notes:** "${userMessage}"

🌿 *Your cooking insights have been preserved!* ✨`, {
                parse_mode: 'Markdown'
            });
        }

        global.pendingRatingNotes.delete(userId);
        return true;

    } catch (error) {
        console.error('Handle rating notes error:', error);
        await ctx.reply('🐛 Error saving rating notes! Please try again.');
        global.pendingRatingNotes.delete(userId);
        return true;
    }
};

const textHandler = async (ctx) => {
    const userMessage = ctx.message.text;

    if (userMessage.startsWith('/')) {
        return;
    }

    try {
        const personalForumService = global.personalForumService;

        if (userMessage.startsWith('SETUP_')) {
            console.log(`Setup code detected: ${userMessage}`);
            console.log(`User ID: ${ctx.from.id}`);
            console.log(`Chat type: ${ctx.chat.type}`);
            console.log(`Is forum: ${ctx.chat.is_forum}`);
            console.log(`PersonalForumService available: ${!!personalForumService}`);

            if (personalForumService) {
                console.log(`🔍 Pending setups count: ${personalForumService.pendingSetups.size}`);
                const pendingSetup = personalForumService.pendingSetups.get(ctx.from.id);
                console.log(`🔍 User has pending setup: ${!!pendingSetup}`);
                if (pendingSetup) {
                    console.log(`🔍 Expected code: ${pendingSetup.setupCode}`);
                    console.log(`🔍 Received code: ${userMessage.trim()}`);
                    console.log(`🔍 Codes match: ${pendingSetup.setupCode === userMessage.trim()}`);
                }
                const handled = await personalForumService.handleSetupCode(ctx, userMessage.trim());
                console.log(`🔍 Setup code handled: ${handled}`);
                if (handled) return;
            } else {
                await ctx.reply(`🐛 <b>Debug Info:</b> PersonalForumService not available!`, { parse_mode: 'HTML' });
                return;
            }
        }

        const handledConfirmation = await handleDownloadConfirmation(ctx, userMessage);
        if (handledConfirmation) return;

        const handledRatingNotes = await handleRatingNotes(ctx, userMessage);
        if (handledRatingNotes) return;

        const handledCustomScaling = await handleCustomScalingInput(ctx, userMessage);
        if (handledCustomScaling) return;

        if (detectedVideoLink(userMessage)) {
            const urlMatch = userMessage.match(/(https?:\/\/[^\s]+)/);
            const url = urlMatch ? urlMatch[0] : '';

            if (personalForumService) {
                const userForum = await personalForumService.getUserPersonalForum(ctx.dbUser.id);
                if (!userForum || !userForum.setup_completed) {
                    await ctx.reply(`⚠️ <b>Personal Recipe Forum Required!</b> ⚠️

Hi ${escapeHtml(ctx.from.first_name || 'friend')}! To organize your recipes automatically in beautiful categories, you need to set up your personal forum first.

🎯 <b>Quick 2-minute setup:</b>
Send /start to begin the guided setup process

📚 <b>What you'll get:</b>
• Personal organized recipe collection
• Automatic categorization (🥗 Salads, 🍰 Desserts, etc.)
• Original videos preserved with recipes
• Beautiful forum interface for browsing

🔗 <b>Don't worry</b> - I'll remember this video link and process it once your forum is ready!

<i>Your organized culinary journey is just one setup away!</i> 🌿✨`,
                        { parse_mode: 'HTML' });
                    return;
                }
            }

            if (isDownloading()) {
                addToQueue({ url, ctx });
                await ctx.reply(`🕰️✨ <i>Moss is busy with another portal...</i> ✨🕰️

🌿 <i>Your request has been added to the mystical queue!</i>
📜 <i>Position in line: ${getQueueLength()}</i>

<i>Please be patient while I finish the current ritual...</i> 🧙‍♀️⚡`,
                    { parse_mode: 'HTML' });
                return;
            }

            await downloadVideoInfo(url, ctx);
            setTimeout(processDownloadQueue, 5000);
            return;
        }

        const escapedMessage = escapeHtml(userMessage);
        const sageResponses = [
            `🌿 <i>Moss nods thoughtfully</i> "${escapedMessage}" - I sense wisdom in your words, dear cook...`,
            `📜 <i>scribbles in grimoire</i> Your message "${escapedMessage}" has been recorded in the ancient scrolls!`,
            `✨ <i>Moss's eyes glow</i> Fascinating! "${escapedMessage}" - this knowledge shall help future recipes!`,
            `🍄 <i>rustles through herb pouches</i> "${escapedMessage}" - reminds me of an old kitchen tale...`,
            `🌱 <i>Moss smiles warmly</i> I hear you say "${escapedMessage}" - tell me more of your culinary adventures!`,
            `🔮 <i>The grimoire glows softly</i> "${escapedMessage}" - such words would make any recipe more magical...`,
            `🧙‍♀️ <i>Moss strokes his beard</i> "${escapedMessage}" - wise words from a fellow seeker of culinary truth!`
        ];

        const randomResponse = sageResponses[Math.floor(Math.random() * sageResponses.length)];
        await ctx.reply(randomResponse, { parse_mode: 'HTML' });

    } catch (error) {
        console.error('Text handler error:', error);
        await ctx.reply(`🐛 <i>Moss's mystical senses are a bit clouded...</i> 

Please try sending your message again, dear cook! ⚡🌿`, { parse_mode: 'HTML' });
    }
};

module.exports = textHandler;