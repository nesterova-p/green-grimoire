const { query } = require('../database/connection');
const rateLimiter = require('../utils/rateLimiter');

class PersonalForumService {
    constructor(telegramBot) {
        this.bot = telegramBot;
        this.pendingSetups = new Map();
        this.setupTimeout = 60 * 60 * 1000;
    }

    async initiatePersonalForumSetup(ctx) {
        const userId = ctx.dbUser.id;
        const userName = ctx.from.first_name || ctx.from.username;

        try {
            const existingForum = await this.getUserPersonalForum(userId);
            if (existingForum && existingForum.setup_completed) {
                await ctx.reply(`✅ <b>You already have a personal recipe forum!</b>

📱 <b>Your Forum:</b> ${this.escapeHtml(existingForum.forum_name)}
📂 <b>Categories:</b> ${existingForum.categories_count || 6} recipe categories
📝 <b>Recipes:</b> ${existingForum.recipes_count || 0} saved recipes

🔍 Use /forum_status to see detailed information
🍳 Ready to add recipes? Send me any cooking video link!

🌿 <i>Your culinary grimoire awaits new recipes!</i> ✨`,
                    { parse_mode: 'HTML' });
                return;
            }

            const forumName = `🌿 ${userName}'s Recipe Grimoire`;
            const setupCode = this.generateSetupCode();

            this.pendingSetups.set(userId, {
                forumName,
                setupCode,
                timestamp: Date.now(),
                telegramUserId: ctx.from.id
            });

            setTimeout(() => {
                if (this.pendingSetups.has(userId)) {
                    this.pendingSetups.delete(userId);
                    console.log(`🕒 Setup timeout for user DB ID ${userId}`);
                }
            }, this.setupTimeout);

            const setupMessage = `🌿✨ <b>Welcome to GreenGrimoire!</b> ✨🌿

<i>Let's create your personal recipe organization system!</i>

🏗️ <b>Quick Setup (2 minutes):</b>

<b>Step 1: Create Your Personal Forum</b>
📱 Create a new group in Telegram
📝 Name it: <code>${this.escapeHtml(forumName)}</code>
👤 Add only yourself (keep it private!)

<b>Step 2: Convert to Forum</b>
⚙️ Group Settings → Group Type
🔄 Enable "Forum" option
📂 This creates category topics automatically!

<b>Step 3: Add Me as Admin</b>
👥 Group Settings → Administrators 
🤖 Add @${ctx.botInfo.username} as admin
✅ Enable "Manage Topics" permission
✅ Enable "Delete Messages" permission

<b>Step 4: Verify Setup</b>
📨 Send this code in your new forum:
<code>${setupCode}</code>

🎯 I'll join and set up your recipe categories automatically!

<b>Need help?</b> Send /setup_help for detailed instructions!

<i>Your personal culinary journey begins! 🍳✨</i>`;

            await ctx.reply(setupMessage, { parse_mode: 'HTML' });

        } catch (error) {
            console.error('Error initiating forum setup:', error);
            await ctx.reply('🐛 Error starting setup process! Please try again.');
        }
    }

    async handleSetupCode(ctx, code) {
        const userId = ctx.dbUser.id;
        const pendingSetup = this.pendingSetups.get(userId);

        console.log(`🔍 Checking setup for DB user ID: ${userId}`);
        console.log(`🔍 Pending setup exists: ${!!pendingSetup}`);
        if (pendingSetup) {
            console.log(`🔍 Expected code: ${pendingSetup.setupCode}`);
            console.log(`🔍 Received code: ${code}`);
        }

        if (!pendingSetup || pendingSetup.setupCode !== code) {
            return false;
        }

        try {
            if (ctx.chat.type !== 'supergroup' || !ctx.chat.is_forum) {
                await ctx.reply(`⚠️ <b>Setup Issue Detected!</b>

This appears to be a ${ctx.chat.type}, but I need a forum group!

🔧 <b>Please ensure:</b>
• Group is converted to "Forum" type
• Group is a supergroup (not basic group)
• Forum topics are enabled

Send /setup_help for detailed instructions!
<i>Try the setup process again!</i> 🌿`,
                    { parse_mode: 'HTML' });
                return true;
            }

            const botMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
            console.log(`🔍 Bot status in group: ${botMember.status}`);

            if (botMember.status !== 'administrator') {
                await ctx.reply(`🔑 <b>Admin Required!</b>

Current bot status: ${botMember.status}

🔧 <b>Please ensure:</b>
• Bot is added as administrator
• Bot has admin permissions in the forum

<i>Then send the setup code again!</i> 🌿`,
                    { parse_mode: 'HTML' });
                return true;
            }

            console.log('✅ Bot is administrator - proceeding with forum setup');
            await this.setupPersonalForum(ctx, pendingSetup);
            this.pendingSetups.delete(userId);
            return true;

        } catch (error) {
            console.error('Error handling setup code:', error);
            await ctx.reply('🐛 Error during setup verification! Please try again.');
            return true;
        }
    }

    async setupPersonalForum(ctx, setupInfo) {
        try {
            await ctx.reply(`🎉 <b>Perfect Setup Detected!</b> 🎉

🔮 Setting up your personal recipe categories...
📂 Creating organized topics for your collection...

<i>Ancient magic in progress...</i> ⚡`, { parse_mode: 'HTML' });

            const categories = await this.getDefaultCategories();
            const createdTopics = [];

            for (const category of categories) {
                try {
                    const topic = await ctx.telegram.createForumTopic(
                        ctx.chat.id,
                        `${category.icon} ${category.name_en}`,
                        {
                            icon_color: this.getCategoryColor(category.key)
                        }
                    );

                    createdTopics.push({
                        category_key: category.key,
                        topic_id: topic.message_thread_id,
                        topic_name: `${category.icon} ${category.name_en}`
                    });

                    console.log(`✅ Created topic: ${category.name_en} (ID: ${topic.message_thread_id})`);

                    // delay between topic creation and welcome m
                    await this.sleep(500);
                    await this.sendCategoryWelcomeMessage(ctx, topic.message_thread_id, category);

                } catch (topicError) {
                    console.error(`Could not create topic for ${category.key}:`, topicError.message);
                }
            }

            const forumId = await this.savePersonalForum(ctx.dbUser.id, {
                forum_chat_id: ctx.chat.id,
                forum_name: setupInfo.forumName,
                forum_username: ctx.chat.username,
                created_topics: createdTopics
            });

            const categoriesList = createdTopics.map(t => `• ${this.escapeHtml(t.topic_name)}`).join('\n');

            await ctx.reply(`✅ <b>Your Personal Recipe Forum is Ready!</b> ✅

📂 <b>Created Categories:</b>
${categoriesList}

🎯 <b>How to use:</b>
1️⃣ Send cooking videos to our private chat (@${ctx.botInfo.username})
2️⃣ I'll extract recipes and post them here automatically
3️⃣ Browse organized recipes by category
4️⃣ Keep your culinary collection forever!

🌿 <b>Your personal grimoire awaits new recipes!</b> ✨

<i>Start by sending me a cooking video in our private chat!</i>`,
                { parse_mode: 'HTML' });

            console.log(`🎉 Personal forum setup completed for user ${ctx.dbUser.id}`);

        } catch (error) {
            console.error('Error setting up personal forum:', error);
            await ctx.reply(`🐛 <b>Setup Error</b> 🐛

${this.escapeHtml(error.message || 'Unknown setup error occurred')}

<i>Please try the setup process again!</i> 🌿
Send /setup_help if you need assistance.`, { parse_mode: 'HTML' });
        }
    }

    async postRecipeToPersonalForum(recipe, userId, categoryKey) {
        try {
            const userForum = await this.getUserPersonalForum(userId);
            if (!userForum || !userForum.setup_completed) {
                console.log(`No personal forum found for user ${userId}`);
                return false;
            }

            const topicInfo = userForum.topics.find(t => t.category_key === categoryKey);
            if (!topicInfo) {
                console.error(`No topic found for category ${categoryKey} in user ${userId}'s forum`);
                return false;
            }

            let videoSent = false;
            if (recipe.video_file_id) {
                try {
                    await rateLimiter.sendVideo(
                        this.bot,
                        userForum.forum_chat_id,
                        recipe.video_file_id,
                        {
                            message_thread_id: topicInfo.topic_id,
                            caption: `🎬 <b>Original Video:</b> ${this.escapeHtml(recipe.title)}`,
                            parse_mode: 'HTML'
                        }
                    );
                    videoSent = true;
                    console.log(`📹 Video sent to forum topic: ${categoryKey}`);
                } catch (videoError) {
                    console.log('Could not send video to personal forum:', videoError.message);
                }
            }

            // delay between video and recipe
            if (videoSent) {
                await this.sleep(1500); // 1.5 sec
            }

            const recipeMessage = this.formatRecipeMessage(recipe);
            const sentMessage = await rateLimiter.sendMessage(
                this.bot,
                userForum.forum_chat_id,
                recipeMessage,
                {
                    message_thread_id: topicInfo.topic_id,
                    parse_mode: 'HTML',
                    reply_markup: this.getRecipeKeyboard(recipe.id)
                }
            );

            console.log(`📝 Recipe posted to personal forum: ${recipe.title} → ${categoryKey}`);
            return sentMessage.message_id;

        } catch (error) {
            console.error('Error posting to personal forum:', error);
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async getUserPersonalForum(userId) {
        try {
            const result = await query(
                `SELECT
                     pf.*,
                     json_agg(
                             json_build_object(
                                     'category_key', ft.category_key,
                                     'topic_id', ft.topic_id,
                                     'topic_name', ft.topic_name
                             )
                     ) FILTER (WHERE ft.id IS NOT NULL) as topics,
                         COUNT(DISTINCT ft.id) as categories_count,
                     COUNT(DISTINCT r.id) as recipes_count
                 FROM personal_forums pf
                          LEFT JOIN forum_topics ft ON pf.id = ft.personal_forum_id
                          LEFT JOIN recipes r ON r.personal_forum_id = pf.id
                 WHERE pf.user_id = $1
                 GROUP BY pf.id`,
                [userId]
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error getting user personal forum:', error);
            return null;
        }
    }

    async savePersonalForum(userId, forumData) {
        try {
            const forumResult = await query(
                `INSERT INTO personal_forums (user_id, forum_chat_id, forum_name, forum_username, setup_completed)
                 VALUES ($1, $2, $3, $4, true) RETURNING id`,
                [userId, forumData.forum_chat_id, forumData.forum_name, forumData.forum_username]
            );

            const forumId = forumResult.rows[0].id;

            for (const topic of forumData.created_topics) {
                await query(
                    `INSERT INTO forum_topics (personal_forum_id, category_key, topic_id, topic_name)
                     VALUES ($1, $2, $3, $4)`,
                    [forumId, topic.category_key, topic.topic_id, topic.topic_name]
                );
            }

            console.log(`✅ Personal forum saved for user ${userId}`);
            return forumId;

        } catch (error) {
            console.error('Error saving personal forum:', error);
            throw error;
        }
    }

    async getDefaultCategories() {
        try {
            const result = await query(
                'SELECT * FROM categories WHERE is_default = true ORDER BY key',
                []
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting default categories:', error);
            return [];
        }
    }

    generateSetupCode() {
        return `SETUP_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    getCategoryColor(categoryKey) {
        const colors = {
            'salads': 0x50C878,
            'desserts': 0xFF69B4,
            'soups': 0xFF8C00,
            'drinks': 0x87CEEB,
            'main_dishes': 0xCD853F,
            'snacks': 0xFFD700
        };
        return colors[categoryKey] || 0x32CD32;
    }

    formatRecipeMessage(recipe) {
        const timestamp = new Date(recipe.created_at).toLocaleDateString();
        const title = this.escapeHtml(recipe.title);
        const recipeText = this.escapeHtml(recipe.structured_recipe);
        const platform = this.escapeHtml(recipe.video_platform || 'Unknown');

        return `🍳 <b>${title}</b> 🍳

${recipeText}

📅 <b>Added:</b> ${timestamp}
📱 <b>Source:</b> ${platform}

🌿 <i>From your personal GreenGrimoire collection</i> ✨`;
    }

    getRecipeKeyboard(recipeId) {
        return {
            inline_keyboard: [
                [
                    { text: '⭐ Rate', callback_data: `rate_recipe_${recipeId}` },
                    { text: '🔄 Scale', callback_data: `scale_recipe_${recipeId}` }
                ],
                [
                    { text: '🌐 Translate', callback_data: `translate_recipe_${recipeId}` },
                    { text: '📋 Share', callback_data: `share_recipe_${recipeId}` }
                ]
            ]
        };
    }

    async sendCategoryWelcomeMessage(ctx, topicId, category) {
        const categoryName = this.escapeHtml(category.name_en);
        const categoryNameLower = this.escapeHtml(category.name_en.toLowerCase());

        const message = `🌿✨ <b>Welcome to your ${categoryName}!</b> ✨🌿

📚 All your <b>${categoryNameLower}</b> recipes will appear here automatically!

🤖 <b>How it works:</b>
• Send cooking videos to @${ctx.botInfo.username} in private chat
• Recipes get extracted and organized here
• Browse, rate, and scale your collection!

<i>Your ${categoryNameLower} collection awaits delicious recipes!</i> 🍳✨`;

        try {
            await rateLimiter.sendMessage(
                ctx.telegram,
                ctx.chat.id,
                message,
                {
                    message_thread_id: topicId,
                    parse_mode: 'HTML'
                }
            );
        } catch (error) {
            console.log('Could not send category welcome message:', error.message);
        }
    }
}

module.exports = PersonalForumService;