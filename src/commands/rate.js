const { getUnratedRecipes, getUserRatedRecipes, getRatingStats, getTopRatedRecipes } = require('../database/ratingService');

const rateCommand = async (ctx) => {
    try {
        const unratedRecipes = await getUnratedRecipes(ctx.dbUser.id, 5);
        const ratedRecipes = await getUserRatedRecipes(ctx.dbUser.id, 3);
        const stats = await getRatingStats(ctx.dbUser.id);
        if (unratedRecipes.length === 0 && ratedRecipes.length === 0) {
            await ctx.reply(`⭐ *Your Recipe Ratings* ⭐

📚 No recipes in your collection yet!

🍳 *Send me cooking videos to start building your collection!*
⭐ *Rate recipes to track your favorites and cooking experiences!*

*Moss is ready to capture culinary wisdom...* ✨`,
                { parse_mode: 'Markdown' });
            return;
        }

        let message = `⭐ *Recipe Rating Center* ⭐\n\n`;

        if (stats.totalRated > 0) {
            const starBar = '⭐'.repeat(Math.round(parseFloat(stats.averageRating)));
            message += `📊 **Your Rating Stats:**\n`;
            message += `• **${stats.totalRated}** recipes rated\n`;
            message += `• **${stats.averageRating}** average rating ${starBar}\n`;
            message += `• **${stats.distribution[5]}** five-star favorites\n\n`;
        }

        if (unratedRecipes.length > 0) {
            message += `🔔 **Unrated Recipes (${unratedRecipes.length}):**\n`;
            const rateButtons = [];

            unratedRecipes.forEach((recipe, index) => {
                const date = new Date(recipe.created_at).toLocaleDateString();
                message += `${index + 1}. **${recipe.title}**\n`;
                message += `   📅 ${date}\n\n`;

                rateButtons.push([
                    { text: `⭐ Rate Recipe ${index + 1}`, callback_data: `rate_recipe_${recipe.id}` }
                ]);
            });

            if (ratedRecipes.length > 0) {
                message += `📝 **Recently Rated:**\n`;
                ratedRecipes.forEach((recipe, index) => {
                    const stars = '⭐'.repeat(recipe.rating);
                    const date = new Date(recipe.rating_date).toLocaleDateString();
                    message += `• **${recipe.title}** ${stars} (${date})\n`;
                });
                message += `\n`;
            }

            message += `🌿 *Rate your recipes to track favorites and cooking experiences!* ✨`;



            const actionButtons = [
                [
                    { text: '📊 View All Ratings', callback_data: 'view_all_ratings' },
                    { text: '🏆 Top Rated', callback_data: 'view_top_rated' }
                ]
            ];

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [...rateButtons, ...actionButtons]
                }
            });

        } else {
            message += `✅ **All Recipes Rated!**\n\n`;

            if (ratedRecipes.length > 0) {
                message += `📝 **Recent Ratings:**\n`;
                ratedRecipes.forEach((recipe) => {
                    const stars = '⭐'.repeat(recipe.rating);
                    const date = new Date(recipe.rating_date).toLocaleDateString();
                    message += `• **${recipe.title}** ${stars} (${date})\n`;
                    if (recipe.notes) {
                        message += `  💭 "${recipe.notes}"\n`;
                    }
                });
                message += `\n`;
            }

            message += `🌿 *Great job keeping track of your cooking experiences!* ✨`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📊 View All Ratings', callback_data: 'view_all_ratings' },
                            { text: '🏆 Top Rated', callback_data: 'view_top_rated' }
                        ],
                        [
                            { text: '🔄 Update Rating', callback_data: 'update_ratings' }
                        ]
                    ]
                }
            });
        }

    } catch (error) {
        console.error('Rate command error:', error);
        await ctx.reply('🐛 Error accessing your ratings! Please try again.');
    }
};

const setupRatingHandlers = (bot) => {
    bot.action('view_all_ratings', async (ctx) => {
        try {
            await ctx.answerCbQuery('📊 Loading all ratings...');

            const ratedRecipes = await getUserRatedRecipes(ctx.dbUser.id, 20);
            const stats = await getRatingStats(ctx.dbUser.id);

            if (ratedRecipes.length === 0) {
                await ctx.reply('⭐ No rated recipes yet! Use /rate to rate your recipes.');
                return;
            }

            let message = `📊 **All Your Recipe Ratings** 📊\n\n`;
            message += `🎯 **Stats:** ${stats.totalRated} rated • ⭐ ${stats.averageRating} avg\n\n`;

            ratedRecipes.forEach((recipe, index) => {
                const stars = '⭐'.repeat(recipe.rating);
                const date = new Date(recipe.rating_date).toLocaleDateString();
                message += `${index + 1}. **${recipe.title}**\n`;
                message += `   ${stars} (${recipe.rating}/5) • 📅 ${date}\n`;
                if (recipe.notes && recipe.notes.trim()) {
                    message += `   💭 "${recipe.notes}"\n`;
                }
                message += `\n`;
            });

            message += `🌿 *Your culinary rating history!* ✨`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Back to Rate Menu', callback_data: 'back_to_rate_menu' }]
                    ]
                }
            });

        } catch (error) {
            console.error('View all ratings error:', error);
            await ctx.reply('🐛 Error loading ratings!');
        }
    });

    bot.action('view_top_rated', async (ctx) => {
        try {
            await ctx.answerCbQuery('🏆 Loading top rated recipes...');

            const topRecipes = await getTopRatedRecipes(ctx.dbUser.id, 10);

            if (topRecipes.length === 0) {
                await ctx.reply('🏆 No rated recipes yet! Use /rate to rate your recipes.');
                return;
            }

            let message = `🏆 **Your Top Rated Recipes** 🏆\n\n`;

            topRecipes.forEach((recipe, index) => {
                const stars = '⭐'.repeat(recipe.rating);
                const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                const categories = recipe.categories ? recipe.categories.join(', ') : 'Uncategorized';

                message += `${medal} **${recipe.title}**\n`;
                message += `   ${stars} (${recipe.rating}/5) • 📂 ${categories}\n`;
                if (recipe.notes && recipe.notes.trim()) {
                    message += `   💭 "${recipe.notes}"\n`;
                }
                message += `\n`;
            });

            message += `🌿 *Your highest rated culinary masterpieces!* ✨`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📖 View Recipe', callback_data: `view_recipe_${topRecipes[0].id}` },
                            { text: '⭐ Update Rating', callback_data: `rate_recipe_${topRecipes[0].id}` }
                        ],
                        [{ text: '⬅️ Back to Rate Menu', callback_data: 'back_to_rate_menu' }]
                    ]
                }
            });

        } catch (error) {
            console.error('View top rated error:', error);
            await ctx.reply('🐛 Error loading top rated recipes!');
        }
    });

    bot.action('back_to_rate_menu', async (ctx) => {
        await ctx.answerCbQuery('⭐ Back to rating menu');
        await ctx.deleteMessage();
        await rateCommand(ctx);
    });

    bot.action('update_ratings', async (ctx) => {
        try {
            await ctx.answerCbQuery('🔄 Loading recipes for rating updates...');

            const ratedRecipes = await getUserRatedRecipes(ctx.dbUser.id, 10);

            if (ratedRecipes.length === 0) {
                await ctx.reply('⭐ No rated recipes to update!');
                return;
            }

            let message = `🔄 **Update Recipe Ratings** 🔄\n\n`;
            message += `Select a recipe to update its rating:\n\n`;

            const updateButtons = [];
            ratedRecipes.forEach((recipe, index) => {
                const stars = '⭐'.repeat(recipe.rating);
                message += `${index + 1}. **${recipe.title}** ${stars}\n`;
                updateButtons.push([
                    { text: `🔄 Update Recipe ${index + 1}`, callback_data: `rate_recipe_${recipe.id}` }
                ]);
            });

            message += `\n🌿 *Keep your ratings current with your evolving tastes!* ✨`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        ...updateButtons,
                        [{ text: '⬅️ Back to Rate Menu', callback_data: 'back_to_rate_menu' }]
                    ]
                }
            });

        } catch (error) {
            console.error('Update ratings error:', error);
            await ctx.reply('🐛 Error loading ratings for update!');
        }
    });
};

module.exports = {
    rateCommand,
    setupRatingHandlers
};