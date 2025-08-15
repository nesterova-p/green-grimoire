const { getUserStats } = require('../database/userService');

const statsCommand = async (ctx) => {
    try {
        const stats = await getUserStats(ctx.dbUser.id);

        await ctx.reply(`📊 *Your GreenGrimoire Stats* 📊

🍳 **Total Recipes:** ${stats.total_recipes}
📱 **Platforms Used:** ${stats.platforms_used}
📂 **Categories Used:** ${stats.categories_used}
📅 **Member Since:** ${new Date(ctx.dbUser.created_at).toLocaleDateString()}

🌿 *Keep cooking and growing your collection!* ✨`,
            { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error getting user stats:', error);
        await ctx.reply('🐛 Error getting your stats! ⚡');
    }
};

module.exports = statsCommand;