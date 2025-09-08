const { pendingDownloads } = require('../services/videoDownload');
const { rateRecipe, getRecipeRating, deleteRecipeRating } = require('../database/ratingService');
const { getRecipeById, updateRecipeNutrition  } = require('../database/recipeService');
const { query } = require('../database/connection');
const { analyzeRecipeNutrition } = require('../services/nutritionAnalyzer');

const safeEditMessage = async (ctx, text, options = {}) => {
    try {
        await ctx.editMessageText(text, options);
    } catch (error) {
        if (error.message.includes('message is not modified')) {
            console.log('Message already shows expected content - skipping edit');
            return;
        } else if (error.message.includes('message to edit not found')) {
            await ctx.reply(text, options);
        } else {
            throw error;
        }
    }
};

const setupDownloadHandlers = (bot) => {
    bot.action('download_confirm', async (ctx) => {
        try {
            await ctx.answerCbQuery('🔮 Starting download ritual!');

            const userId = ctx.from.id;
            const pending = pendingDownloads.get(userId);

            if (!pending) {
                await safeEditMessage(ctx,
                    '⚠️ *Download session expired!* Please send the video link again.',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            pendingDownloads.delete(userId);

            await safeEditMessage(ctx,
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

            await safeEditMessage(ctx,
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

            await safeEditMessage(ctx,
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

const setupRecipeHandlers = (bot) => {
    bot.action(/view_recipe_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('📖 Loading recipe...');

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

            let message = `📖 **${recipe.title}** 📖

${recipe.structured_recipe}`;

            if (recipe.user_rating) {
                const stars = '⭐'.repeat(recipe.user_rating);
                message += `\n\n⭐ **Your Rating:** ${stars} (${recipe.user_rating}/5)`;
                if (recipe.rating_notes) {
                    message += `\n💭 **Notes:** "${recipe.rating_notes}"`;
                }
            }

            message += `\n\n📅 **Saved:** ${new Date(recipe.created_at).toLocaleDateString()}
📱 **Platform:** ${recipe.video_platform}

🌿 *From your digital grimoire* ✨`;

            await ctx.reply(message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('View recipe error:', error);
            await ctx.reply('🐛 Error loading recipe!');
        }
    });

    bot.action(/delete_recipe_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('🗑️ Confirm deletion...');

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

    bot.action(/confirm_delete_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('🗑️ Deleting recipe...');

            const { deleteRecipe } = require('../database/recipeService');
            const deleted = await deleteRecipe(recipeId, ctx.dbUser.id);

            if (deleted) {
                await safeEditMessage(ctx,
                    `✅ **Recipe Deleted Successfully** ✅

🗑️ The recipe has been removed from your grimoire
📚 Your collection has been updated

🌿 *The digital scroll returns to the ether...* ✨`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await safeEditMessage(ctx,
                    '❌ **Deletion Failed** ❌\n\nRecipe not found or not accessible.',
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (error) {
            console.error('Confirm delete error:', error);
            await ctx.reply('🐛 Error deleting recipe!');
        }
    });

    bot.action('cancel_delete', async (ctx) => {
        try {
            await ctx.answerCbQuery('❌ Deletion cancelled');
            await safeEditMessage(ctx,
                `🌿 **Recipe Preserved** 🌿

📚 Your recipe remains safely in the grimoire
✨ *Moss approves of your careful consideration!* ✨`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Cancel delete error:', error);
        }
    });

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

    bot.action(/^scale_recipe_(\d+)$/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('⚖️ Opening scaling options...');
            const { setupScaleButtonHandlers } = require('./scaleHandlers');

            const mockContext = {
                ...ctx,
                match: [null, recipeId] // Simulate the match result
            };

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
                            { text: '⬅️ Back', callback_data: 'back_to_recipe' }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error('Scale button handler error:', error);
            await ctx.reply('🐛 Error opening scaling options!');
        }
    });

    bot.action(/^analyze_nutrition_(\d+)$/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('🔬 Analyzing nutrition...');
            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found or not accessible!');
                return;
            }

            const processingMsg = await ctx.reply(`🔬 **Analyzing Nutrition** 🔬

📊 Calculating calories and macronutrients for "${recipe.title}"...
🍎 Analyzing dietary compatibility...

*This will take a moment...* ⚡`,
                { parse_mode: 'Markdown' });

            const nutritionResult = await analyzeRecipeNutrition(recipe.structured_recipe, recipe.title);

            if (nutritionResult.success) {
                const updatedRecipeContent = recipe.structured_recipe + nutritionResult.nutritionText;
                try {
                    await updateRecipeNutrition(recipeId, ctx.dbUser.id, updatedRecipeContent);
                } catch (updateError) {
                    console.log('Could not update recipe in database:', updateError.message);
                }

                try {
                    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                } catch (error) {}

                await ctx.reply(`✅ Nutrition Analysis Complete! ✅

📝 **Recipe:** ${recipe.title}

${nutritionResult.nutritionText}

💾 *Nutrition information has been saved to your recipe!*

🌿 *Use this data to make informed health choices!* ✨`,
                    { parse_mode: 'Markdown' });

                const updatedButtons = getUpdatedRecipeKeyboard(recipeId, true);
                await ctx.reply(`🍳 Updated Recipe Actions:`, {
                    reply_markup: updatedButtons
                });

            } else {
                try {
                    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                } catch (error) {}
                await ctx.reply(`❌ Nutrition Analysis Failed ❌

🐛 **Issue:** ${nutritionResult.error}

🔧 **Possible causes:**
• Ingredients not in nutrition database
• Unclear ingredient quantities  
• Complex ingredient preparations

💡 **What you can try:**
• Check if ingredients have clear measurements
• Some recipes work better than others
• Complex dishes may need manual analysis

🌿 *Don't worry - your recipe is still saved!* ✨`,
                    { parse_mode: 'Markdown' });
            }

        } catch (error) {
            console.error('Nutrition analysis button error:', error);
            await ctx.reply('🐛 Error during nutrition analysis! Please try again.');
        }
    });

    bot.action('nutrition_help', async (ctx) => {
        await ctx.answerCbQuery('💡 Loading nutrition help...');

        const helpMessage = `📊 **About Nutrition Analysis** 📊

🔬 **What it analyzes:**
• 🔥 **Calories** per serving and total recipe
• 💪 **Macronutrients** (protein, carbs, fat)
• 🥗 **Fiber and sugar** content
• 🏷️ **Dietary tags** (vegan, gluten-free, etc.)
• 💡 **Health insights** and recommendations

📋 **How it works:**
• Analyzes ingredients from your recipe
• Uses nutrition database of 50+ common foods
• Calculates based on ingredient quantities
• Provides estimates for healthy meal planning

⚖️ **Accuracy notes:**
• Values are estimates based on standard data
• Actual nutrition may vary by preparation
• Best for general dietary guidance
• Professional nutrition advice recommended for medical needs

🍎 **Perfect for:**
• Calorie counting and weight management
• Macro tracking for fitness goals
• Identifying dietary restriction compatibility
• Making informed healthy choices

🌿 *Click "Analyze Nutrition" on any recipe to get detailed health information!* ✨`;

        await ctx.reply(helpMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⬅️ Back', callback_data: 'nutrition_help_back' }]
                ]
            }
        });
    });

    bot.action('nutrition_help_back', async (ctx) => {
        await ctx.answerCbQuery('⬅️ Going back...');
        await ctx.deleteMessage();
    });
};

const getRecipeKeyboard = (recipeId, hasNutritionAnalysis = false) => {
    const baseButtons = [
        [
            { text: '⭐ Rate', callback_data: `rate_recipe_${recipeId}` },
            { text: '⚖️ Scale', callback_data: `scale_recipe_${recipeId}` }
        ]
    ];

    if (!hasNutritionAnalysis) {
        baseButtons.push([
            { text: '📊 Analyze Nutrition', callback_data: `analyze_nutrition_${recipeId}` },
            { text: '💡 Nutrition Help', callback_data: 'nutrition_help' }
        ]);
    } else {
        baseButtons.push([
            { text: '✅ Nutrition Analyzed', callback_data: 'nutrition_already_done' },
            { text: '🔄 Re-analyze', callback_data: `analyze_nutrition_${recipeId}` }
        ]);
    }

    return {
        inline_keyboard: baseButtons
    };
};

const getUpdatedRecipeKeyboard = (recipeId, hasNutrition = true) => {
    return {
        inline_keyboard: [
            [
                { text: '⭐ Rate', callback_data: `rate_recipe_${recipeId}` },
                { text: '⚖️ Scale', callback_data: `scale_recipe_${recipeId}` }
            ],
            [
                { text: '✅ Nutrition Complete', callback_data: 'nutrition_already_done' },
                { text: '🔄 Re-analyze', callback_data: `analyze_nutrition_${recipeId}` }
            ],
            [
                { text: '📖 View Recipe', callback_data: `view_recipe_${recipeId}` }
            ]
        ]
    };
};

const setupNutritionStatusHandlers = (bot) => {
    bot.action('nutrition_already_done', async (ctx) => {
        await ctx.answerCbQuery('✅ This recipe already has nutrition analysis!');

        await ctx.reply(`✅ **Nutrition Already Analyzed** ✅

📊 This recipe already includes detailed nutrition information!

🔍 **To view the nutrition data:**
• Scroll up to see the complete recipe with nutrition
• Look for the "📊 NUTRITION ANALYSIS" section

🔄 **To update the analysis:**
• Click "Re-analyze" if you've modified ingredients
• Useful if the original analysis had errors

🌿 *Your health data is ready to use!* ✨`,
            { parse_mode: 'Markdown' });
    });
};

const setupRatingButtonHandlers = (bot) => {
    bot.action(/rate_recipe_(\d+)/, async (ctx) => {
        console.log(`🔍 RATE_RECIPE HANDLER CALLED: Recipe ${ctx.match[1]}, User ${ctx.dbUser.id}`);

        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('⭐ Opening rating interface...');

            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found or not accessible!');
                return;
            }

            const existingRating = await getRecipeRating(recipeId, ctx.dbUser.id);
            console.log(`🔍 EXISTING RATING:`, existingRating);

            const ratingText = existingRating ?
                `🔄 **Update Rating** 🔄\n\n📝 **Recipe:** ${recipe.title}\n⭐ **Current Rating:** ${existingRating.rating}/5 stars\n${existingRating.notes ? `💭 **Notes:** "${existingRating.notes}"\n` : ''}\n🌿 *Choose your new rating:*` :
                `⭐ **Rate This Recipe** ⭐\n\n📝 **Recipe:** ${recipe.title}\n📅 **Created:** ${new Date(recipe.created_at).toLocaleDateString()}\n\n🌿 *How would you rate this recipe?*`;

            await ctx.reply(ratingText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⭐⭐⭐⭐⭐ (5)', callback_data: `set_rating_${recipeId}_5` },
                            { text: '⭐⭐⭐⭐☆ (4)', callback_data: `set_rating_${recipeId}_4` }
                        ],
                        [
                            { text: '⭐⭐⭐☆☆ (3)', callback_data: `set_rating_${recipeId}_3` },
                            { text: '⭐⭐☆☆☆ (2)', callback_data: `set_rating_${recipeId}_2` }
                        ],
                        [
                            { text: '⭐☆☆☆☆ (1)', callback_data: `set_rating_${recipeId}_1` }
                        ],
                        [
                            { text: '📝 Add Notes', callback_data: `rate_notes_${recipeId}` },
                            existingRating ? { text: '🗑️ Remove Rating', callback_data: `remove_rating_${recipeId}` } : { text: '❌ Cancel', callback_data: 'cancel_rating' }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error('Rate recipe error:', error);
            await ctx.reply('🐛 Error opening rating interface!');
        }
    });

    bot.action(/set_rating_(\d+)_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            const rating = parseInt(ctx.match[2]);

            await ctx.answerCbQuery(`⭐ Rating set to ${rating} stars!`);

            const result = await rateRecipe(recipeId, ctx.dbUser.id, rating);

            if (result.success) {
                const stars = '⭐'.repeat(rating);
                const ratingWord = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating];

                await safeEditMessage(ctx, `✅ **Rating Saved!** ✅

📝 **Recipe:** ${result.recipeTitle}
⭐ **Rating:** ${stars} (${rating}/5) - ${ratingWord}

🌿 *Would you like to add notes about this recipe?*`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📝 Add Notes', callback_data: `rate_notes_${recipeId}` },
                                { text: '🔄 Change Rating', callback_data: `rate_recipe_${recipeId}` }
                            ],
                            [
                                { text: '✅ Done', callback_data: 'rating_complete' }
                            ]
                        ]
                    }
                });
            }

        } catch (error) {
            console.error('Set rating error:', error);
            await ctx.reply('🐛 Error saving rating! Please try again.');
        }
    });

    bot.action(/rate_notes_(\d+)/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('📝 Please send your notes...');

            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found!');
                return;
            }

            await ctx.reply(`📝 **Add Rating Notes** 📝

📜 **Recipe:** ${recipe.title}

💭 **Please send your notes about this recipe:**
• What did you think?
• Any modifications you made?
• Tips for next time?
• How did it turn out?

*Send your message and I'll save it with your rating!*

*Or send /cancel to skip notes.*`, {
                parse_mode: 'Markdown'
            });

            global.pendingRatingNotes = global.pendingRatingNotes || new Map();
            global.pendingRatingNotes.set(ctx.from.id, {
                recipeId: recipeId,
                recipeTitle: recipe.title,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Rating notes error:', error);
            await ctx.reply('🐛 Error setting up notes interface!');
        }
    });

    bot.action(/^remove_rating_(\d+)$/, async (ctx) => {
        console.log(`🔍 REMOVE_RATING HANDLER CALLED: Recipe ${ctx.match[1]}, User ${ctx.dbUser.id}`);

        try {
            const recipeId = ctx.match[1];
            await ctx.answerCbQuery('🗑️ Removing rating...');

            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found!');
                return;
            }

            console.log(`🔍 SHOWING CONFIRMATION for recipe ${recipeId}`);

            await safeEditMessage(ctx, `🗑️ **Confirm Rating Removal** 🗑️

📝 **Recipe:** ${recipe.title}

⚠️ Are you sure you want to remove your rating for this recipe?

🌿 *This action cannot be undone.*`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Yes, Remove Rating', callback_data: `confirm_remove_rating_${recipeId}` },
                            { text: '❌ No, Keep Rating', callback_data: `rate_recipe_${recipeId}` }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error('Remove rating error:', error);
            await ctx.reply('🐛 Error preparing rating removal!');
        }
    });

    bot.action(/^confirm_remove_rating_(\d+)$/, async (ctx) => {
        console.log(`🔍 CONFIRM_REMOVE_RATING HANDLER CALLED: Recipe ${ctx.match[1]}, User ${ctx.dbUser.id}`);

        try {
            const recipeId = parseInt(ctx.match[1]);
            await ctx.answerCbQuery('🗑️ Removing rating...');

            console.log(`🗑️ ATTEMPTING DELETE: Recipe ${recipeId}, User ${ctx.dbUser.id}`);
            const beforeRating = await getRecipeRating(recipeId, ctx.dbUser.id);
            console.log(`🔍 RATING BEFORE DELETE:`, beforeRating);

            const deleted = await deleteRecipeRating(recipeId, ctx.dbUser.id);
            console.log(`🗑️ DELETE FUNCTION RESULT: ${deleted}`);

            const afterRating = await getRecipeRating(recipeId, ctx.dbUser.id);
            console.log(`🔍 RATING AFTER DELETE:`, afterRating);

            if (deleted) {
                await safeEditMessage(ctx, `✅ **Rating Successfully Removed!** ✅

🗑️ The rating has been permanently deleted
📝 You can rate this recipe again anytime

🌿 *Rating cleared successfully!* ✨`, {
                    parse_mode: 'Markdown'
                });
            } else {
                await safeEditMessage(ctx, `❌ **Rating Removal Failed** ❌

Could not remove the rating. It may have already been deleted.`, {
                    parse_mode: 'Markdown'
                });
            }

        } catch (error) {
            console.error('🐛 CONFIRM REMOVE ERROR:', error);
            await ctx.reply(`🐛 Error: ${error.message}`);
        }
    });

    bot.action('rating_complete', async (ctx) => {
        await ctx.answerCbQuery('✅ Rating saved!');
        await safeEditMessage(ctx, `✅ <b>Rating Process Complete</b> ✅

⭐ Your rating has been saved successfully!

📊 Use /rate to view all your ratings
🏆 Use /my_recipes to see your collection

🌿 <i>Thank you for rating your recipes!</i> ✨`, {
            parse_mode: 'HTML'
        });
    });

    bot.action('cancel_rating', async (ctx) => {
        await ctx.answerCbQuery('❌ Rating cancelled');
        await safeEditMessage(ctx, `❌ <b>Rating Cancelled</b> ❌

No rating was saved.

📊 Use /rate anytime to rate your recipes
🍳 Keep cooking and building your collection!

🌿 <i>Moss returns to the grimoire...</i> ✨`, {
            parse_mode: 'HTML'
        });
    });
};

const setupStatsHandlers = (bot) => {
    bot.action('open_rate_command', async (ctx) => {
        await ctx.answerCbQuery('⭐ Opening rating center...');
        const { rateCommand } = require('../commands/rate');
        await rateCommand(ctx);
    });

    bot.action('open_my_recipes', async (ctx) => {
        await ctx.answerCbQuery('📚 Opening recipe collection...');
        const myRecipesCommand = require('../commands/myRecipes');
        await myRecipesCommand(ctx);
    });
};

const setupNutritionHandlers = (bot) => {
    bot.action(/^analyze_nutrition_(\d+)$/, async (ctx) => {
        try {
            const recipeId = ctx.match[1];

            await ctx.answerCbQuery('🔬 Analyzing nutrition...');

            const recipe = await getRecipeById(recipeId, ctx.dbUser.id);
            if (!recipe) {
                await ctx.reply('❌ Recipe not found or not accessible!');
                return;
            }

            const processingMsg = await ctx.reply(`🔬 **Analyzing Nutrition** 🔬

📊 Calculating calories and macronutrients for "${recipe.title}"...
🍎 Analyzing dietary compatibility...

*This will take a moment...* ⚡`,
                { parse_mode: 'Markdown' });

            const nutritionResult = await analyzeRecipeNutrition(recipe.structured_recipe, recipe.title);

            if (nutritionResult.success) {
                const updatedRecipeContent = recipe.structured_recipe + nutritionResult.nutritionText;
                try {
                    await updateRecipeNutrition(recipeId, ctx.dbUser.id, updatedRecipeContent);
                } catch (updateError) {
                    console.log('Could not update recipe in database:', updateError.message);
                }

                try {
                    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                } catch (error) {}

                await ctx.reply(`✅ **Nutrition Analysis Complete!** ✅

📝 **Recipe:** ${recipe.title}

${nutritionResult.nutritionText}

💾 *Nutrition information has been saved to your recipe!*

🌿 *Use this data to make informed health choices!* ✨`,
                    { parse_mode: 'Markdown' });

                setTimeout(async () => {
                    try {
                        await ctx.reply(`🔄 **Recipe Updated!** 

📊 Nutrition analysis has been added to "${recipe.title}"
✅ Future views will include the nutrition data
🔍 Use /my_recipes to see your updated collection

*Recipe now includes complete health information!* 🌿✨`,
                            { parse_mode: 'Markdown' });
                    } catch (error) {}
                }, 1000);

            } else {
                try {
                    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                } catch (error) {}
                await ctx.reply(`❌ **Nutrition Analysis Failed** ❌

🐛 **Issue:** ${nutritionResult.error}

🔧 **Possible causes:**
• Ingredients not in nutrition database
• Unclear ingredient quantities  
• Complex ingredient preparations

💡 **What you can try:**
• Check if ingredients have clear measurements
• Some recipes work better than others
• Complex dishes may need manual analysis

🌿 *Don't worry - your recipe is still saved!* ✨`,
                    { parse_mode: 'Markdown' });
            }
        } catch (error) {
            console.error('Nutrition analysis button error:', error);
            await ctx.reply('🐛 Error during nutrition analysis! Please try again.');
        }
    });

    bot.action('nutrition_help', async (ctx) => {
        await ctx.answerCbQuery('💡 Loading nutrition help...');

        const helpMessage = `📊 **About Nutrition Analysis** 📊

🔬 **What it analyzes:**
• 🔥 **Calories** per serving and total recipe
• 💪 **Macronutrients** (protein, carbs, fat)
• 🥗 **Fiber and sugar** content
• 🏷️ **Dietary tags** (vegan, gluten-free, etc.)
• 💡 **Health insights** and recommendations

📋 **How it works:**
• Analyzes ingredients from your recipe
• Uses nutrition database of 50+ common foods
• Calculates based on ingredient quantities
• Provides estimates for healthy meal planning

⚖️ **Accuracy notes:**
• Values are estimates based on standard data
• Actual nutrition may vary by preparation
• Best for general dietary guidance

🍎 **Perfect for:**
• Calorie counting and weight management
• Macro tracking for fitness goals
• Identifying dietary restriction compatibility
• Making informed healthy choices

🌿 *Click "Analyze Nutrition" on any recipe to get detailed health information!* ✨`;

        await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    });

    bot.action('nutrition_already_done', async (ctx) => {
        await ctx.answerCbQuery('✅ This recipe already has nutrition analysis!');

        await ctx.reply(`✅ **Nutrition Already Analyzed** ✅

📊 This recipe already includes detailed nutrition information!

🔍 **To view the nutrition data:**
• Use /my_recipes to see your collection
• Look for recipes with nutrition sections
• Full nutrition details are included in the recipe text

🔄 **To update the analysis:**
• Click "Re-analyze" if you've modified ingredients
• Useful if the original analysis had errors

🌿 *Your health data is ready to use!* ✨`,
            { parse_mode: 'Markdown' });
    });
};

module.exports = {
    setupDownloadHandlers,
    setupRecipeHandlers,
    setupRatingButtonHandlers,
    setupStatsHandlers,
    setupNutritionHandlers,
    setupNutritionStatusHandlers,
    getRecipeKeyboard,
    getUpdatedRecipeKeyboard
};