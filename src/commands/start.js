const PersonalForumService = require('../services/personalForumService');
let localizationService = null;
let updateUserLanguage = null;

try {
    localizationService = require('../services/localizationService');
    const { updateUserLanguage: updateLang } = require('../database/userService');
    updateUserLanguage = updateLang;
    console.log('✅ Localization service loaded successfully');
} catch (error) {
    console.log('⚠️ Localization service not found, using basic messages');
}

const startCommand = async (ctx) => {
    const username = ctx.from.first_name || ctx.from.username;
    let languageChanged = false;

    try {
        if (localizationService && updateUserLanguage) {
            try {
                if (!ctx.dbUser.preferred_language || ctx.dbUser.preferred_language === 'en') {
                    const detectedLanguage = localizationService.detectTelegramLanguage(ctx);

                    if (detectedLanguage !== 'en' && detectedLanguage !== ctx.dbUser.preferred_language) {
                        await updateUserLanguage(ctx.dbUser.id, detectedLanguage);
                        ctx.dbUser.preferred_language = detectedLanguage;
                        languageChanged = true;

                        const autoDetectedMessage = localizationService.getMessage(
                            'commands.start.language_auto_detected',
                            detectedLanguage,
                            {
                                detected_language: localizationService.getLanguageInfo(detectedLanguage)
                            }
                        );

                        await ctx.reply(autoDetectedMessage, { parse_mode: 'Markdown' });
                    }
                }
            } catch (langError) {
                console.log('⚠️ Language auto-detection failed, continuing with basic setup');
            }
        }

        const personalForumService = global.personalForumService;
        if (!personalForumService) {
            let welcomeMessage;

            if (localizationService) {
                welcomeMessage = localizationService.getMessage(
                    'commands.start.welcome',
                    ctx.dbUser?.preferred_language || 'en',
                    { username: username }
                );
            } else {
                welcomeMessage = `🌿✨ *Greetings, ${username}!* ✨🌿

*Moss the Green Keeper awakens from the ancient grimoire...*

🍄 I am the guardian of this enchanted recipe tome! Within these pages lie the culinary secrets of countless realms and kitchens.

🔮 *Current magical abilities:*
- Conversing with fellow cooks
- Extracting recipes from cooking videos
- Organizing recipes in your collection

*Send /help to view my spell book, dear cook!* 📜⚡`;
            }

            await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
            return;
        }

        const userForum = await personalForumService.getUserPersonalForum(ctx.dbUser.id);

        if (userForum && userForum.setup_completed) {
            const forumLink = userForum.forum_chat_id ?
                `https://t.me/c/${Math.abs(userForum.forum_chat_id).toString().slice(4)}/1` :
                'your personal forum';

            let welcomeBackMessage = `🌿✨ *Welcome back, ${username}!* ✨🌿

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

            if (localizationService && ctx.dbUser.preferred_language) {
                const currentLanguageInfo = localizationService.getLanguageInfo(ctx.dbUser.preferred_language);
                welcomeBackMessage += `\n\n🌍 *Speaking your language:* ${currentLanguageInfo}\n*Change anytime with /language*`;
            }

            const replyMarkup = {
                parse_mode: 'Markdown'
            };

            if (localizationService) {
                replyMarkup.reply_markup = {
                    inline_keyboard: [
                        [
                            {
                                text: "🌍 Change Language",
                                callback_data: 'open_language_menu'
                            }
                        ]
                    ]
                };
            }

            await ctx.reply(welcomeBackMessage, replyMarkup);

        } else if (userForum && !userForum.setup_completed) {
            let setupMessage = `🔄 **Setup In Progress** 🔄

Hi ${username}! I see you started setting up your personal recipe forum but didn't complete it.

🎯 **To finish setup:**
1. Go to your forum: "${userForum.forum_name}"
2. Make sure I'm added as admin with "Manage Topics" permission
3. Send your setup code in the forum

🆘 **Need help?** Send /setup_help for detailed instructions
🔄 **Start over?** I can guide you through a fresh setup!

*Let's get your recipe organization working perfectly!* 🌿✨`;

            const replyMarkup = {
                parse_mode: 'Markdown'
            };

            if (localizationService) {
                replyMarkup.reply_markup = {
                    inline_keyboard: [
                        [
                            {
                                text: "▶️ Continue Setup",
                                callback_data: 'continue_setup'
                            },
                            {
                                text: "🌍 Change Language",
                                callback_data: 'open_language_menu'
                            }
                        ]
                    ]
                };
            }

            await ctx.reply(setupMessage, replyMarkup);

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