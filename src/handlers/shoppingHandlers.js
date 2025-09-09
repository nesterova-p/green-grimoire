const { getUserRecipes, getRecipeById } = require('../database/recipeService');
const { generateShoppingList, getUserShoppingLists } = require('../services/shoppingListGenerator');
const { query } = require('../database/connection');

const pendingMultipleRecipeSelections = new Map();

const setupShoppingHandlers = (bot) => {
    bot.action('shopping_single_recipe', async (ctx) => {
        try {
            await ctx.answerCbQuery('🍳 Loading recipes for single shopping list...');

            const userRecipes = await getUserRecipes(ctx.dbUser.id, 15);

            if (userRecipes.length === 0) {
                await ctx.reply('📚 No recipes available for shopping lists!');
                return;
            }

            let message = `🍳 **Single Recipe Shopping List** 🍳\n\n`;
            message += `📝 **Select a recipe to generate a shopping list:**\n\n`;

            const recipeButtons = [];
            userRecipes.forEach((recipe, index) => {
                const date = new Date(recipe.created_at).toLocaleDateString();
                message += `${index + 1}. **${recipe.title}**\n`;
                message += `   📅 ${date}\n\n`;

                recipeButtons.push([
                    { text: `🛒 Generate List ${index + 1}`, callback_data: `generate_single_list_${recipe.id}` }
                ]);
            });

            message += `💡 **Single recipe lists are perfect for:**\n`;
            message += `• Planning one specific meal\n`;
            message += `• Quick grocery runs\n`;
            message += `• Testing new recipes\n\n`;
            message += `🌿 *Each list includes smart ingredient organization!* ✨`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        ...recipeButtons,
                        [{ text: '⬅️ Back to Shopping Menu', callback_data: 'back_to_shopping_menu' }]
                    ]
                }
            });

        } catch (error) {
            console.error('Single recipe shopping error:', error);
            await ctx.reply('🐛 Error loading recipes for shopping list!');
        }
    });

    bot.action(/^generate_single_list_(\d+)$/, async (ctx) => {
        try {
            const recipeId = parseInt(ctx.match[1]);
            await ctx.answerCbQuery('🛒 Generating shopping list...');

            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found!');
                return;
            }

            const processingMsg = await ctx.reply(`🛒 **Generating Shopping List** 🛒

📝 Creating shopping list for "${recipe.title}"...
🔄 Organizing ingredients by category...
⚡ Applying smart consolidation...

*This will take a moment...* 🌿`,
                { parse_mode: 'Markdown' });

            const result = await generateShoppingList([recipeId], ctx.dbUser.id);

            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            } catch (e) {}

            if (result.success) {
                await ctx.reply(`✅ **Shopping List Generated!** ✅

${result.formattedText}`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '🔄 Generate Another', callback_data: 'shopping_single_recipe' },
                                    { text: '📝 My Lists', callback_data: 'view_shopping_lists' }
                                ],
                                [
                                    { text: '📚 Combine Recipes', callback_data: 'shopping_multiple_recipes' }
                                ]
                            ]
                        }
                    });
            } else {
                await ctx.reply(`❌ **Shopping List Generation Failed** ❌

🐛 **Error:** ${result.error}

🔧 **Possible causes:**
• Recipe has no clear ingredients
• Ingredient format not recognized
• Database connectivity issues

💡 **Try:**
• Use a different recipe
• Check if recipe has ingredient list
• Try again in a moment

🌿 *Other recipes may work better!* ✨`,
                    { parse_mode: 'Markdown' });
            }

        } catch (error) {
            console.error('Generate single list error:', error);
            await ctx.reply('🐛 Error generating shopping list!');
        }
    });

    bot.action('shopping_multiple_recipes', async (ctx) => {
        try {
            await ctx.answerCbQuery('📚 Loading recipes for combination...');

            const userRecipes = await getUserRecipes(ctx.dbUser.id, 20);

            if (userRecipes.length < 2) {
                await ctx.reply(`📚 **Need More Recipes** 📚

🍳 You need at least 2 recipes to create a combined shopping list!

💡 **Current recipes:** ${userRecipes.length}
📱 **Send more cooking videos** to build your collection!

🌿 *Once you have multiple recipes, you can create comprehensive shopping lists!* ✨`,
                    { parse_mode: 'Markdown' });
                return;
            }

            const userId = ctx.dbUser.id;
            pendingMultipleRecipeSelections.set(userId, {
                selectedRecipes: [],
                availableRecipes: userRecipes.map(r => ({ id: r.id, title: r.title })),
                timestamp: Date.now()
            });

            await showMultipleRecipeSelection(ctx, userId);

        } catch (error) {
            console.error('Multiple recipe shopping error:', error);
            await ctx.reply('🐛 Error setting up multiple recipe selection!');
        }
    });

    bot.action(/^toggle_recipe_(\d+)$/, async (ctx) => {
        try {
            const recipeId = parseInt(ctx.match[1]);
            const userId = ctx.dbUser.id;

            const selection = pendingMultipleRecipeSelections.get(userId);
            if (!selection) {
                await ctx.answerCbQuery('❌ Selection session expired!');
                return;
            }

            const isSelected = selection.selectedRecipes.includes(recipeId);
            if (isSelected) {
                selection.selectedRecipes = selection.selectedRecipes.filter(id => id !== recipeId);
                await ctx.answerCbQuery('✅ Recipe removed from list');
            } else {
                selection.selectedRecipes.push(recipeId);
                await ctx.answerCbQuery('✅ Recipe added to list');
            }

            pendingMultipleRecipeSelections.set(userId, selection);

            await showMultipleRecipeSelection(ctx, userId, ctx.callbackQuery.message.message_id);
        } catch (error) {
            console.error('Toggle recipe error:', error);
            await ctx.answerCbQuery('🐛 Error updating selection!');
        }
    });

    bot.action('generate_combined_list', async (ctx) => {
        try {
            const userId = ctx.dbUser.id;
            const selection = pendingMultipleRecipeSelections.get(userId);

            if (!selection || selection.selectedRecipes.length === 0) {
                await ctx.answerCbQuery('❌ No recipes selected!');
                return;
            }

            await ctx.answerCbQuery('🛒 Generating combined shopping list...');

            const processingMsg = await ctx.reply(`🛒 **Generating Combined Shopping List** 🛒

📚 Combining ${selection.selectedRecipes.length} recipes...
🔄 Consolidating duplicate ingredients...
📊 Organizing by categories...
⚡ Applying smart shopping optimization...

*This may take a moment for multiple recipes...* 🌿`,
                { parse_mode: 'Markdown' });
            const result = await generateShoppingList(selection.selectedRecipes, userId);

            pendingMultipleRecipeSelections.delete(userId);

            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            } catch (e) {}

            if (result.success) {
                await ctx.reply(`✅ **Combined Shopping List Generated!** ✅

${result.formattedText}`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '🔄 Create Another', callback_data: 'shopping_multiple_recipes' },
                                    { text: '📝 My Lists', callback_data: 'view_shopping_lists' }
                                ],
                                [
                                    { text: '🍳 Single Recipe List', callback_data: 'shopping_single_recipe' }
                                ]
                            ]
                        }
                    });
            } else {
                await ctx.reply(`❌ **Combined Shopping List Failed** ❌

🐛 **Error:** ${result.error}

🔧 **This might happen if:**
• Selected recipes have unclear ingredients
• Database connectivity issues
• Recipe formatting problems

💡 **Try:**
• Select different recipes
• Try with fewer recipes first
• Check individual recipes work

🌿 *Some recipe combinations work better than others!* ✨`,
                    { parse_mode: 'Markdown' });
            }

        } catch (error) {
            console.error('Generate combined list error:', error);
            await ctx.reply('🐛 Error generating combined shopping list!');
        }
    });

    bot.action('view_shopping_lists', async (ctx) => {
        try {
            await ctx.answerCbQuery('📝 Loading your shopping lists...');

            const shoppingLists = await getUserShoppingLists(ctx.dbUser.id, 10);

            if (shoppingLists.length === 0) {
                await ctx.reply(`📝 **Your Shopping Lists** 📝

📚 **No shopping lists yet!**

🛒 **Create your first shopping list:**
• Generate from a single recipe
• Combine multiple recipes  
• Smart ingredient organization included!

🌿 *Your organized shopping adventures await!* ✨`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '🍳 Create from Recipe', callback_data: 'shopping_single_recipe' },
                                    { text: '📚 Combine Recipes', callback_data: 'shopping_multiple_recipes' }
                                ]
                            ]
                        }
                    });
                return;
            }

            let message = `📝 **Your Shopping Lists** 📝\n\n`;
            message += `🛒 **Found ${shoppingLists.length} shopping lists:**\n\n`;

            const listButtons = [];
            shoppingLists.forEach((list, index) => {
                const date = new Date(list.created_at).toLocaleDateString();
                const status = list.is_completed ? '✅ Completed' : '📝 Active';

                message += `${index + 1}. **${list.name}**\n`;
                message += `   📊 ${list.total_items} items • ${list.recipe_count} recipes • ${status}\n`;
                message += `   📅 Created ${date}\n\n`;

                listButtons.push([
                    { text: `👁️ View List ${index + 1}`, callback_data: `view_shopping_list_${list.id}` },
                    { text: `🗑️ Delete`, callback_data: `delete_shopping_list_${list.id}` }
                ]);
            });

            message += `💡 **Shopping list features:**\n`;
            message += `• Organized by store categories\n`;
            message += `• Smart ingredient consolidation\n`;
            message += `• Checkboxes for shopping progress\n`;
            message += `• Save for reuse and reference\n\n`;
            message += `🌿 *Your organized shopping history!* ✨`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        ...listButtons,
                        [
                            { text: '🛒 Create New List', callback_data: 'shopping_single_recipe' },
                            { text: '⬅️ Back to Menu', callback_data: 'back_to_shopping_menu' }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error('View shopping lists error:', error);
            await ctx.reply('🐛 Error loading shopping lists!');
        }
    });

    bot.action('shopping_help', async (ctx) => {
        await ctx.answerCbQuery('❓ Loading shopping list help...');

        const helpMessage = `❓ **How Shopping Lists Work** ❓

🛒 **Smart Shopping List Generation:**

📝 **From Single Recipe:**
• Select any recipe from your collection
• Automatically extracts all ingredients
• Organizes by store categories (Produce, Meat, etc.)
• Perfect for planning one specific meal

📚 **From Multiple Recipes:**
• Select 2 or more recipes to combine
• Smart consolidation (2 cups + 1 cup = 3 cups milk)
• Eliminates duplicate ingredients automatically
• Great for meal planning and bulk shopping

🏪 **Category Organization:**
• 🥬 **Produce** - Fresh fruits and vegetables
• 🥩 **Meat & Seafood** - Proteins and fish
• 🥛 **Dairy & Eggs** - Milk, cheese, eggs
• 🏠 **Pantry** - Dry goods, spices, oils
• 🧊 **Frozen** - Frozen items
• 🍞 **Bakery** - Bread and baked goods
• 🥤 **Beverages** - Drinks and liquids

💡 **Smart Features:**
• **Consolidation:** Combines same ingredients intelligently
• **Unit Conversion:** Handles different measurement units
• **Store Layout:** Organized for efficient shopping
• **Checkboxes:** Track progress while shopping
• **Save & Reuse:** Keep lists for future reference

🌿 *Turn your recipes into organized shopping adventures!* ✨`;

        await ctx.reply(helpMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🛒 Try It Now', callback_data: 'shopping_single_recipe' },
                        { text: '⬅️ Back to Menu', callback_data: 'back_to_shopping_menu' }
                    ]
                ]
            }
        });
    });

    bot.action('back_to_shopping_menu', async (ctx) => {
        await ctx.answerCbQuery('🛒 Back to shopping menu...');
        await ctx.deleteMessage();
        const shoppingCommand = require('../commands/shopping');
        await shoppingCommand(ctx);
    });

    setInterval(() => {
        const now = Date.now();
        const timeout = 10 * 60 * 1000; // 10 minutes

        for (const [userId, selection] of pendingMultipleRecipeSelections.entries()) {
            if (now - selection.timestamp > timeout) {
                pendingMultipleRecipeSelections.delete(userId);
                console.log(`🧹 Cleaned up expired recipe selection for user ${userId}`);
            }
        }
    }, 5 * 60 * 1000); // every 5 min
};

const showMultipleRecipeSelection = async (ctx, userId, messageId = null) => {
    try {
        const selection = pendingMultipleRecipeSelections.get(userId);
        if (!selection) {
            await ctx.reply('❌ Selection session expired!');
            return;
        }

        let message = `📚 **Select Multiple Recipes** 📚\n\n`;
        message += `✅ **Selected: ${selection.selectedRecipes.length} recipes**\n`;
        message += `📋 **Available: ${selection.availableRecipes.length} recipes**\n\n`;

        if (selection.selectedRecipes.length > 0) {
            message += `🛒 **Currently Selected:**\n`;
            const selectedTitles = selection.availableRecipes
                .filter(r => selection.selectedRecipes.includes(r.id))
                .map(r => r.title);
            selectedTitles.forEach((title, index) => {
                message += `${index + 1}. ✅ ${title}\n`;
            });
            message += `\n`;
        }

        message += `📝 **Click recipes to add/remove:**\n\n`;

        const recipeButtons = [];
        selection.availableRecipes.forEach((recipe, index) => {
            const isSelected = selection.selectedRecipes.includes(recipe.id);
            const emoji = isSelected ? '✅' : '☐';

            message += `${emoji} ${recipe.title}\n`;

            recipeButtons.push([
                { text: `${emoji} ${recipe.title}`, callback_data: `toggle_recipe_${recipe.id}` }
            ]);
        });

        const actionButtons = [];
        if (selection.selectedRecipes.length >= 2) {
            actionButtons.push([
                { text: `🛒 Generate List (${selection.selectedRecipes.length} recipes)`, callback_data: 'generate_combined_list' }
            ]);
        } else {
            message += `\n💡 **Select at least 2 recipes to generate a combined shopping list**\n`;
        }

        actionButtons.push([
            { text: '🔄 Clear Selection', callback_data: 'clear_recipe_selection' },
            { text: '⬅️ Back to Menu', callback_data: 'back_to_shopping_menu' }
        ]);

        message += `\n🌿 *Smart consolidation will combine duplicate ingredients!* ✨`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    ...recipeButtons.slice(0, 10),
                    ...actionButtons
                ]
            }
        };

        if (messageId) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                messageId,
                null,
                message,
                { parse_mode: 'Markdown', ...keyboard }
            );
        } else {
            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }

    } catch (error) {
        console.error('Show multiple recipe selection error:', error);
        await ctx.reply('🐛 Error displaying recipe selection!');
    }
};

module.exports = {
    setupShoppingHandlers,
    pendingMultipleRecipeSelections
};