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
                await updateUserCommandMenu(ctx, lang.code, bot);

                await ctx.editMessageText(
                    `✅ **Language Updated** ✅

${lang.flag} **New Language:** ${lang.name}
🔄 **Recipe extraction will now use this language**
🌿 **Interface updated for future interactions**
📱 **Command menu updated to your language**

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

const updateUserCommandMenu = async (ctx, languageCode, botInstance) => {
    try {
        const commandSets = {
            'en': [
                { command: 'start', description: '🌿 Welcome to GreenGrimoire!' },
                { command: 'my_recipes', description: '📚 View your recipe collection' },
                { command: 'forum_status', description: '📱 Check personal forum status' },
                { command: 'reset_forum', description: '🗑️ Reset forum setup' },
                { command: 'stats', description: '📊 View your cooking statistics' },
                { command: 'language', description: '🌍 Change language preferences' },
                { command: 'setup_help', description: '🆘 Get forum setup help' },
                { command: 'help', description: '❓ Get help and instructions' },
                { command: 'ping', description: '🏓 Test bot responsiveness' }
            ],
            'pl': [
                { command: 'start', description: '🌿 Witaj w GreenGrimoire!' },
                { command: 'my_recipes', description: '📚 Zobacz kolekcję przepisów' },
                { command: 'forum_status', description: '📱 Sprawdź status forum' },
                { command: 'reset_forum', description: '🗑️ Resetuj forum' },
                { command: 'stats', description: '📊 Zobacz statystyki gotowania' },
                { command: 'language', description: '🌍 Zmień język' },
                { command: 'setup_help', description: '🆘 Pomoc konfiguracji' },
                { command: 'help', description: '❓ Uzyskaj pomoc' },
                { command: 'ping', description: '🏓 Testuj bota' }
            ],
            'uk': [
                { command: 'start', description: '🌿 Ласкаво просимо до GreenGrimoire!' },
                { command: 'my_recipes', description: '📚 Переглянути колекцію рецептів' },
                { command: 'forum_status', description: '📱 Перевірити статус форуму' },
                { command: 'reset_forum', description: '🗑️ Скинути форум' },
                { command: 'stats', description: '📊 Переглянути статистику рецептів' },
                { command: 'language', description: '🌍 Змінити мовні налаштування' },
                { command: 'setup_help', description: '🆘 Допомога налаштування' },
                { command: 'help', description: '❓ Отримати допомогу та інструкції' },
                { command: 'ping', description: '🏓 Перевірити відгукування бота' }
            ],
        };

        const commands = commandSets[languageCode] || commandSets['en'];

        await botInstance.telegram.setMyCommands(commands, {
            scope: { type: 'chat', chat_id: ctx.chat.id }
        });

        await botInstance.telegram.setMyCommands(commands);

        // Set menu button
        await botInstance.telegram.setChatMenuButton({
            chat_id: ctx.chat.id,
            menu_button: {
                type: 'commands'
            }
        });

        console.log(`Updated command menu for ${ctx.dbUser.id} (${languageCode})`);

    } catch (error) {
        console.error('Error updating user command menu:', error);
    }
};

module.exports = {
    languageCommand,
    setupLanguageHandlers,
    getLanguageName,
    updateUserCommandMenu
};
