const {getUserRecipes  } = require('../database/recipeService');
const { scaleRecipe } = require('../services/recipeScaler');

const scaleCommand = async (ctx) => {
    try {
        const recipes = await getUserRecipes(ctx.dbUser.id, 8);
        if(recipes.length === 0 ){
            await ctx.reply(`⚖️ *Recipe Scaling Center* ⚖️

📚 **No recipes found in your collection!**

🍳 *Send me cooking videos to build your recipe collection first!*
⚖️ *Then you can scale any recipe for different serving sizes!*

🌿 *Your culinary scaling adventure awaits!* ✨`,
                { parse_mode: 'Markdown' });
            return;
        }

        let message = `⚖️ *Recipe Scaling Center* ⚖️\n\n`;
        message += `🎯 **Scale your recipes for perfect portions!**\n\n`;
        message += `📝 **Select a recipe to scale:**\n\n`;

        const recipeButtons = [];
        recipes.forEach((recipe, index) => {
            const date = new Date(recipe.created_at).toLocaleDateString();
            const currentServings = recipe.servings || 'Unknown';

            message += `${index + 1}. **${recipe.title}**\n`;
            message += `   🍽️ Serves: ${currentServings} • 📅 ${date}\n\n`;

            recipeButtons.push([
                { text: `⚖️ Scale Recipe ${index + 1}`, callback_data: `scale_recipe_${recipe.id}` }
            ]);
        })

        message += `🔧 **What scaling does:**\n`;
        message += `• 📊 Adjusts ingredient quantities\n`;
        message += `• ⏱️ Estimates new cooking times\n`;
        message += `• 🍳 Recommends equipment sizes\n`;
        message += `• 📐 Smart unit conversions\n\n`;
        message += `🌿 *Perfect portions for any occasion!* ✨`;

        const actionButtons = [
            [
                { text: '📖 How Scaling Works', callback_data: 'scaling_help' },
                { text: '🔢 Quick Scale Tips', callback_data: 'scaling_tips' }
            ]
        ]

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [...recipeButtons, ...actionButtons]
            }
        });


    } catch (error) {
        console.error('Scale command error:', error);
        await ctx.reply('🐛 Error accessing scaling center! Please try again.');
    }
}

const setupScaleHandlers = (bot) => {
    bot.action('scaling_help', async (ctx) => {
        await ctx.answerCbQuery('📖 Loading scaling guide...');

        const helpMessage = `📖 **How Recipe Scaling Works** 📖

⚖️ **Smart Scaling Process:**

🔢 **1. Ingredient Scaling:**
• Multiplies all quantities proportionally
• Handles fractions and decimals intelligently
• Converts units when needed (cups ↔ tablespoons)
• Rounds to practical cooking measurements

⏱️ **2. Time Adjustments:**
• **Prep time:** Scales linearly (more ingredients = more prep)
• **Cook time:** Smart scaling (baking times change differently)
• **Rest time:** Usually stays the same

🍳 **3. Equipment Recommendations:**
• Suggests larger pans for bigger portions
• Recommends pot sizes for scaled liquids
• Warns about oven capacity limits

📐 **4. Smart Conversions:**
• 1 cup = 16 tablespoons = 48 teaspoons
• Converts between metric and imperial
• Handles weight vs volume intelligently

⚡ **Quick Scale Options:**
• **0.5x** - Half portions
• **1x** - Original recipe
• **2x** - Double portions  
• **4x** - Quadruple portions
• **Custom** - Any specific number

🌿 *Scaling makes any recipe perfect for your needs!* ✨`;

        await ctx.reply(helpMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⬅️ Back to Scaling', callback_data: 'back_to_scaling' }]
                ]
            }
        });
    });

    bot.action('scaling_tips', async (ctx) => {
        await ctx.answerCbQuery('🔢 Loading scaling tips...');

        const tipsMessage = `🔢 **Pro Scaling Tips** 🔢

💡 **Smart Scaling Guidelines:**

🧂 **Seasonings & Spices:**
• Scale salt/pepper conservatively (taste and adjust)
• Strong spices: Scale by 0.8x instead of full multiplier
• Fresh herbs: Scale normally, dried herbs more conservatively

🥘 **Cooking Techniques:**
• **Sautéing:** May need larger pan or cook in batches
• **Baking:** Times change more with 4x+ scaling
• **Deep frying:** Oil ratios don't scale linearly

⏱️ **Time Scaling Rules:**
• **Prep time:** Usually scales 1:1
• **Searing/browning:** Doesn't scale much
• **Simmering:** Scales but levels off at larger quantities
• **Baking:** Complex - depends on pan size and thickness

🍳 **Equipment Scaling:**
• **2x recipe:** Usually needs next pan size up
• **4x recipe:** May need commercial-sized equipment
• **Oven space:** Consider cooking in batches

📏 **Best Practice:**
• Start with 2x scaling to learn the recipe
• Taste and adjust seasonings after scaling
• Consider equipment limitations
• Some recipes work better scaled than others

🌿 *Master these tips for perfect scaled recipes!* ✨`;

        await ctx.reply(tipsMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⬅️ Back to Scaling', callback_data: 'back_to_scaling' }]
                ]
            }
        });
    });

    bot.action('back_to_scaling', async (ctx) => {
        await ctx.answerCbQuery('⚖️ Back to scaling center');
        await ctx.deleteMessage();
        await scaleCommand(ctx);
    });
}

module.exports = {
    scaleCommand,
    setupScaleHandlers
}