const helpCommand = (ctx) => {
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
};

module.exports = helpCommand;