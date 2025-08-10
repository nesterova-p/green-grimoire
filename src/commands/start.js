const startCommand = (ctx) => {
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
};

module.exports = startCommand;