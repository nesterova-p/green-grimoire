const { getUserRecipes, getRecipeById } = require('../database/recipeService');
const { generateShoppingList, getUserShoppingLists, getUserShoppingPreferences, INGREDIENT_CATEGORIES  } = require('../services/shoppingListGenerator');
const { query } = require('../database/connection');

const pendingMultipleRecipeSelections = new Map();
global.pendingDietarySettings = global.pendingDietarySettings || new Map();

const setupShoppingHandlers = (bot) => {
    const pendingDietarySettings = global.pendingDietarySettings;

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

    bot.action(/^delete_shopping_list_(\d+)$/, async (ctx) => {
        try {
            const listId = parseInt(ctx.match[1]);
            await ctx.answerCbQuery('🗑️ Confirm deletion...');
            const listResult = await query(
                'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
                [listId, ctx.dbUser.id]
            );

            if (listResult.rows.length === 0) {
                await ctx.reply('❌ Shopping list not found or not accessible!');
                return;
            }

            const list = listResult.rows[0];
            const createdDate = new Date(list.created_at).toLocaleDateString();

            await ctx.reply(
                `🗑️ **Confirm Shopping List Deletion** 🗑️

📝 **List:** ${list.name}
📊 **Items:** ${list.total_items} items from ${list.recipe_count} recipes
📅 **Created:** ${createdDate}

⚠️ **Are you sure you want to delete this shopping list?**
🔄 This action cannot be undone.

🌿 *Choose wisely, dear cook...* ✨`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Yes, Delete List', callback_data: `confirm_delete_list_${listId}` },
                                { text: '❌ No, Keep List', callback_data: 'cancel_delete_list' }
                            ]
                        ]
                    }
                }
            );

        } catch (error) {
            console.error('Delete shopping list error:', error);
            await ctx.reply('🐛 Error preparing list deletion!');
        }
    });

    bot.action(/^confirm_delete_list_(\d+)$/, async (ctx) => {
        try {
            const listId = parseInt(ctx.match[1]);
            await ctx.answerCbQuery('🗑️ Deleting shopping list...');
            const deleteResult = await query(
                'DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2 RETURNING name',
                [listId, ctx.dbUser.id]
            );

            if (deleteResult.rowCount > 0) {
                const deletedName = deleteResult.rows[0].name;
                await ctx.editMessageText(
                    `✅ **Shopping List Deleted Successfully** ✅

🗑️ **Removed:** "${deletedName}"
📝 The shopping list has been permanently deleted

🛒 **Create new lists anytime:**
• From single recipes
• Combining multiple recipes  
• With smart ingredient consolidation

🌿 *Ready for your next shopping adventure!* ✨`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await ctx.editMessageText(
                    '❌ **Deletion Failed** ❌\n\nShopping list not found or already deleted.',
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (error) {
            console.error('Confirm delete shopping list error:', error);
            await ctx.editMessageText('🐛 Error deleting shopping list! Please try again.');
        }
    });

    bot.action('cancel_delete_list', async (ctx) => {
        try {
            await ctx.answerCbQuery('❌ Deletion cancelled');
            await ctx.editMessageText(
                `🌿 **Shopping List Preserved** 🌿

📝 Your shopping list remains safely stored
✨ *Moss approves of your careful consideration!* ✨

🛒 Use /shopping to manage your lists anytime.`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Cancel delete list error:', error);
        }
    });

    bot.action('shopping_preferences', async (ctx) => {
        try {
            await ctx.answerCbQuery('⚙️ Loading shopping preferences...');
            const preferences = await getUserShoppingPreferences(ctx.dbUser.id);
            let message = `⚙️ **Shopping Preferences** ⚙️\n\n`;

            message += `🏷️ **Current Dietary Restrictions:**\n`;
            if (preferences.dietary_restrictions && preferences.dietary_restrictions.length > 0) {
                preferences.dietary_restrictions.forEach(restriction => {
                    message += `• ${restriction}\n`;
                });
            } else {
                message += `• None set\n`;
            }

            message += `\n`;
            message += `🚫 **Excluded Ingredients:**\n`;
            if (preferences.exclude_ingredients && preferences.exclude_ingredients.length > 0) {
                preferences.exclude_ingredients.forEach(ingredient => {
                    message += `• ${ingredient}\n`;
                });
            } else {
                message += `• None set\n`;
            }
            message += `\n`;

            message += `🛒 **Store Layout:**\n`;
            message += `• Current: ${preferences.store_layout || 'Default'}\n\n`;

            message += `💡 **What preferences do:**\n`;
            message += `• Filter out ingredients you can't/won't eat\n`;
            message += `• Customize shopping list organization\n`;
            message += `• Remember your dietary needs\n`;
            message += `• Make shopping more efficient\n\n`;

            message += `🌿 *Configure your perfect shopping experience!* ✨`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🏷️ Dietary Restrictions', callback_data: 'set_dietary_restrictions' },
                            { text: '🚫 Exclude Ingredients', callback_data: 'set_exclude_ingredients' }
                        ],
                        [
                            { text: '🛒 Store Layout', callback_data: 'set_store_layout' },
                            { text: '🔄 Reset All', callback_data: 'reset_preferences' }
                        ],
                        [
                            { text: '⬅️ Back to Shopping', callback_data: 'back_to_shopping_menu' }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error('Shopping preferences error:', error);
            await ctx.reply('🐛 Error loading shopping preferences!');
        }
    });

    bot.action('set_dietary_restrictions', async (ctx) => {
        try {
            await ctx.answerCbQuery('🏷️ Setting dietary restrictions...');
            const currentPreferences = await getUserShoppingPreferences(ctx.dbUser.id);

            global.pendingDietarySettings = global.pendingDietarySettings || new Map();
            global.pendingDietarySettings.set(ctx.from.id, {
                restrictions: currentPreferences.dietary_restrictions || [],
                timestamp: Date.now()
            });

            await showDietaryRestrictionsMenu(ctx, currentPreferences.dietary_restrictions || []);
        } catch (error) {
            console.error('Set dietary restrictions error:', error);
            await ctx.reply('🐛 Error loading dietary restrictions!');
        }
    });

    const showDietaryRestrictionsMenu = async (ctx, currentRestrictions = [], messageId = null) => {
        const restrictions = [
            { key: 'vegetarian', name: '🌱 Vegetarian', desc: 'No meat products' },
            { key: 'vegan', name: '🌿 Vegan', desc: 'No animal products' },
            { key: 'gluten_free', name: '🌾 Gluten-Free', desc: 'No gluten-containing items' },
            { key: 'dairy_free', name: '🥛 Dairy-Free', desc: 'No dairy products' },
            { key: 'keto', name: '🥗 Keto', desc: 'Low-carb, high-fat diet' },
            { key: 'paleo', name: '🥩 Paleo', desc: 'No processed foods, grains, legumes' },
            { key: 'nut_free', name: '🌰 Nut-Free', desc: 'No tree nuts or peanuts' },
            { key: 'shellfish_free', name: '🦐 Shellfish-Free', desc: 'No shellfish or crustaceans' }
        ];

        let message = `🏷️ **Dietary Restrictions** 🏷️\n\n`;
        message += `✅ **Select your dietary restrictions:**\n\n`;

        restrictions.forEach(restriction => {
            const isSelected = currentRestrictions.includes(restriction.key);
            const icon = isSelected ? '✅' : '☐';
            message += `${icon} ${restriction.name}\n`;
            message += `   ${restriction.desc}\n\n`;
        });

        message += `💡 **Selected restrictions will automatically filter ingredients from shopping lists.**\n\n`;
        message += `🌿 *Toggle items above, then save your changes!* ✨`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    ...restrictions.reduce((rows, restriction, index) => {
                        if (index % 2 === 0) {
                            rows.push([]);
                        }
                        const isSelected = currentRestrictions.includes(restriction.key);
                        const icon = isSelected ? '✅' : '☐';
                        rows[rows.length - 1].push({
                            text: `${icon} ${restriction.name.replace(/🌱|🌿|🌾|🥛|🥗|🥩|🌰|🦐/, '')}`,
                            callback_data: `toggle_diet_${restriction.key}`
                        });
                        return rows;
                    }, []),
                    [
                        { text: '💾 Save Changes', callback_data: 'save_dietary_restrictions' },
                        { text: '🔄 Clear All', callback_data: 'clear_dietary_restrictions' }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'shopping_preferences' }
                    ]
                ]
            }
        };

        try {
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
            console.error('Error showing dietary restrictions menu:', error);
            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }
    };

    bot.action('set_exclude_ingredients', async (ctx) => {
        await ctx.answerCbQuery('🚫 Setting ingredient exclusions...');

        await ctx.reply(`🚫 **Exclude Specific Ingredients** 🚫

💭 **Send me ingredients you want to exclude from shopping lists.**

📝 **Examples:**
• "mushrooms"
• "bell peppers, onions"  
• "cilantro, coconut"

🌿 **How it works:**
• These ingredients will be removed from all shopping lists
• Perfect for allergies, dislikes, or dietary restrictions
• Case-insensitive matching

📤 **Send your excluded ingredients list, or /cancel to skip:**`,
            { parse_mode: 'Markdown' });

        global.pendingIngredientExclusions = global.pendingIngredientExclusions || new Map();
        global.pendingIngredientExclusions.set(ctx.from.id, {
            timestamp: Date.now()
        });
    });

    bot.action('set_store_layout', async (ctx) => {
        await ctx.answerCbQuery('🛒 Setting store layout...');

        const message = `🛒 **Store Layout Preference** 🛒

🏪 **Choose your preferred shopping organization:**

💡 **What this affects:**
• Order of categories in shopping lists
• Grouping of similar items
• Flow through your typical store

📍 **Select your store type:**`;
        await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🏪 Default Layout', callback_data: 'layout_default' },
                        { text: '🛒 Grocery Store', callback_data: 'layout_grocery' }
                    ],
                    [
                        { text: '🏬 Supermarket', callback_data: 'layout_supermarket' },
                        { text: '🥬 Farmers Market', callback_data: 'layout_farmers' }
                    ],
                    [
                        { text: '⬅️ Back', callback_data: 'shopping_preferences' }
                    ]
                ]
            }
        });
    });

    const dietaryRestrictions = [
        'vegetarian', 'vegan', 'gluten_free', 'dairy_free',
        'keto', 'paleo', 'nut_free', 'shellfish_free'
    ];

    dietaryRestrictions.forEach(diet => {
        bot.action(`toggle_diet_${diet}`, async (ctx) => {
            try {
                const userId = ctx.from.id;
                const currentState = global.pendingDietarySettings.get(userId);

                if (!currentState) {
                    await ctx.answerCbQuery('❌ Session expired! Please start over.');
                    return;
                }

                if (Date.now() - currentState.timestamp > 10 * 60 * 1000) {
                    global.pendingDietarySettings.delete(userId);
                    await ctx.answerCbQuery('⏰ Session expired! Please start over.');
                    return;
                }

                const restrictions = currentState.restrictions;
                const index = restrictions.indexOf(diet);

                if (index > -1) {
                    restrictions.splice(index, 1);
                    await ctx.answerCbQuery(`❌ Removed ${diet.replace('_', ' ')}`);
                } else {
                    restrictions.push(diet);
                    await ctx.answerCbQuery(`✅ Added ${diet.replace('_', ' ')}`);
                }

                global.pendingDietarySettings.set(userId, {
                    ...currentState,
                    restrictions: restrictions
                });

                await showDietaryRestrictionsMenu(ctx, restrictions, ctx.callbackQuery.message.message_id);

            } catch (error) {
                console.error('Toggle diet error:', error);
                await ctx.answerCbQuery('🐛 Error toggling restriction!');
            }
        });
    });

    const layouts = ['default', 'grocery', 'supermarket', 'farmers'];
    layouts.forEach(layout => {
        bot.action(`layout_${layout}`, async (ctx) => {
            await ctx.answerCbQuery(`🛒 Layout set to ${layout}`);
            try {
                await query(
                    `INSERT INTO user_shopping_preferences (user_id, store_layout) 
                 VALUES ($1, $2) 
                 ON CONFLICT (user_id) 
                 DO UPDATE SET store_layout = EXCLUDED.store_layout`,
                    [ctx.dbUser.id, layout]
                );

                await ctx.editMessageText(
                    `✅ **Store Layout Updated** ✅

🛒 **New Layout:** ${layout.charAt(0).toUpperCase() + layout.slice(1)}
🏪 Shopping lists will now be organized for this store type

🌿 *Your shopping experience just got better!* ✨`,
                    { parse_mode: 'Markdown' }
                );

            } catch (error) {
                console.error('Error saving store layout:', error);
                await ctx.reply('🐛 Error saving layout preference!');
            }
        });
    });

    bot.action('save_dietary_restrictions', async (ctx) => {
        try {
            await ctx.answerCbQuery('💾 Saving dietary restrictions...');
            const userId = ctx.from.id;
            const currentState = global.pendingDietarySettings.get(userId);

            if (!currentState) {
                await ctx.reply('❌ Session expired! Please start over.');
                return;
            }

            await query(
                `INSERT INTO user_shopping_preferences (user_id, dietary_restrictions)
                 VALUES ($1, $2)
                     ON CONFLICT (user_id) 
                 DO UPDATE SET dietary_restrictions = EXCLUDED.dietary_restrictions, updated_at = CURRENT_TIMESTAMP`,
                [ctx.dbUser.id, JSON.stringify(currentState.restrictions)]
            );

            global.pendingDietarySettings.delete(userId);
            await ctx.editMessageText(
                `✅ **Dietary Restrictions Saved!** ✅

🏷️ **Your Restrictions:**
${currentState.restrictions.length > 0 ?
                    currentState.restrictions.map(r => `• ${r.replace('_', ' ')}`).join('\n') :
                    '• None selected'}

🛒 **What this means:**
• Non-compliant ingredients will be filtered from shopping lists
• Automatic dietary compliance checking
• Personalized shopping experience

🌿 *Your shopping lists are now customized to your dietary needs!* ✨`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Save dietary restrictions error:', error);
            await ctx.reply('🐛 Error saving dietary restrictions! Please try again.');
        }
    });

    bot.action('clear_dietary_restrictions', async (ctx) => {
        try {
            await ctx.answerCbQuery('🔄 Clearing all restrictions...');
            const userId = ctx.from.id;
            const currentState = global.pendingDietarySettings.get(userId);

            if (!currentState) {
                await ctx.reply('❌ Session expired! Please start over.');
                return;
            }

            currentState.restrictions = [];
            global.pendingDietarySettings.set(userId, currentState);

            await showDietaryRestrictionsMenu(ctx, [], ctx.callbackQuery.message.message_id);

        } catch (error) {
            console.error('Clear dietary restrictions error:', error);
            await ctx.answerCbQuery('🐛 Error clearing restrictions!');
        }
    });

    bot.action(/^view_shopping_list_(\d+)$/, async (ctx) => {
        try {
            const listId = parseInt(ctx.match[1]);
            await ctx.answerCbQuery('👁️ Loading shopping list...');

            const result = await query(
                'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
                [listId, ctx.dbUser.id]
            );

            if (result.rows.length === 0) {
                await ctx.reply('❌ Shopping list not found or not accessible!');
                return;
            }

            const shoppingList = result.rows[0];
            const createdDate = new Date(shoppingList.created_at).toLocaleDateString();
            const categorizedIngredients = shoppingList.categorized_ingredients;

            let message = `🛒 **${shoppingList.name}** 🛒\n\n`;
            message += `📊 **Details:**\n`;
            message += `• **${shoppingList.total_items}** items from **${shoppingList.recipe_count}** recipes\n`;
            message += `• **Created:** ${createdDate}\n`;
            message += `• **Status:** ${shoppingList.is_completed ? '✅ Completed' : '📝 Active'}\n\n`;

            message += `📝 **Shopping List:**\n\n`;

            for (const [categoryKey, ingredients] of Object.entries(categorizedIngredients)) {
                const categoryName = INGREDIENT_CATEGORIES[categoryKey]?.name || '📦 Other';
                message += `${categoryName}:\n`;

                ingredients.forEach(ingredient => {
                    const checkBox = shoppingList.is_completed ? '✅' : '☐';
                    let itemText = `${checkBox} ${ingredient.combinedText}`;

                    if (ingredient.isConsolidated && ingredient.recipes && ingredient.recipes.length > 1) {
                        itemText += ` *(${ingredient.recipes.length} recipes)*`;
                    }

                    message += `  ${itemText}\n`;
                });
                message += `\n`;
            }

            message += `💡 **Shopping Tips:**\n`;
            message += `• Use this as your shopping reference\n`;
            message += `• Check items off as you shop\n`;
            if (!shoppingList.is_completed) {
                message += `• Mark as complete when done shopping\n`;
            }
            message += `\n🌿 *Happy shopping!* ✨`;

            const buttons = [
                [
                    { text: '🗑️ Delete List', callback_data: `delete_shopping_list_${listId}` }
                ],
                [
                    { text: '⬅️ Back to Lists', callback_data: 'view_shopping_lists' }
                ]
            ];

            if (!shoppingList.is_completed) {
                buttons.unshift([
                    { text: '✅ Mark Complete', callback_data: `complete_shopping_list_${listId}` },
                    { text: '🔄 Mark Incomplete', callback_data: `incomplete_shopping_list_${listId}` }
                ]);
            } else {
                buttons.unshift([
                    { text: '🔄 Mark Incomplete', callback_data: `incomplete_shopping_list_${listId}` }
                ]);
            }

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
            });

        } catch (error) {
            console.error('View shopping list error:', error);
            await ctx.reply('🐛 Error loading shopping list!');
        }
    });

    bot.action(/^complete_shopping_list_(\d+)$/, async (ctx) => {
        try {
            const listId = parseInt(ctx.match[1]);
            await ctx.answerCbQuery('✅ Marking list as complete...');

            await query(
                'UPDATE shopping_lists SET is_completed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
                [listId, ctx.dbUser.id]
            );

            await ctx.reply('✅ **Shopping List Completed!** ✅\n\n🎉 Great job finishing your shopping!\n🌿 *Ready for some cooking!* ✨',
                { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Complete shopping list error:', error);
            await ctx.reply('🐛 Error updating shopping list!');
        }
    });

    bot.action(/^incomplete_shopping_list_(\d+)$/, async (ctx) => {
        try {
            const listId = parseInt(ctx.match[1]);
            await ctx.answerCbQuery('🔄 Marking list as incomplete...');

            await query(
                'UPDATE shopping_lists SET is_completed = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
                [listId, ctx.dbUser.id]
            );

            await ctx.reply('🔄 **Shopping List Reopened** 🔄\n\n📝 List is now active again!\n🛒 *Happy shopping!* ✨',
                { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Reopen shopping list error:', error);
            await ctx.reply('🐛 Error updating shopping list!');
        }
    });

    bot.action('reset_preferences', async (ctx) => {
        try {
            await ctx.answerCbQuery('🔄 Resetting all preferences...');

            await ctx.reply(`🔄 **Reset All Preferences** 🔄

⚠️ **This will permanently delete:**
• All dietary restrictions
• All excluded ingredients  
• Store layout preference
• Any other shopping customizations

🌿 **Are you sure you want to reset everything?**

⚡ *This action cannot be undone!*`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Yes, Reset Everything', callback_data: 'confirm_reset_preferences' },
                                { text: '❌ No, Keep My Settings', callback_data: 'cancel_reset_preferences' }
                            ]
                        ]
                    }
                }
            );

        } catch (error) {
            console.error('Reset preferences error:', error);
            await ctx.reply('🐛 Error loading reset options!');
        }
    });

    bot.action('confirm_reset_preferences', async (ctx) => {
        try {
            await ctx.answerCbQuery('🗑️ Resetting all preferences...');

            await query(
                'DELETE FROM user_shopping_preferences WHERE user_id = $1',
                [ctx.dbUser.id]
            );

            if (global.pendingDietarySettings) {
                global.pendingDietarySettings.delete(ctx.from.id);
            }
            if (global.pendingIngredientExclusions) {
                global.pendingIngredientExclusions.delete(ctx.from.id);
            }

            await ctx.editMessageText(
                `✅ **All Preferences Reset!** ✅

🧹 **What was cleared:**
• ✅ Dietary restrictions removed
• ✅ Excluded ingredients cleared
• ✅ Store layout reset to default
• ✅ All shopping customizations removed

🌿 **Fresh Start!**
Your shopping lists will now use default settings. You can set up new preferences anytime through the shopping menu.

✨ *Ready for a new culinary adventure!* ✨`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Confirm reset preferences error:', error);
            await ctx.reply('🐛 Error resetting preferences! Please try again.');
        }
    });

    bot.action('cancel_reset_preferences', async (ctx) => {
        try {
            await ctx.answerCbQuery('❌ Reset cancelled');
            await ctx.editMessageText(
                `🌿 **Preferences Preserved** 🌿

📝 Your shopping preferences remain safely stored
✨ *Wise choice! Your customizations are valuable!* ✨

⚙️ Use the shopping preferences menu to make individual changes anytime.`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Cancel reset preferences error:', error);
        }
    });

    setInterval(() => {
        const now = Date.now();
        const timeout = 10 * 60 * 1000; // 10 min

        if (global.pendingDietarySettings) {
            for (const [userId, state] of global.pendingDietarySettings.entries()) {
                if (now - state.timestamp > timeout) {
                    global.pendingDietarySettings.delete(userId);
                    console.log(`🧹 Cleaned up expired dietary settings for user ${userId}`);
                }
            }
        }

        if (global.pendingIngredientExclusions) {
            for (const [userId, state] of global.pendingIngredientExclusions.entries()) {
                if (now - state.timestamp > timeout) {
                    global.pendingIngredientExclusions.delete(userId);
                    console.log(`🧹 Cleaned up expired ingredient exclusions for user ${userId}`);
                }
            }
        }
    }, 5 * 60 * 1000);  // every 5 min
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