const { pendingDownloads } = require('../services/videoDownload');

const setupDownloadHandlers = (bot) => {
    bot.action('download_confirm', async (ctx) => {
        try {
            await ctx.answerCbQuery('🔮 Starting download ritual!');

            const userId = ctx.from.id;
            const pending = pendingDownloads.get(userId);

            if (!pending) {
                await ctx.editMessageText(
                    '⚠️ *Download session expired!* Please send the video link again.',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            pendingDownloads.delete(userId);

            await ctx.editMessageText(
                `🔮⚡ *Moss prepares the downloading ritual!* ⚡🔮

🧙‍♀️ *Your wish is my command, dear cook!*
📜 *Beginning the sacred video capture...*

*Ancient magic is flowing...* 🌿⚡`,
                { parse_mode: 'Markdown' }
            );

            const { downloadActualVideo } = require('../services/videoDownload');
            await downloadActualVideo(pending.url, ctx, pending.videoInfo, ctx.callbackQuery.message.message_id);

        } catch (error) {
            console.error('Download confirm error:', error);
            await ctx.reply('🐛 Error starting download! Please try again.');
        }
    });

    bot.action('download_cancel', async (ctx) => {
        try {
            await ctx.answerCbQuery('❌ Download cancelled');

            const userId = ctx.from.id;
            pendingDownloads.delete(userId);

            await ctx.editMessageText(
                `🌿✨ *Moss nods understandingly* ✨🌿

🧙‍♀️ *No worries, dear cook! The video portal remains open in the ether.*
📜 *Send another video link anytime you're ready for downloading magic!*

*Moss returns to tending the grimoire...* 🍄📚`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Download cancel error:', error);
        }
    });

    bot.action('info_only', async (ctx) => {
        try {
            await ctx.answerCbQuery('📋 Video info preserved!');

            const userId = ctx.from.id;
            const pending = pendingDownloads.get(userId);
            pendingDownloads.delete(userId);

            await ctx.editMessageText(
                `📋⚡ *Video Information Preserved* ⚡📋

🎬 **Title:** ${pending?.videoInfo?.title || 'Unknown'}
⏱️ **Duration:** ${pending?.videoInfo?.duration ? `${Math.floor(pending.videoInfo.duration / 60)}m ${Math.floor(pending.videoInfo.duration % 60)}s` : 'Unknown'}
📱 **Platform:** ${pending?.url?.includes('tiktok') ? 'TikTok' : pending?.url?.includes('youtube') ? 'YouTube' : 'Unknown'}

🌿 *Video link saved for your reference - no download performed.*
📜 *Send another video link when ready for recipe extraction!*`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Info only error:', error);
        }
    });
};

// view recipe
const setupRecipeHandlers = (bot) => {
    bot.action(/view_recipe_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('📖 Loading recipe...');

            const { getRecipeById } = require('../database/recipeService');
            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);

            if (!recipe) {
                await ctx.reply('❌ Recipe not found or not accessible!');
                return;
            }

        if (recipe.video_file_id && recipe.video_chat_id) {
            try {
                await ctx.replyWithVideo(recipe.video_file_id, {
                    caption: `🎬 **Original Video** 🎬\n📝 **Recipe:** ${recipe.title}\n🌿 *Refreshing your memory with the source video!* ✨`,
                    parse_mode: 'Markdown'
                });
            } catch (videoError) {
                console.log('Could not resend video (might be expired):', videoError.message);
                if (recipe.original_video_url) {
                    await ctx.reply(`🔗 **Original Video:** ${recipe.original_video_url}`);
                }
            }
        }

            const message = `📖 **${recipe.title}** 📖

${recipe.structured_recipe}

📅 **Saved:** ${new Date(recipe.created_at).toLocaleDateString()}
📱 **Platform:** ${recipe.video_platform}

🌿 *From your digital grimoire* ✨`;

            await ctx.reply(message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('View recipe error:', error);
            await ctx.reply('🐛 Error loading recipe!');
        }
    });

    // delete recipe
    bot.action(/delete_recipe_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('🗑️ Confirm deletion...');

            // Show confirmation buttons
            await ctx.reply(
                `🗑️ **Confirm Recipe Deletion** 🗑️

⚠️ Are you sure you want to delete this recipe?
📚 This action cannot be undone!

🌿 *Choose wisely, dear cook...* ✨`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Yes, Delete It', callback_data: `confirm_delete_${recipeId}` },
                                { text: '❌ No, Keep It', callback_data: 'cancel_delete' }
                            ]
                        ]
                    }
                }
            );

        } catch (error) {
            console.error('Delete recipe error:', error);
            await ctx.reply('🐛 Error preparing deletion!');
        }
    });

    // confirm delete
    bot.action(/confirm_delete_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('🗑️ Deleting recipe...');

            const { deleteRecipe } = require('../database/recipeService');
            const deleted = await deleteRecipe(recipeId, ctx.dbUser.id);

            if (deleted) {
                await ctx.editMessageText(
                    `✅ **Recipe Deleted Successfully** ✅

🗑️ The recipe has been removed from your grimoire
📚 Your collection has been updated

🌿 *The digital scroll returns to the ether...* ✨`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await ctx.editMessageText(
                    '❌ **Deletion Failed** ❌\n\nRecipe not found or not accessible.',
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (error) {
            console.error('Confirm delete error:', error);
            await ctx.reply('🐛 Error deleting recipe!');
        }
    });

    // cancel delete
    bot.action('cancel_delete', async (ctx) => {
        try {
            await ctx.answerCbQuery('❌ Deletion cancelled');
            await ctx.editMessageText(
                `🌿 **Recipe Preserved** 🌿

📚 Your recipe remains safely in the grimoire
✨ *Moss approves of your careful consideration!* ✨`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Cancel delete error:', error);
        }
    });

    // search and stats
    bot.action('search_recipes', async (ctx) => {
        await ctx.answerCbQuery('🔍 Search feature coming soon!');
        await ctx.reply('🔍 **Recipe Search** 🔍\n\n🚧 This feature is being developed!\n\n*Coming in Phase 1.3!* 🌿');
    });

    bot.action('view_stats', async (ctx) => {
        try {
            await ctx.answerCbQuery('📊 Loading stats...');
            const { getUserStats } = require('../database/userService');
            const stats = await getUserStats(ctx.dbUser.id);

            await ctx.reply(`📊 *Your GreenGrimoire Stats* 📊

🍳 **Total Recipes:** ${stats.total_recipes}
📱 **Platforms Used:** ${stats.platforms_used}
📂 **Categories Used:** ${stats.categories_used}
📅 **Member Since:** ${new Date(ctx.dbUser.created_at).toLocaleDateString()}

🌿 *Keep cooking and growing your collection!* ✨`,
                { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('View stats error:', error);
            await ctx.reply('🐛 Error loading stats!');
        }
    });
};

module.exports = {
    setupDownloadHandlers,
    setupRecipeHandlers
};