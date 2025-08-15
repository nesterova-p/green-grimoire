require('dotenv').config();
const { Telegraf } = require('telegraf');
const {initDatabase} = require('./database/connection');
const { findOrCreateUser } = require('./database/userService')

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
bot.use(async (ctx, next) => {
    try{
        if(!ctx.from) return next();
        const user = await findOrCreateUser(ctx);
        ctx.dbUser = user;
        const username = ctx.from.username || ctx.from.first_name;
        const messageText = ctx.message?.text || 'non-text message';
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

bot.command('my_recipes', async (ctx) => {
    try {
        const { getUserRecipes } = require('./database/recipeService');
        const recipes = await getUserRecipes(ctx.dbUser.id, 5); // latest 5 recipes
        if (recipes.length === 0) {
            ctx.reply(`📚 *Your Recipe Grimoire is Empty* 📚

🌿 No recipes saved yet! Send me a cooking video link to start building your collection!

*Moss is ready to capture culinary wisdom...* ✨`,
                { parse_mode: 'Markdown' });
            return;
        }

        let message = `📚 *Your Recipe Collection* 📚\n\n`;
        recipes.forEach((recipe, index) => {
            const date = new Date(recipe.created_at).toLocaleDateString();
            const categories = recipe.categories ? recipe.categories.join(', ') : 'Uncategorized';
            message += `${index + 1}. **${recipe.title}**\n`;
            message += `   📂 ${categories}\n`;
            message += `   📅 ${date}\n\n`;
        });

        message += `\n🌿 *Showing latest ${recipes.length} recipes*`;

        ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error getting user recipes:', error);
        ctx.reply('🐛 Error accessing your recipe collection! ⚡');
    }
});

bot.command('stats', async (ctx) => {
    try {
        const { getUserStats } = require('./database/userService');
        const stats = await getUserStats(ctx.dbUser.id);

        ctx.reply(`📊 *Your GreenGrimoire Stats* 📊

🍳 **Total Recipes:** ${stats.total_recipes}
📱 **Platforms Used:** ${stats.platforms_used}
📂 **Categories Used:** ${stats.categories_used}
📅 **Member Since:** ${new Date(ctx.dbUser.created_at).toLocaleDateString()}

🌿 *Keep cooking and growing your collection!* ✨`,
            { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error getting user stats:', error);
        ctx.reply('🐛 Error getting your stats! ⚡');
    }
});



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
const starBot = async () => {
    try{
        console.log('🌿 Starting GreenGrimoire bot...');
        await initDatabase();
        await bot.launch();
        console.log('✅ Moss is alive and connected to database!');
        console.log('🔮 Users will be automatically saved to database!');
        console.log('💾 Try /my_recipes and /stats commands!');
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

starBot();