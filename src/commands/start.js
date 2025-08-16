const PersonalForumService = require('../services/personalForumService');

const startCommand = async (ctx) => {
    const username = ctx.from.first_name || ctx.from.username;

    try {
        const personalForumService = global.personalForumService;
        if (!personalForumService) {
            await ctx.reply(`🌿✨ *Greetings, ${username}!* ✨🌿

*Moss the Green Keeper awakens from the ancient grimoire...*

🍄 I am the guardian of this enchanted recipe tome! Within these pages lie the culinary secrets of countless realms and kitchens.

🔮 *Current magical abilities:*
- Conversing with fellow cooks
- Extracting recipes from cooking videos
- Organizing recipes in your collection

*Send /help to view my spell book, dear cook!* 📜⚡`,
                { parse_mode: 'Markdown' });
            return;
        }

        const userForum = await personalForumService.getUserPersonalForum(ctx.dbUser.id);

        if (userForum && userForum.setup_completed) {
            const forumLink = userForum.forum_chat_id ?
                `https://t.me/c/${Math.abs(userForum.forum_chat_id).toString().slice(4)}/1` :
                'your personal forum';

            const welcomeBackMessage = `🌿✨ *Welcome back, ${username}!* ✨🌿

*Moss recognizes a fellow culinary adventurer!*

📚 **Your Personal Recipe Grimoire is Ready!**

📱 **Your Forum:** [${userForum.forum_name}](${forumLink})
📂 **Categories:** ${userForum.categories_count || 6} recipe topics organized
📝 **Recipes:** ${userForum.recipes_count || 0} culinary treasures saved

🍳 **Ready to cook?** Send me any cooking video link and I'll:
• 🔮 Extract the recipe using ancient AI magic
• 📂 Organize it in the appropriate category topic
• 🎬 Keep the original video for reference
• ✨ Make it searchable in your personal collection

🌱 *Your culinary journey continues! Send me a cooking video to begin...* 

*Use /help for more magical commands!* 📜⚡`;

            await ctx.reply(welcomeBackMessage, { parse_mode: 'Markdown' });

        } else if (userForum && !userForum.setup_completed) {
            await ctx.reply(`🔄 **Setup In Progress** 🔄

Hi ${username}! I see you started setting up your personal recipe forum but didn't complete it.

🎯 **To finish setup:**
1. Go to your forum: "${userForum.forum_name}"
2. Make sure I'm added as admin with "Manage Topics" permission
3. Send your setup code in the forum

🆘 **Need help?** Send /setup_help for detailed instructions
🔄 **Start over?** I can guide you through a fresh setup!

*Let's get your recipe organization working perfectly!* 🌿✨`,
                { parse_mode: 'Markdown' });

        } else {
            await personalForumService.initiatePersonalForumSetup(ctx);
        }

    } catch (error) {
        console.error('Start command error:', error);
        await ctx.reply(`🌿✨ *Greetings, ${username}!* ✨🌿

*Moss the Green Keeper awakens from the ancient grimoire...*

🍄 I am the guardian of this enchanted recipe tome! 

🔮 **What I can do:**
- Extract recipes from cooking videos (TikTok, Instagram, YouTube)
- Organize recipes in your personal collection
- Translate recipes to your preferred language
- Scale recipes for different serving sizes

🚀 **Getting Started:**
Send me any cooking video link to begin your culinary adventure!

*Send /help to explore all my magical abilities!* 📜⚡`,
            { parse_mode: 'Markdown' });
    }
};

module.exports = startCommand;