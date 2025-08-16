const setupHelpCommand = async (ctx) => {
    const helpMessage = `🆘 **Personal Forum Setup Help** 🆘

**Detailed Steps:**

**1. Create Group**
• Open Telegram → New Group
• Name: "🌿 [YourName]'s Recipe Grimoire"  
• Add only yourself (keep private!)

**2. Convert to Forum**
• Group Settings → Group Type
• Toggle "Forum" ON
• This enables category topics!

**3. Add Bot as Admin**
• Group Settings → Administrators
• Add @${ctx.botInfo.username}
• ✅ Enable "Manage Topics" permission

**4. Send Setup Code**
• Come back here and get your setup code
• Send the code in your new forum
• I'll join and set up categories automatically!

**Still having trouble?**
• Make sure group is "Forum" type (not regular)
• Verify I have "Manage Topics" permission
• Check that group is private (just you + me)

**Video Tutorial:** [Watch Setup Guide](https://t.me/GreenGrimoireHelp)

*Let's get your recipe organization perfect!* 🌿✨`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
};

module.exports = setupHelpCommand;