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
const { languageCommand, setupLanguageHandlers, updateUserCommandMenu  } = require('./commands/language');

// import handlers
const textHandler = require('./handlers/textHandler');
const mediaHandler = require('./handlers/mediaHandler');
const { setupDownloadHandlers, setupRecipeHandlers } = require('./handlers/buttonHandlers');

const bot = new Telegraf(process.env.BOT_TOKEN);

if(!process.env.BOT_TOKEN){
    console.error('Error! BOT_TOKEN environment variable is required!');
    process.exit(1);
}

// middleware
bot.use(async (ctx, next) => {
    try {
        if (!ctx.from) return next();
        const user = await findOrCreateUser(ctx);
        ctx.dbUser = user;
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

// recipe commands
bot.command('my_recipes', myRecipesCommand);
bot.command('stats', statsCommand);
bot.command('language', languageCommand);

// buttons handlers
setupDownloadHandlers(bot);
setupLanguageHandlers(bot);
setupRecipeHandlers(bot);

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

const setupBotCommands = async () => {
    try {
        const commands = [
            { command: 'start', description: '🌿 Welcome to GreenGrimoire!' },
            { command: 'help', description: '❓ Get help and instructions' },
            { command: 'my_recipes', description: '📚 View your recipe collection' },
            { command: 'stats', description: '📊 View your cooking statistics' },
            { command: 'language', description: '🌍 Change language preferences' },
            { command: 'ping', description: '🏓 Test bot responsiveness' }
        ];

        await bot.telegram.setMyCommands(commands);
        console.log('✅ Bot command menu configured successfully!');
        console.log('📱 Users will see a menu button next to the text input!');

    } catch (error) {
        console.error('❌ Error setting bot commands:', error);
    }
};

// launch
const startBot = async () => {
    try {
        console.log('🌿 Starting GreenGrimoire bot...');
        await initDatabase();
        await setupBotCommands();
        await setupLanguageSpecificCommands();
        await bot.launch();
        console.log('🌿  GreenGrimoire is alive and ready!');
    } catch (error) {
        console.error('❌ Failed to start bot:', error.message);
        process.exit(1);
    }
};

// language
const setupLanguageSpecificCommands = async () => {
    try {
        const englishCommands = [
            { command: 'start', description: '🌿 Welcome to GreenGrimoire!' },
            { command: 'help', description: '❓ Get help and instructions' },
            { command: 'my_recipes', description: '📚 View your recipe collection' },
            { command: 'stats', description: '📊 View your cooking statistics' },
            { command: 'language', description: '🌍 Change language preferences' },
            { command: 'ping', description: '🏓 Test bot responsiveness' }
        ];

        const polishCommands = [
            { command: 'start', description: '🌿 Witaj w GreenGrimoire!' },
            { command: 'help', description: '❓ Uzyskaj pomoc i instrukcje' },
            { command: 'my_recipes', description: '📚 Zobacz swoją kolekcję przepisów' },
            { command: 'stats', description: '📊 Zobacz swoje statystyki gotowania' },
            { command: 'language', description: '🌍 Zmień preferencje językowe' },
            { command: 'ping', description: '🏓 Testuj responsywność bota' }
        ];

        const ukrainianCommands = [
            { command: 'start', description: '🌿 Ласкаво просимо до GreenGrimoire!' },
            { command: 'help', description: '❓ Отримати допомогу та інструкції' },
            { command: 'my_recipes', description: '📚 Переглянути колекцію рецептів' },
            { command: 'stats', description: '📊 Переглянути статистику рецептів' },
            { command: 'language', description: '🌍 Змінити мовні налаштування' },
            { command: 'ping', description: '🏓 Перевірити відгукування бота' }
        ];
        await bot.telegram.setMyCommands(englishCommands, { language_code: 'en' });
        await bot.telegram.setMyCommands(polishCommands, { language_code: 'pl' });
        await bot.telegram.setMyCommands(ukrainianCommands, { language_code: 'uk' });

        console.log('Language specific command menu configured!');

    } catch (error) {
        console.error('Error setting language specific commands:', error);
    }
};

// shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();