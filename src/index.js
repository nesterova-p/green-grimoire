require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

if(!process.env.BOT_TOKEN){
    console.error('Error! BOT_TOKEN environment variable is required!');
    process.exit(1);
}

/*
--------- USE ---------
 */

bot.use((ctx, next) => {
    const user = ctx.from.username || ctx.from.first_name;
    console.log(`${user} sent: "${ctx.message?.text || 'non-text message'}"`);
    return next();
})

/*
--------- START ---------
 */

bot.start((ctx) => {
    const username = ctx.from.first_name || ctx.from.username;
    const welcomeMessage = `🌿✨ *Greetings, ${username}!* ✨🌿

*Moss the Green Keeper awakens from the ancient grimoire...*

🍄 I am the guardian of this enchanted recipe tome! Within these pages lie the culinary secrets of countless realms and kitchens.

🔮 *Current magical abilities:*
- Conversing with fellow cooks
- Sensing recipe energies  
- Detecting mystical cooking videos

🌱 *Soon I shall master:*
- Extracting recipes from videos
- Translating ancient cooking tongues
- Organizing recipes in sacred scrolls

*Send /help to view my spell book, dear cook!* 📜⚡`;

    ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

/*
--------- HELP ---------
 */

bot.help((ctx) => {
    const helpMessage = `📜⚡ *Moss's Spell Book* ⚡📜

🌿 **Herb Gathering Commands:**
/start - Awaken the Green Keeper
/help - Open this ancient spell book
/ping - Check the grimoire's life force
/about - Learn of my grand quest

🔮 **Mystical Abilities:**
- Send me any message and I'll respond with woodland wisdom
- Share cooking videos (I'm learning to extract their secrets!)
- Send images of recipes (future magic!)

*"In every recipe lies a story, in every ingredient, a memory..."*
                                    — Ancient Kitchen Proverb 🌱✨`;

    ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

/*
--------- PING ---------
 */

bot.command('ping', (ctx) => {
    const uptime = Math.floor(process.uptime());
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;

    ctx.reply(`⚡🌿 *Grimoire Status Check* 🌿⚡

🕯️ *Moss has been awake for:* ${minutes}m ${seconds}s
🌱 *Life force:* Vibrant and growing
📚 *Grimoire pages:* All intact
🔮 *Magic level:* Ready for recipe enchantments!

*The ancient tome pulses with mystical energy...*`,
        { parse_mode: 'Markdown' });
});


/*
--------- TEXT ---------
 */
bot.on('text', (ctx) => {
    const userMessage = ctx.message.text;

    if (userMessage.startsWith('/')) {
        return;
    }

    const sageResponses = [
        `🌿 *Moss nods thoughtfully* "${userMessage}" - I sense wisdom in your words, dear cook...`,
        `📜 *scribbles in grimoire* Your message "${userMessage}" has been recorded in the ancient scrolls!`,
        `✨ *Moss's eyes glow* Fascinating! "${userMessage}" - this knowledge shall help future recipes!`,
        `🍄 *rustles through herb pouches* "${userMessage}" - reminds me of an old kitchen tale...`,
        `🌱 *Moss smiles warmly* I hear you say "${userMessage}" - tell me more of your culinary adventures!`
    ];

    const randomResponse = sageResponses[Math.floor(Math.random() * sageResponses.length)];
    ctx.reply(randomResponse, { parse_mode: 'Markdown' });
});

/*
--------- VIDEO ---------
 */

bot.on('video', (ctx) => {
    ctx.reply(`🎬 Ooh, a video! Soon I'll extract recipes from these! 📝`);
});

/*
--------- PHOTO ---------
 */

bot.on('photo', (ctx) => {
    ctx.reply(`📸 Nice photo! Future me will read recipe text from images! 👁️`);
});

/*
--------- DOCUMENT ---------
 */

bot.on('document', (ctx) => {
    ctx.reply(`📄 A document! Maybe a PDF recipe? I'm still learning! 🌱`);
});

/*
--------- CATCH ---------
 */

bot.catch((err,ctx) => {
    console.error('🐛 Oops! Something went wrong:', err);
    ctx.reply('🔧 Sorry, I had a little magical malfunction! Try again? ⚡').catch(() => console.error('Could not even send error message!'))
})

/*
--------- LAUNCH ---------
 */

bot.launch().then(() => {
    console.log('✅ Bot is alive and ready for magic!');
    console.log('🔮 Try /start, /help, /ping in Telegram!');
})
.catch((err) => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
})
console.log('🌿 Starting GreenGrimoire bot...');