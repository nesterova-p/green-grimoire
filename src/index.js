require('dotenv').config();
const { Telegraf } = require('telegraf');

// database
const { initDatabase } = require('./database/connection');
const { findOrCreateUser } = require('./database/userService');

// import commands
const startCommand = require('./commands/start');
const helpCommand = require('./commands/help');
const pingCommand = require('./commands/ping');
const myRecipesCommand = require('./commands/myRecipes');
const statsCommand = require('./commands/stats');
const setupHelpCommand = require('./commands/setupHelp');
const forumStatusCommand = require('./commands/forumStatus');
const { languageCommand, setupLanguageHandlers, updateUserCommandMenu } = require('./commands/language');
const { resetForumCommand, setupResetForumHandlers } = require('./commands/resetForum');
const { rateCommand, setupRatingHandlers } = require('./commands/rate');
const { scaleCommand, setupScaleHandlers } = require('./commands/scale');
const shoppingCommand = require('./commands/shopping');

// import handlers
const textHandler = require('./handlers/textHandler');
const mediaHandler = require('./handlers/mediaHandler');
const { setupDownloadHandlers, setupRecipeHandlers, setupRatingButtonHandlers, setupStatsHandlers, setupNutritionHandlers } = require('./handlers/buttonHandlers');
const { setupScaleButtonHandlers } = require('./handlers/scaleHandlers');
const { setupShoppingHandlers } = require('./handlers/shoppingHandlers');

const PersonalForumService = require('./services/personalForumService');

const bot = new Telegraf(process.env.BOT_TOKEN);

if(!process.env.BOT_TOKEN){
    console.error('Error! BOT_TOKEN environment variable is required!');
    process.exit(1);
}

let personalForumService = null;

// middleware
bot.use(async (ctx, next) => {
    try {
        if (!ctx.from) return next();
        const user = await findOrCreateUser(ctx);
        ctx.dbUser = user;
        /*
        if (ctx.from.id === 258692780) {
            await forceRefreshUserCommands(ctx.from.id);
        }*/

        const username = ctx.from.username || ctx.from.first_name;
        const messageText = ctx.message?.text || ctx.callbackQuery?.data || 'non-text message';
        console.log(`👤 ${username} (DB ID: ${user.id}) sent: "${messageText}"`);

        return next();

    } catch (error) {
        console.error('Database middleware error:', error.message);
        ctx.reply('Sorry, I had a database hiccup! Try again? ⚡')
            .catch(() => console.error('Could not send error message!'));
    }
})

// commands
bot.start(startCommand);
bot.help(helpCommand);
bot.command('ping', pingCommand);
bot.command('my_recipes', myRecipesCommand);
bot.command('stats', statsCommand);
bot.command('language', languageCommand);
bot.command('setup_help', setupHelpCommand);
bot.command('forum_status', forumStatusCommand);
bot.command('reset_forum', resetForumCommand);
bot.command('rate', rateCommand);
bot.command('scale', scaleCommand);
bot.command('shopping', shoppingCommand);
bot.command('shop', shoppingCommand);

// buttons handlers
setupDownloadHandlers(bot);
setupLanguageHandlers(bot);
setupRecipeHandlers(bot);
setupResetForumHandlers(bot);
setupRatingHandlers(bot);
setupRatingButtonHandlers(bot);
setupStatsHandlers(bot);
setupScaleHandlers(bot);
setupScaleButtonHandlers(bot);
setupNutritionHandlers(bot);
setupShoppingHandlers(bot);

// handlers
bot.on('text', textHandler);
bot.on('video', mediaHandler.video);
bot.on('photo', mediaHandler.photo);
bot.on('document', mediaHandler.document);

// errors
bot.catch((err, ctx) => {
    console.error('🐛 Oops! Something went wrong:', err);
    ctx.reply('🔧 Sorry, I had a little magical malfunction! Try again? ⚡')
        .catch(() => console.error('Could not even send error message!'));
});

const initializeServices = async () => {
    try {
        personalForumService = new PersonalForumService(bot.telegram);
        global.personalForumService = personalForumService;
        personalForumService.setupInteractiveHandlers(bot)
        console.log('✅ Personal forum service initialized');
    } catch (error) {
        console.error('❌ Error initializing services:', error);
    }
};

const setupBotCommands = async () => {
    try {
        const commands = [
            { command: 'start', description: '🌿 Welcome to GreenGrimoire!' },
            { command: 'my_recipes', description: '📚 View your recipe collection' },
            { command: 'forum_status', description: '📱 Check your personal forum status' },
            { command: 'reset_forum', description: '🗑️ Reset forum setup' },
            { command: 'stats', description: '📊 View your cooking statistics' },
            { command: 'rate', description: '⭐ Rate your recipes and track favorites' },
            { command: 'scale', description: '⚖️ Scale recipes for different portions' },
            { command: 'shopping', description: '🛒 Generate smart shopping lists' },
            { command: 'language', description: '🌍 Change language preferences' },
            { command: 'setup_help', description: '🆘 Get forum setup assistance' },
            { command: 'help', description: '❓ Get help and instructions' },
            { command: 'ping', description: '🏓 Test bot responsiveness' }
        ];

        await bot.telegram.setMyCommands(commands);
        console.log('✅ Default commands configured!');

    } catch (error) {
        console.error('❌ Error setting bot commands:', error);
    }
};

// setup language specific command menu
const setupLanguageSpecificCommands = async () => {
    try {
        const englishCommands = [
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
        ];

        const polishCommands = [
            { command: 'start', description: '🌿 Witaj w GreenGrimoire!' },
            { command: 'my_recipes', description: '📚 Zobacz swoją kolekcję przepisów' },
            { command: 'forum_status', description: '📱 Sprawdź status osobistego forum' },
            { command: 'reset_forum', description: '🗑️ Resetuj forum' },
            { command: 'stats', description: '📊 Zobacz swoje statystyki gotowania' },
            { command: 'rate', description: '⭐ Oceń przepisy i śledź ulubione' },
            { command: 'scale', description: '⚖️ Skaluj przepisy dla różnych porcji' },
            { command: 'shopping', description: '🛒 Generuj inteligentne listy zakupów' },
            { command: 'language', description: '🌍 Zmień preferencje językowe' },
            { command: 'setup_help', description: '🆘 Pomoc w konfiguracji forum' },
            { command: 'help', description: '❓ Uzyskaj pomoc i instrukcje' },
            { command: 'ping', description: '🏓 Testuj bota' }
        ];

        const ukrainianCommands = [
            { command: 'start', description: '🌿 Ласкаво просимо до GreenGrimoire!' },
            { command: 'my_recipes', description: '📚 Переглянути колекцію рецептів' },
            { command: 'forum_status', description: '📱 Перевірити статус особистого форуму' },
            { command: 'reset_forum', description: '🗑️ Скинути форум' },
            { command: 'stats', description: '📊 Переглянути статистику рецептів' },
            { command: 'rate', description: '⭐ Оцінити рецепти та відстежувати улюблені' },
            { command: 'scale', description: '⚖️ Масштабувати рецепти для різних порцій' },
            { command: 'shopping', description: '🛒 Створити розумні списки покупок' },
            { command: 'language', description: '🌍 Змінити мовні налаштування' },
            { command: 'setup_help', description: '🆘 Допомога з налаштуванням форуму' },
            { command: 'help', description: '❓ Отримати допомогу та інструкції' },
            { command: 'ping', description: '🏓 Перевірити відгукування бота' }
        ];

        await bot.telegram.setMyCommands(englishCommands, { language_code: 'en' });
        await bot.telegram.setMyCommands(polishCommands, { language_code: 'pl' });
        await bot.telegram.setMyCommands(ukrainianCommands, { language_code: 'uk' });

        console.log('✅ Language specific command menus configured with shopping!');

    } catch (error) {
        console.error('❌ Error setting language specific commands:', error);
    }
};

// launch
const startBot = async () => {
    try {
        console.log('🌿 Starting GreenGrimoire bot...');
        await initDatabase();
        console.log('✅ Database initialized');
        await initializeServices();
        await setupBotCommands();
        await setupLanguageSpecificCommands();
        await bot.launch();
        console.log('🌿 GreenGrimoire is alive and ready!');
        console.log('📱 Users can now create personal recipe forums!');
        console.log('⚖️ Recipe scaling functionality is now available!');
    } catch (error) {
        console.error('❌ Failed to start bot:', error.message);
        process.exit(1);
    }
};

// shutdown
process.once('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    bot.stop('SIGTERM');
});

startBot();