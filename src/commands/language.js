const { updateUserLanguage } = require('../database/userService');
const localizationService = require('../services/localizationService');

const languageCommand = async (ctx) => {
    try {
        const supportedLanguages = localizationService.getSupportedLanguages();
        const languageButtons = [];
        for (let i = 0; i < supportedLanguages.length; i += 2) {
            const row = [];

            const lang1 = supportedLanguages[i];
            row.push({
                text: `${lang1.flag} ${lang1.nativeName}`,
                callback_data: `set_lang_${lang1.code}`
            });

            if (i + 1 < supportedLanguages.length) {
                const lang2 = supportedLanguages[i + 1];
                row.push({
                    text: `${lang2.flag} ${lang2.nativeName}`,
                    callback_data: `set_lang_${lang2.code}`
                });
            }

            languageButtons.push(row);
        }

        const currentLanguageInfo = localizationService.getLanguageInfo(ctx.dbUser.preferred_language);

        const message = localizationService.botMessage(ctx, 'commands.language.choose', {
            current_language: currentLanguageInfo
        });

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: languageButtons
            }
        });

    } catch (error) {
        console.error('Language command error:', error);
        const errorMessage = localizationService.botMessage(ctx, 'commands.language.error');
        await ctx.reply(errorMessage);
    }
};

const setupLanguageHandlers = (bot) => {
    bot.action('open_language_menu', async (ctx) => {
        try {
            await ctx.answerCbQuery('🌍 Opening language menu...');
            try {
                await ctx.deleteMessage();
            } catch (deleteError) {}

            await languageCommand(ctx);

        } catch (error) {
            console.error('Error opening language menu:', error);
            await ctx.answerCbQuery('Error opening language menu');
        }
    });

    bot.action(/^set_lang_(.+)$/, async (ctx) => {
        try {
            const languageCode = ctx.match[1];

            if (!localizationService.isLanguageSupported(languageCode)) {
                await ctx.answerCbQuery('Language not supported');
                return;
            }

            const languageDetails = localizationService.getLanguageDetails(languageCode);

            await ctx.answerCbQuery(`${languageDetails.flag} Language changed to ${languageDetails.nativeName}!`);
            await updateUserLanguage(ctx.dbUser.id, languageCode);
            ctx.dbUser.preferred_language = languageCode;
            await updateUserCommandMenu(ctx, languageCode, bot);

            const confirmationMessage = localizationService.getMessage('commands.language.changed', languageCode, {
                language_flag: languageDetails.flag,
                language_name: languageDetails.nativeName
            });

            await ctx.editMessageText(confirmationMessage, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Language change error:', error);
            await ctx.answerCbQuery('Error changing language');
        }
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
                { command: 'rate', description: '⭐ Rate your recipes and track favorites' },
                { command: 'scale', description: '⚖️ Scale recipes for different portions' },
                { command: 'shopping', description: '🛒 Generate smart shopping lists' },
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
                { command: 'rate', description: '⭐ Oceń przepisy i śledź ulubione' },
                { command: 'scale', description: '⚖️ Skaluj przepisy dla różnych porcji' },
                { command: 'shopping', description: '🛒 Generuj inteligentne listy zakupów' },
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
                { command: 'rate', description: '⭐ Оцінити рецепти та відстежувати улюблені' },
                { command: 'scale', description: '⚖️ Масштабувати рецепти для різних порцій' },
                { command: 'shopping', description: '🛒 Створити розумні списки покупок' },
                { command: 'language', description: '🌍 Змінити мовні налаштування' },
                { command: 'setup_help', description: '🆘 Допомога налаштування' },
                { command: 'help', description: '❓ Отримати допомогу' },
                { command: 'ping', description: '🏓 Перевірити відгукування бота' }
            ],
            'de': [
                { command: 'start', description: '🌿 Willkommen bei GreenGrimoire!' },
                { command: 'my_recipes', description: '📚 Rezeptsammlung anzeigen' },
                { command: 'forum_status', description: '📱 Forum-Status prüfen' },
                { command: 'reset_forum', description: '🗑️ Forum zurücksetzen' },
                { command: 'stats', description: '📊 Koch-Statistiken anzeigen' },
                { command: 'rate', description: '⭐ Rezepte bewerten und Favoriten verfolgen' },
                { command: 'scale', description: '⚖️ Rezepte für verschiedene Portionen skalieren' },
                { command: 'shopping', description: '🛒 Intelligente Einkaufslisten erstellen' },
                { command: 'language', description: '🌍 Spracheinstellungen ändern' },
                { command: 'setup_help', description: '🆘 Setup-Hilfe erhalten' },
                { command: 'help', description: '❓ Hilfe und Anweisungen erhalten' },
                { command: 'ping', description: '🏓 Bot-Reaktionsfähigkeit testen' }
            ]
        };

        const commands = commandSets[languageCode] || commandSets['en'];

        await botInstance.telegram.setMyCommands(commands, {
            scope: { type: 'chat', chat_id: ctx.chat.id }
        });

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
    updateUserCommandMenu
};