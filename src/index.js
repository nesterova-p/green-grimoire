require('dotenv').config();
const { Telegraf } = require('telegraf');

// import commands
const startCommand = require('./commands/start');
const helpCommand = require('./commands/help');
const pingCommand = require('./commands/ping');

// import handlers
const textHandler = require('./handlers/textHandler');
const mediaHandler = require('./handlers/mediaHandler');

const bot = new Telegraf(process.env.BOT_TOKEN);

if(!process.env.BOT_TOKEN){
    console.error('Error! BOT_TOKEN environment variable is required!');
    process.exit(1);
}

// middleware
bot.use((ctx, next) => {
    const user = ctx.from.username || ctx.from.first_name;
    console.log(`${user} sent: "${ctx.message?.text || 'non-text message'}"`);
    return next();
});

// commands
bot.start(startCommand);
bot.help(helpCommand);
bot.command('ping', pingCommand);

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
bot.launch().then(() => {
    console.log('✅ Bot is alive and ready for magic!');
    console.log('🔮 Try /start, /help, /ping in Telegram!');
})
    .catch((err) => {
        console.error('❌ Failed to start bot:', err);
        process.exit(1);
    });

console.log('🌿 Starting GreenGrimoire bot...');