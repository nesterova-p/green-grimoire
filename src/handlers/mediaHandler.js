const mediaHandler = {
    video: (ctx) => {
        ctx.reply(`🎬 Ooh, a video! Soon I'll extract recipes from these! 📝`);
    },

    photo: (ctx) => {
        ctx.reply(`📸 Nice photo! Future me will read recipe text from images! 👁️`);
    },

    document: (ctx) => {
        ctx.reply(`📄 A document! Maybe a PDF recipe? I'm still learning! 🌱`);
    }
};

module.exports = mediaHandler;