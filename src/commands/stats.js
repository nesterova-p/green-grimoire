const { getUserStats } = require('../database/userService');

const statsCommand = async (ctx) => {
    try {
        const stats = await getUserStats(ctx.dbUser.id);

        let message = `📊 *Your GreenGrimoire Stats* 📊\n\n`;
        message += `🍳 **Recipes:** ${stats.total_recipes} total\n`;
        message += `📱 **Platforms:** ${stats.platforms_used} different sources\n`;
        message += `📂 **Categories:** ${stats.categories_used} types of dishes\n`;
        message += `📅 **Member Since:** ${new Date(ctx.dbUser.created_at).toLocaleDateString()}\n\n`;

        if (stats.total_rated > 0) {
            const avgStars = '⭐'.repeat(Math.round(parseFloat(stats.average_rating)));
            message += `⭐ **Rating Stats:**\n`;
            message += `• **${stats.total_rated}** recipes rated (${stats.rating_percentage}%)\n`;
            message += `• **${stats.average_rating}** average rating ${avgStars}\n`;
            message += `• **${stats.rating_distribution[5]}** five-star favorites 🏆\n`;

            if (stats.top_rated_recipe) {
                const topStars = '⭐'.repeat(stats.top_rated_recipe.rating);
                message += `• **Top Rated:** "${stats.top_rated_recipe.title}" ${topStars}\n`;
            }
            message += `\n`;

            if (stats.total_rated >= 5) {
                message += `📊 **Rating Distribution:**\n`;
                for (let i = 5; i >= 1; i--) {
                    const count = stats.rating_distribution[i];
                    const percentage = Math.round((count / stats.total_rated) * 100);
                    if (count > 0) {
                        const stars = '⭐'.repeat(i);
                        const bar = '▓'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
                        message += `${stars} │${bar}│ ${count} (${percentage}%)\n`;
                    }
                }
                message += `\n`;
            }
        } else if (stats.total_recipes > 0) {
            message += `⭐ **No ratings yet!**\n`;
            message += `Use /rate to start rating your recipes\n\n`;
        }

        message += `🌿 *Keep cooking and growing your collection!* ✨`;

        const buttons = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '⭐ Rate Recipes', callback_data: 'open_rate_command' },
                        { text: '📚 View Collection', callback_data: 'open_my_recipes' }
                    ]
                ]
            }
        };

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...buttons
        });

    } catch (error) {
        console.error('Error getting user stats:', error);
        await ctx.reply('🐛 Error getting your stats! ⚡');
    }
};

module.exports = statsCommand;