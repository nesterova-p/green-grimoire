const { query } = require('../database/connection');

const resetForumCommand = async (ctx) => {
    try {
        const userId = ctx.dbUser.id;

        const forumCheck = await query(
            'SELECT * FROM personal_forums WHERE user_id = $1',
            [userId]
        );

        if (forumCheck.rows.length === 0) {
            await ctx.reply(`❌ <b>No Forum Found</b>

You don't have any forum setup to reset.

🚀 Send /start to create your first personal recipe forum!

🌿 <i>Ready to begin your organized culinary journey!</i> ✨`,
                { parse_mode: 'HTML' });
            return;
        }

        const forum = forumCheck.rows[0];

        const recipeCount = await query(
            'SELECT COUNT(*) as count FROM recipes WHERE personal_forum_id = $1',
            [forum.id]
        );

        await ctx.reply(`⚠️ <b>Confirm Forum Reset</b> ⚠️

<b>Current Forum:</b> ${forum.forum_name}
<b>Status:</b> ${forum.setup_completed ? 'Completed' : 'In Progress'}
<b>Linked Recipes:</b> ${recipeCount.rows[0].count} recipes

🗑️ <b>This will:</b>
• Remove forum record from database
• Clear all topic mappings  
• Unlink recipes from forum (recipes stay in your collection)
• Allow you to create a new forum setup

✅ <b>Your recipes will be preserved!</b> They just won't be linked to the old forum.

⚠️ <b>Make sure your actual Telegram forum group is deleted first!</b>

<i>Are you sure you want to reset your forum setup?</i>`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Yes, Reset Forum', callback_data: 'confirm_reset_forum' },
                            { text: '❌ No, Keep Current', callback_data: 'cancel_reset_forum' }
                        ]
                    ]
                }
            });

    } catch (error) {
        console.error('Reset forum command error:', error);
        await ctx.reply('🐛 Error checking forum status! Please try again.');
    }
};

const setupResetForumHandlers = (bot) => {
    bot.action('confirm_reset_forum', async (ctx) => {
        try {
            await ctx.answerCbQuery('🗑️ Resetting forum...');

            const userId = ctx.dbUser.id;

            //  forum ID
            const forumResult = await query(
                'SELECT id, forum_name FROM personal_forums WHERE user_id = $1',
                [userId]
            );

            if (forumResult.rows.length === 0) {
                await ctx.editMessageText('❌ No forum found to reset.', { parse_mode: 'HTML' });
                return;
            }

            const forumId = forumResult.rows[0].id;
            const forumName = forumResult.rows[0].forum_name;

            // unlink recipes
            const recipeUpdateResult = await query(
                `UPDATE recipes 
                 SET personal_forum_id = NULL, forum_topic_id = NULL, forum_message_id = NULL 
                 WHERE personal_forum_id = $1`,
                [forumId]
            );

            console.log(`🔗 Unlinked ${recipeUpdateResult.rowCount} recipes from forum`);

            // felete topics
            const topicsDeleteResult = await query(
                'DELETE FROM forum_topics WHERE personal_forum_id = $1',
                [forumId]
            );

            console.log(`🗑️ Deleted ${topicsDeleteResult.rowCount} forum topics`);

            // delete forum record
            const forumDeleteResult = await query(
                'DELETE FROM personal_forums WHERE user_id = $1',
                [userId]
            );

            if (forumDeleteResult.rowCount > 0) {
                await ctx.editMessageText(`✅ <b>Forum Reset Complete!</b> ✅

🗑️ <b>Removed:</b> ${forumName}
📂 <b>Topics cleared:</b> ${topicsDeleteResult.rowCount} category mappings deleted
🔗 <b>Recipes unlinked:</b> ${recipeUpdateResult.rowCount} recipes preserved in your collection
📝 <b>All recipes safe:</b> They remain in your /my_recipes collection!

🚀 <b>Ready for fresh start!</b>
Send /start to create your new personal recipe forum.

🌿 <i>Choose any name you like for your new forum!</i> ✨`,
                    { parse_mode: 'HTML' });

                console.log(`✅ Forum reset completed for user ${userId}`);
            } else {
                await ctx.editMessageText('❌ No forum found to reset.', { parse_mode: 'HTML' });
            }

        } catch (error) {
            console.error('Forum reset error:', error);
            console.error('Error details:', error.message);
            await ctx.editMessageText(`🐛 <b>Reset Error</b> 🐛

${error.message}

Please try again or contact support if the issue persists.`,
                { parse_mode: 'HTML' });
        }
    });

    bot.action('cancel_reset_forum', async (ctx) => {
        try {
            await ctx.answerCbQuery('❌ Reset cancelled');
            await ctx.editMessageText(`❌ <b>Forum Reset Cancelled</b>

Your current forum setup is preserved.

🔍 Use /forum_status to check your current forum
🆘 Use /setup_help if you need assistance

🌿 <i>Your forum setup remains unchanged!</i> ✨`,
                { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Cancel reset error:', error);
        }
    });
};

module.exports = {
    resetForumCommand,
    setupResetForumHandlers
};