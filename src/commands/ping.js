const pingCommand = (ctx) => {
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
};

module.exports = pingCommand;