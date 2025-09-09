const { getUserRecipes } = require('../database/recipeService');
const { generateShoppingList, getUserShoppingLists } = require('../services/shoppingListGenerator');

const shoppingCommand = async (ctx) => {
    try {
        const userRecipes = await getUserRecipes(ctx.dbUser.id, 20); // Get more recipes for selection
        const recentShoppingLists = await getUserShoppingLists(ctx.dbUser.id, 5);

        if (userRecipes.length === 0) {
            await ctx.reply(`🛒 **Shopping List Generator** 🛒

📚 **No recipes found!**

🍳 *You need recipes to generate shopping lists!*
📱 *Send me cooking videos to build your recipe collection first.*

🌿 *Once you have recipes, you can create organized shopping lists!* ✨`,
                { parse_mode: 'Markdown' });
            return;
        }

        let message = `🛒 **Shopping List Generator** 🛒\n\n`;

        message += `📚 **Available Options:**\n\n`;

        const recentRecipes = userRecipes.slice(0, 5);
        message += `⚡ **Quick Lists from Recent Recipes:**\n`;
        recentRecipes.forEach((recipe, index) => {
            const date = new Date(recipe.created_at).toLocaleDateString();
            message += `${index + 1}. **${recipe.title}** (${date})\n`;
        });
        message += `\n`;

        if (recentShoppingLists.length > 0) {
            message += `📝 **Recent Shopping Lists:**\n`;
            recentShoppingLists.forEach((list, index) => {
                const date = new Date(list.created_at).toLocaleDateString();
                const status = list.is_completed ? '✅' : '📝';
                message += `${status} **${list.name}** (${list.total_items} items, ${date})\n`;
            });
            message += `\n`;
        }

        message += `🎯 **What would you like to do?**\n`;
        message += `• Generate shopping list from **one recipe**\n`;
        message += `• Combine **multiple recipes** into one list\n`;
        message += `• View and manage **saved shopping lists**\n`;
        message += `• Configure **shopping preferences**\n\n`;

        message += `🌿 *Smart shopping lists with automatic ingredient consolidation!* ✨`;

        const buttons = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🍳 Single Recipe List', callback_data: 'shopping_single_recipe' },
                        { text: '📚 Multiple Recipes', callback_data: 'shopping_multiple_recipes' }
                    ],
                    [
                        { text: '📝 My Shopping Lists', callback_data: 'view_shopping_lists' },
                        { text: '⚙️ Shopping Preferences', callback_data: 'shopping_preferences' }
                    ],
                    [
                        { text: '❓ How It Works', callback_data: 'shopping_help' }
                    ]
                ]
            }
        };

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...buttons
        });

    } catch (error) {
        console.error('Shopping command error:', error);
        await ctx.reply('🐛 Error accessing shopping list features! Please try again.');
    }
};

module.exports = shoppingCommand;