const { getRecipeById } = require('../database/recipeService');
const { scaleRecipe } = require('../services/recipeScaler');

const setupScaleButtonHandlers = (bot) => {
    bot.action(/scale_recipe_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('⚖️ Loading recipe for scaling...');

            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found or not accessible!');
                return;
            }

            const originalServings = recipe.servings || 'Unknown';
            const message = `⚖️ **Recipe Scaling Options** ⚖️

📝 **Recipe:** ${recipe.title}
🍽️ **Current Servings:** ${originalServings}
📅 **Created:** ${new Date(recipe.created_at).toLocaleDateString()}

🎯 **Choose your scaling factor:**

• **0.5x** - Half portions (great for testing)
• **1x** - Original recipe (no scaling)
• **2x** - Double portions (family meal)
• **4x** - Quadruple portions (meal prep/party)
• **Custom** - Enter any specific number

🌿 *Smart scaling adjusts ingredients, timing, and equipment!* ✨`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '0.5x Half', callback_data: `scale_factor_${recipeId}_0.5` },
                            { text: '1x Original', callback_data: `scale_factor_${recipeId}_1` }
                        ],
                        [
                            { text: '2x Double', callback_data: `scale_factor_${recipeId}_2` },
                            { text: '4x Quadruple', callback_data: `scale_factor_${recipeId}_4` }
                        ],
                        [
                            { text: '🔢 Custom Scale', callback_data: `scale_custom_${recipeId}` }
                        ],
                        [
                            { text: '📖 Preview Recipe', callback_data: `view_recipe_${recipeId}` },
                            { text: '⬅️ Back to Scale Menu', callback_data: 'back_to_scale_menu' }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error('Scale recipe selection error:', error);
            await ctx.reply('🐛 Error loading recipe for scaling!');
        }
    });

    bot.action(/scale_factor_(\d+)_([\d\.]+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            const scaleFactor = parseFloat(ctx.match[2]);

            await ctx.answerCbQuery(`⚖️ Scaling recipe by ${scaleFactor}x...`);

            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found!');
                return;
            }

            const processingMsg = await ctx.reply(`🔄 **Scaling in Progress** 🔄

⚖️ **Recipe:** ${recipe.title}
🔢 **Scale Factor:** ${scaleFactor}x
🧮 **Processing:** Adjusting ingredients and timing...

*Smart scaling magic in progress...* 🌿✨`,
                { parse_mode: 'Markdown' });

            const scalingResult = await scaleRecipe(recipe, scaleFactor, ctx);

            if (scalingResult.success) {
                try {
                    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                } catch (e) {}

                await ctx.reply(`✅ **Recipe Successfully Scaled!** ✅

${scalingResult.scaledRecipeText}`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '📊 Try Different Scale', callback_data: `scale_recipe_${recipeId}` },
                                    { text: '📖 View Original', callback_data: `view_recipe_${recipeId}` }
                                ],
                                [
                                    { text: '💾 Save Scaled Version', callback_data: `save_scaled_${recipeId}_${scaleFactor}` }
                                ],
                                [
                                    { text: '⬅️ Back to Scaling', callback_data: 'back_to_scale_menu' }
                                ]
                            ]
                        }
                    });

                setTimeout(async () => {
                    const summary = `📊 **Scaling Summary** 📊

🔢 **Factor:** ${scaleFactor}x scaling applied
🍽️ **Servings:** ${scalingResult.originalServings} → ${scalingResult.newServings}
📈 **Changes:**
${scalingResult.scalingNotes.map(note => `• ${note}`).join('\n')}

⚡ **Pro Tips:**
• Monitor cooking closely on first attempt
• Taste and adjust seasonings after scaling
• Check equipment size requirements

🌿 *Perfect portions achieved!* ✨`;

                    await ctx.reply(summary, { parse_mode: 'Markdown' });
                }, 1000);

            } else {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    `❌ **Scaling Failed** ❌

🐛 **Error:** ${scalingResult.error || 'Unknown scaling error'}

🔧 **Possible causes:**
- Complex recipe format not supported
- Missing ingredient quantity information
- Recipe text parsing issues

📝 **What you can do:**
- Try viewing the original recipe
- Manual scaling may be needed
- Contact support if this persists

🌿 *Moss is learning to scale more recipe formats!* ✨`,
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (error) {
            console.error('Recipe scaling error:', error);
            await ctx.reply(`🐛 **Scaling Error** 🐛

${error.message || 'Unknown scaling error occurred'}

🔧 Please try again or try a different scale factor.`);
        }
    });

    bot.action(/scale_custom_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('🔢 Please enter custom scale factor...');

            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found!');
                return;
            }

            await ctx.reply(`🔢 **Custom Recipe Scaling** 🔢

📝 **Recipe:** ${recipe.title}
🍽️ **Current Servings:** ${recipe.servings || 'Unknown'}

🎯 **Enter your custom scale factor:**

**Examples:**
• **0.75** for 3/4 portions
• **1.5** for 1.5x portions  
• **3** for triple portions
• **6** for 6x portions

📤 **Send a number** (decimals allowed) and I'll scale the recipe!

*Or send /cancel to go back.*

🌿 *Any scale factor between 0.1 and 10 works!* ✨`,
                { parse_mode: 'Markdown' });

            if (!global.pendingCustomScaling) {
                global.pendingCustomScaling = new Map();
            }

            global.pendingCustomScaling.set(ctx.from.id, {
                recipeId: recipeId,
                recipeTitle: recipe.title,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Custom scaling setup error:', error);
            await ctx.reply('🐛 Error setting up custom scaling!');
        }
    });

    bot.action(/save_scaled_(\d+)_([\d\.]+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            const scaleFactor = parseFloat(ctx.match[2]);

            await ctx.answerCbQuery('💾 Saving scaled recipe...');

            await ctx.reply(`💾 **Save Scaled Recipe** 💾

🔄 **This feature is coming soon!**

📝 **What it will do:**
• Save the scaled recipe as a new entry
• Preserve both original and scaled versions
• Add scaling notes and modifications
• Allow custom naming for scaled recipes

🎯 **For now, you can:**
• Screenshot the scaled recipe above
• Copy the text for manual saving
• Bookmark this chat message

🌿 *Recipe saving enhancement coming in Phase 2!* ✨`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📊 Scale Again', callback_data: `scale_recipe_${recipeId}` },
                                { text: '⬅️ Back to Menu', callback_data: 'back_to_scale_menu' }
                            ]
                        ]
                    }
                });

        } catch (error) {
            console.error('Save scaled recipe error:', error);
            await ctx.reply('🐛 Error preparing to save scaled recipe!');
        }
    });

    bot.action('back_to_scale_menu', async (ctx) => {
        await ctx.answerCbQuery('⚖️ Back to scaling center');
        await ctx.deleteMessage();
        const { scaleCommand } = require('../commands/scale');
        await scaleCommand(ctx);
    });
};

const handleCustomScalingInput = async (ctx, userMessage) => {
    if (!global.pendingCustomScaling) return false;

    const userId = ctx.from.id;
    const pendingScale = global.pendingCustomScaling.get(userId);

    if (!pendingScale) return false;

    if (Date.now() - pendingScale.timestamp > 5 * 60 * 1000) {
        global.pendingCustomScaling.delete(userId);
        await ctx.reply('⏰ Custom scaling session expired. Please use /scale to try again.');
        return true;
    }

    if (userMessage.toLowerCase().trim() === '/cancel') {
        global.pendingCustomScaling.delete(userId);
        await ctx.reply('❌ Custom scaling cancelled.');
        return true;
    }

    const scaleMatch = userMessage.match(/^(\d*\.?\d+)$/);
    if (!scaleMatch) {
        await ctx.reply(`🔢 **Invalid Scale Factor** 🔢

❌ "${userMessage}" is not a valid number.

📝 **Please send:**
• A number like **2** or **1.5** or **0.75**
• Decimals are allowed
• Range: 0.1 to 10

🌿 *Try again or send /cancel to stop.* ✨`);
        return true;
    }

    const scaleFactor = parseFloat(scaleMatch[1]);
    if (scaleFactor < 0.1 || scaleFactor > 10) {
        await ctx.reply(`⚠️ **Scale Factor Out of Range** ⚠️

🔢 **${scaleFactor}** is outside the supported range.

📊 **Supported range:** 0.1x to 10x
• **Minimum:** 0.1 (1/10th portions)
• **Maximum:** 10 (ten times larger)

🌿 *Please enter a number between 0.1 and 10.* ✨`);
        return true;
    }

    global.pendingCustomScaling.delete(userId);

    try {
        const recipe = await getRecipeById(pendingScale.recipeId, ctx.dbUser.id);
        if (!recipe) {
            await ctx.reply('❌ Recipe not found! Please try scaling again.');
            return true;
        }

        const processingMsg = await ctx.reply(`🔄 **Custom Scaling in Progress** 🔄

⚖️ **Recipe:** ${pendingScale.recipeTitle}
🔢 **Custom Factor:** ${scaleFactor}x
🧮 **Processing:** Adjusting ingredients and timing...

*Custom scaling magic in progress...* 🌿✨`,
            { parse_mode: 'Markdown' });

        const scalingResult = await scaleRecipe(recipe, scaleFactor, ctx);

        if (scalingResult.success) {
            // rmv processing msg
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            } catch (e) {}

            // results
            await ctx.reply(`✅ **Custom Scaling Complete!** ✅

${scalingResult.scaledRecipeText}`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📊 Try Different Scale', callback_data: `scale_recipe_${pendingScale.recipeId}` },
                                { text: '📖 View Original', callback_data: `view_recipe_${pendingScale.recipeId}` }
                            ],
                            [
                                { text: '⬅️ Back to Scaling', callback_data: 'back_to_scale_menu' }
                            ]
                        ]
                    }
                });

        } else {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                processingMsg.message_id,
                null,
                `❌ **Custom Scaling Failed** ❌

🐛 **Error:** ${scalingResult.error || 'Unknown scaling error'}

🔧 The custom factor ${scaleFactor}x couldn't be applied.
🌿 *Please try with a different scale factor.* ✨`,
                { parse_mode: 'Markdown' }
            );
        }

    } catch (error) {
        console.error('Custom scaling error:', error);
        await ctx.reply(`🐛 **Custom Scaling Error** 🐛

${error.message || 'Unknown error during custom scaling'}

🔧 Please try again with a different scale factor.`);
    }

    return true;
};

module.exports = {
    setupScaleButtonHandlers,
    handleCustomScalingInput
};