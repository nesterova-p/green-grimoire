const { updateUserLanguage } = require('../database/userService');

const languages = {
    'lang_en': { code: 'en', name: 'English', flag: '🇬🇧' },
    'lang_pl': { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    'lang_uk': { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    'lang_de': { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
};

const getLanguageName = (code) => {
    const names = {
        'en': '🇬🇧 English',
        'pl': '🇵🇱 Polski',
        'uk': '🇺🇦 Українська',
        'de': '🇩🇪 Deutsch',
        'fr': '🇫🇷 Français'
    };
    return names[code] || '🇬🇧 English';
};

const languageCommand = async (ctx) => {
    const languageButtons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🇬🇧 English', callback_data: 'lang_en' },
                    { text: '🇵🇱 Polski', callback_data: 'lang_pl' }
                ],
                [
                    { text: '🇺🇦 Українська', callback_data: 'lang_uk' },
                ],
                [
                    { text: '🇩🇪 Deutsch', callback_data: 'lang_de' },
                    { text: '🇫🇷 Français', callback_data: 'lang_fr' }
                ]
            ]
        }
    };

    await ctx.reply(
        `🌍 **Choose Your Language** 🌍

🗣️ **Current:** ${getLanguageName(ctx.dbUser.preferred_language)}
🔄 **Select new language for recipes and interface:**`,
        {
            parse_mode: 'Markdown',
            ...languageButtons
        }
    );
};

const setupLanguageHandlers = (bot) => {
    Object.keys(languages).forEach(langKey => {
        bot.action(langKey, async (ctx) => {
            try {
                const lang = languages[langKey];
                await ctx.answerCbQuery(`${lang.flag} Language changed to ${lang.name}!`);
                await updateUserLanguage(ctx.dbUser.id, lang.code);
                ctx.dbUser.preferred_language = lang.code;

                await ctx.editMessageText(
                    `✅ **Language Updated** ✅

${lang.flag} **New Language:** ${lang.name}
🔄 **Recipe extraction will now use this language**
🌿 **Interface updated for future interactions**

*Moss adapts to your linguistic preferences!* ✨`,
                    { parse_mode: 'Markdown' }
                );

            } catch (error) {
                console.error('Language change error:', error);
                await ctx.reply('🐛 Error changing language! Please try again.');
            }
        });
    });
};

module.exports = {
    languageCommand,
    setupLanguageHandlers,
    getLanguageName
};
