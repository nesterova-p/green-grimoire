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
const { languageCommand, setupLanguageHandlers } = require('./commands/language');

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

// launch
const startBot = async () => {
    try{
        console.log('🌿 Starting GreenGrimoire bot...');
        await initDatabase();
        await bot.launch();
        console.log('✅ Moss is alive and connected to database!');
        console.log('🔮 Users will be automatically saved to database!');
        console.log('💾 Try /my_recipes and /stats commands!');
        console.log('🔘 Button-powered interface ready!');

    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
};

// shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();