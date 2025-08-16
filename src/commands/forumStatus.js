const PersonalForumService = require('../services/personalForumService');

const forumStatusCommand = async (ctx) => {
    try {
        const personalForumService = new PersonalForumService(ctx.telegram);
        const userForum = await personalForumService.getUserPersonalForum(ctx.dbUser.id);

        if (!userForum) {
            await ctx.reply(`❌ **No Personal Forum**

You haven't set up your personal recipe forum yet!

🚀 **Quick Setup:**
Send /start to begin the 2-minute setup process.

🌟 **What you'll get:**
• Personal organized recipe collection
• Automatic categorization by dish type
• Original videos preserved
• Beautiful forum interface

*Your organized recipe collection awaits!* 🌿`,
                { parse_mode: 'Markdown' });
        } else {
            const statusEmoji = userForum.setup_completed ? '✅' : '🔄';
            const statusText = userForum.setup_completed ? 'Ready!' : 'Setup in progress...';

            await ctx.reply(`${statusEmoji} **Personal Forum Status**

📱 **Forum:** ${userForum.forum_name}
📂 **Categories:** ${userForum.categories_count || 'Setting up...'}
📝 **Recipes:** ${userForum.recipes_count || 0}
✅ **Status:** ${statusText}

${userForum.setup_completed ?
                    `🍳 **Ready for recipes!** Send me any cooking video link!

📱 **Your Forum:** [View Collection](https://t.me/c/${Math.abs(userForum.forum_chat_id).toString().slice(4)}/1)` :
                    `🔧 **Complete setup** by sending your setup code in the forum!
    
Send /setup_help if you need assistance.`}

*Happy cooking!* 🌿✨`,
                { parse_mode: 'Markdown' });
        }

    } catch (error) {
        console.error('Forum status error:', error);
        await ctx.reply('🐛 Error checking forum status! Please try again.');
    }
};

module.exports = forumStatusCommand;