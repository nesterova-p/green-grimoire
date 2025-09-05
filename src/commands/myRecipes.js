const { getUserRecipes } = require('../database/recipeService');


const myRecipesCommand = async (ctx) => {
    try {
        const recipes = await getUserRecipes(ctx.dbUser.id, 5);

        if (recipes.length === 0) {
            await ctx.reply(`📚 *Your Recipe Grimoire is Empty* 📚

🌿 No recipes saved yet! Send me a cooking video link to start building your collection!

*Moss is ready to capture culinary wisdom...* ✨`,
                { parse_mode: 'Markdown' });
            return;
        }
        let message = `📚 *Your Recipe Collection* 📚\n\n`;
        const recipeButtons = [];

        recipes.forEach((recipe, index) => {
            const date = new Date(recipe.created_at).toLocaleDateString();
            message += `${index + 1}. **${recipe.title}**\n`;
            message += `   📅 ${date}\n\n`;

            // Add button for each recipe
            recipeButtons.push([
                { text: `📖 View Recipe ${index + 1}`, callback_data: `view_recipe_${recipe.id}` },
                { text: `🗑️ Delete`, callback_data: `delete_recipe_${recipe.id}` }
            ]);
        });

        message += `\n🌿 *Showing latest ${recipes.length} recipes*`;
        const buttons = {
            reply_markup: {
                inline_keyboard: [
                    ...recipeButtons,
                    [
                        { text: '🔍 Search Recipes', callback_data: 'search_recipes' },
                        { text: '📊 View Stats', callback_data: 'view_stats' }
                    ]
                ]
            }
        };

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...buttons
        });

    } catch (error) {
        console.error('Error getting user recipes:', error);
        await ctx.reply('🐛 Error accessing your recipe collection! ⚡');
    }
};

module.exports = myRecipesCommand;