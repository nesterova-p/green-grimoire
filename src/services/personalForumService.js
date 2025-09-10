const { query } = require('../database/connection');
const rateLimiter = require('../utils/rateLimiter');

class PersonalForumService {
    constructor(telegramBot) {
        this.bot = telegramBot;
        this.pendingSetups = new Map();
        this.setupTimeout = 60 * 60 * 1000; // 1 hour
        this.setupSteps = {
            'step_1': {
                title: '📱 Create Your Group',
                instruction: `🏗️ *Step 1: Create Your Personal Group*

📱 *Instructions:*
• Open Telegram
• Tap the *"New Group"* button
• Name it: *"🌿 [Your Name]'s Recipe Grimoire"*
• Add *only yourself* (keep it private!)

🎯 *Important:* Don't add anyone else yet - this will be your personal recipe collection!

✨ *Once you've created the group, tap "Done" below!*`,
                nextStep: 'step_2'
            },
            'step_2': {
                title: '🔄 Convert to Forum',
                instruction: `🔄 *Step 2: Enable Forum Features*

⚙️ *Instructions:*
• Go to your new group settings
• Tap "Group Type"  
• Toggle *"Forum"* ON
• Confirm the change

📂 *What this does:*
• Enables category topics (like folders)
• Allows organized recipe sections
• Creates a beautiful browsing experience

✅ *Forum enabled? Tap "Done" to continue!*`,
                nextStep: 'step_3'
            },
            'step_3': {
                title: '🤖 Add Bot as Admin',
                instruction: `🤖 *Step 3: Add Me as Administrator*

👥 *Instructions:*
• In your forum group settings
• Tap "Administrators"
• Tap *"Add Administrator"*
• Search and add: @{BOT_USERNAME}
• ✅ Enable "Manage Topics" permission
• ✅ Enable "Delete Messages" permission

🔑 *Why I need admin:*
• To create recipe category topics
• To organize recipes automatically
• To manage your collection

🤖 *Bot added as admin? Almost done!*`,
                nextStep: 'step_4'
            },
            'step_4': {
                title: '🔮 Verify Setup',
                instruction: `🔮 *Step 4: Final Verification*

📨 *Instructions:*
• Go to your forum group
• Send this setup code:
*{SETUP_CODE}*

🎯 *What happens next:*
• I'll join your forum automatically
• I'll create recipe category topics
• Your personal grimoire will be ready!

📱 *Send the code in your forum and wait for magic!*`,
                nextStep: 'complete'
            }
        };
    }

    async initiatePersonalForumSetup(ctx) {
        const userId = ctx.dbUser.id;
        const userName = ctx.from.first_name || ctx.from.username;

        try {
            const existingForum = await this.getUserPersonalForum(userId);
            if (existingForum && existingForum.setup_completed) {
                const forumLink = existingForum.forum_chat_id ?
                    `https://t.me/c/${Math.abs(existingForum.forum_chat_id).toString().slice(4)}/1` :
                    'your personal forum';

                const welcomeBackMessage = `🌿✨ *Welcome back, ${userName}!* ✨🌿

*Moss recognizes a fellow culinary adventurer!*

📚 *Your Personal Recipe Grimoire is Ready!*

📱 *Your Forum:* [${existingForum.forum_name}](${forumLink})
📂 *Categories:* ${existingForum.categories_count || 6} recipe topics organized
📝 *Recipes:* ${existingForum.recipes_count || 0} culinary treasures saved

🍳 *Ready to cook?* Send me any cooking video link and I'll:
• 🔮 Extract the recipe using ancient AI magic
• 📂 Organize it in the appropriate category topic
• 🎬 Keep the original video for reference
• ✨ Make it searchable in your personal collection

🌱 *Your culinary journey continues! Send me a cooking video to begin...* 

*Use /help for more magical commands!* 📜⚡`;

                await ctx.reply(welcomeBackMessage, { parse_mode: 'Markdown' });
                return;
            }

            if (existingForum && !existingForum.setup_completed) {
                await this.resumeInteractiveSetup(ctx, existingForum);
                return;
            }

            await this.startInteractiveSetup(ctx, userName);
        } catch (error) {
            console.error('Error initiating forum setup:', error);
            await ctx.reply('🐛 Error starting setup process! Please try again.');
        }
    }

    async startInteractiveSetup(ctx, userName) {
        const userId = ctx.dbUser.id;
        const forumName = `🌿 ${userName}'s Recipe Grimoire`;
        const setupCode = this.generateSetupCode();
        this.pendingSetups.set(userId, {
            forumName,
            setupCode,
            currentStep: 'step_1',
            timestamp: Date.now(),
            telegramUserId: ctx.from.id,
            botUsername: ctx.botInfo.username
        });

        setTimeout(() => {
            if (this.pendingSetups.has(userId)) {
                this.pendingSetups.delete(userId);
                console.log(`🕒 Interactive setup timeout for user DB ID ${userId}`);
            }
        }, this.setupTimeout);

        // welcome
        const welcomeMessage = `🌿✨ *Welcome to GreenGrimoire Setup!* ✨🌿

*Hi ${userName}! Let's create your personal recipe organization system!*

🎯 *What we'll set up:*
• 📱 Personal recipe forum with organized categories
• 🤖 Automatic recipe extraction and categorization  
• 🎬 Original videos preserved with recipes
• 🔍 Easy browsing by dish type

⏱️ *Time needed:* About 2-3 minutes
📝 *Steps:* 4 simple steps

🚀 *Ready to begin your culinary journey?*`;

        await ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🚀 Start Setup', callback_data: 'start_interactive_setup' },
                        { text: '❓ What is this?', callback_data: 'setup_info' }
                    ],
                    [
                        { text: '💬 Need Help?', callback_data: 'setup_help_contact' }
                    ]
                ]
            }
        });
    }

    async resumeInteractiveSetup(ctx, existingForum) {
        await ctx.reply(`🔄 *Setup In Progress* 🔄

Hi! I see you started setting up your personal recipe forum but didn't complete it.

🎯 *Your Forum:* "${existingForum.forum_name}"

Would you like to continue where you left off or start fresh?`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '▶️ Continue Setup', callback_data: 'continue_setup' },
                            { text: '🔄 Start Over', callback_data: 'restart_setup' }
                        ],
                        [
                            { text: '💬 Need Help?', callback_data: 'setup_help_contact' }
                        ]
                    ]
                }
            });
    }

    async showSetupStep(ctx, userId, messageId = null) {
        const setupState = this.pendingSetups.get(userId);
        if (!setupState) {
            await ctx.reply('❌ Setup session expired. Please start again with /start');
            return;
        }

        const currentStep = this.setupSteps[setupState.currentStep];
        if (!currentStep) {
            console.error(`Unknown setup step: ${setupState.currentStep}`);
            return;
        }

        let instruction = currentStep.instruction
            .replace('{BOT_USERNAME}', setupState.botUsername)
            .replace('{SETUP_CODE}', setupState.setupCode);

        const stepNumber = parseInt(setupState.currentStep.split('_')[1]);
        const progressBar = '🟢'.repeat(stepNumber) + '⚪'.repeat(4 - stepNumber);

        const message = `*${currentStep.title}*

${instruction}

📊 *Progress:* ${progressBar} (${stepNumber}/4)`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Done!', callback_data: `setup_step_done_${setupState.currentStep}` },
                    { text: '💬 Need Help?', callback_data: 'setup_help_contact' }
                ],
                [
                    { text: '⬅️ Previous', callback_data: `setup_step_back_${setupState.currentStep}` },
                    { text: '❌ Cancel Setup', callback_data: 'setup_cancel' }
                ]
            ]
        };

        // hide previous button for 1 step
        if (stepNumber === 1) {
            keyboard.inline_keyboard[1].shift();
        }

        try {
            if (messageId) {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    messageId,
                    null,
                    message,
                    { parse_mode: 'Markdown', reply_markup: keyboard }
                );
            } else {
                const sent = await ctx.reply(message, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
                return sent.message_id;
            }
        } catch (error) {
            console.error('Error showing setup step:', error);
            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    }

    async handleSetupStepDone(ctx, currentStep) {
        const userId = ctx.dbUser.id;
        const setupState = this.pendingSetups.get(userId);

        if (!setupState) {
            await ctx.answerCbQuery('❌ Setup session expired!');
            return;
        }

        const step = this.setupSteps[currentStep];
        if (!step) {
            await ctx.answerCbQuery('❌ Invalid step!');
            return;
        }

        setupState.currentStep = step.nextStep;
        this.pendingSetups.set(userId, setupState);

        if (step.nextStep === 'complete') {
            await ctx.answerCbQuery('🎉 Setup ready for verification!');
            await this.showSetupComplete(ctx);
        } else {
            await ctx.answerCbQuery('✅ Step completed!');
            await this.showSetupStep(ctx, userId, ctx.callbackQuery.message.message_id);
        }
    }

    async showSetupComplete(ctx) {
        const userId = ctx.dbUser.id;
        const setupState = this.pendingSetups.get(userId);

        const message = `🎉 *Setup Instructions Complete!* 🎉

✅ *All steps finished!*
📱 *Your forum should be ready*
🤖 *Bot has been added as admin*

🔮 *Final Step:*
Go to your forum and send: *${setupState.setupCode}*

⏳ *Waiting for verification...*
*Once you send the code, I'll automatically set up your recipe categories!*

🌿 *Your personal grimoire is almost ready!* ✨`;

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📋 Copy Setup Code', callback_data: `copy_setup_code_${setupState.setupCode}` }
                    ],
                    [
                        { text: '💬 Need Help?', callback_data: 'setup_help_contact' },
                        { text: '🔄 Start Over', callback_data: 'restart_setup' }
                    ]
                ]
            }
        });
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
                await ctx.reply(`⚠️ *Setup Issue Detected!*

This appears to be a ${ctx.chat.type}, but I need a forum group!

🔧 *Please ensure:*
• Group is converted to "Forum" type
• Group is a supergroup (not basic group)
• Forum topics are enabled

💬 *Need help?* Use the "Need Help" button to contact support!
🔄 *Try again:* Send /start to restart setup

*Let's get this working perfectly!* 🌿`,
                    { parse_mode: 'Markdown' });
                return true;
            }

            const botMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
            console.log(`🔍 Bot status in group: ${botMember.status}`);

            if (botMember.status !== 'administrator') {
                await ctx.reply(`🔑 *Admin Required!*

Current bot status: ${botMember.status}

🔧 *Please ensure:*
• Bot is added as administrator
• Bot has "Manage Topics" permission
• Bot has "Delete Messages" permission

💬 *Need help?* Contact support for assistance!
🔄 *Then send the setup code again!*

*Almost there!* 🌿`,
                    { parse_mode: 'Markdown' });
                return true;
            }

            console.log('✅ Bot is administrator - proceeding with forum setup');
            await this.setupPersonalForum(ctx, pendingSetup);
            this.pendingSetups.delete(userId);
            return true;

        } catch (error) {
            console.error('Error handling setup code:', error);
            await ctx.reply(`🐛 *Setup Error* 🐛

${this.escapeHtml(error.message || 'Unknown setup error occurred')}

💬 *Need help?* Contact support if this keeps happening!
🔄 *Try again:* Send the setup code again

*We'll get this working!* 🌿`, { parse_mode: 'HTML' });
            return true;
        }
    }


    setupInteractiveHandlers(bot) {
        // start
        bot.action('start_interactive_setup', async (ctx) => {
            await ctx.answerCbQuery('🚀 Starting guided setup!');
            const userId = ctx.dbUser.id;
            await this.showSetupStep(ctx, userId, ctx.callbackQuery.message.message_id);
        });

        // info
        bot.action('setup_info', async (ctx) => {
            await ctx.answerCbQuery('ℹ️ About personal forums');
            await ctx.reply(`ℹ️ *About Personal Recipe Forums* ℹ️

📚 *What is it?*
A private Telegram forum group that organizes your recipes automatically!

🎯 *Benefits:*
• 📂 Automatic categorization (Salads, Desserts, etc.)
• 🎬 Original videos preserved with recipes
• 🔍 Easy browsing by dish type
• 📱 Beautiful organized interface
• 🔐 Completely private (just you!)

🤖 *How it works:*
1. You send cooking videos to this bot
2. Bot extracts recipes using AI
3. Bot posts organized recipes to your forum
4. You browse your collection anytime!

🌿 *Like having a personal digital cookbook!* ✨`,
                { parse_mode: 'Markdown' });
        });

        // continue
        bot.action('continue_setup', async (ctx) => {
            await ctx.answerCbQuery('▶️ Continuing setup...');
            const userId = ctx.dbUser.id;
            await this.showSetupStep(ctx, userId, ctx.callbackQuery.message.message_id);
        });

        // restart
        bot.action('restart_setup', async (ctx) => {
            await ctx.answerCbQuery('🔄 Restarting setup...');
            const userId = ctx.dbUser.id;
            this.pendingSetups.delete(userId);
            await this.startInteractiveSetup(ctx, ctx.from.first_name || ctx.from.username);
        });

        // done
        bot.action(/setup_step_done_(.+)/, async (ctx) => {
            const currentStep = ctx.match[1];
            await this.handleSetupStepDone(ctx, currentStep);
        });

        // back
        bot.action(/setup_step_back_(.+)/, async (ctx) => {
            await ctx.answerCbQuery('⬅️ Going back...');
            const userId = ctx.dbUser.id;
            const setupState = this.pendingSetups.get(userId);

            if (setupState) {
                const currentStepNum = parseInt(setupState.currentStep.split('_')[1]);
                if (currentStepNum > 1) {
                    setupState.currentStep = `step_${currentStepNum - 1}`;
                    this.pendingSetups.set(userId, setupState);
                    await this.showSetupStep(ctx, userId, ctx.callbackQuery.message.message_id);
                }
            }
        });

        // help
        bot.action('setup_help_contact', async (ctx) => {
            await ctx.answerCbQuery('💬 Getting help info...');

            // You can customize these in your environment variables
            const developerUsername = process.env.DEVELOPER_USERNAME || 'YourUsername';
            const developerUserId = process.env.DEVELOPER_USER_ID || 'YOUR_USER_ID';

            await ctx.reply(`💬 *Need Help with Setup?* 💬

🆘 *If you're stuck or having issues:*

👤 *Contact the Developer:*
[📱 Message @${developerUsername}](tg://user?id=${developerUserId})

🐛 *Having technical issues?*
Send a screenshot of the error and describe what step you're on.

⚡ *Quick fixes:*
• Make sure group is "Forum" type (not regular group)
• Ensure bot has "Manage Topics" permission
• Try refreshing Telegram app

🌿 *I'm here to help make your setup perfect!* ✨`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🔄 Try Setup Again', callback_data: 'restart_setup' }
                            ]
                        ]
                    }
                });
        });

        // copy
        bot.action(/copy_setup_code_(.+)/, async (ctx) => {
            const setupCode = ctx.match[1];
            await ctx.answerCbQuery('📋 Code ready to copy!');
            await ctx.reply(`📋 *Setup Code Ready* 📋

\`${setupCode}\`

📱 *Instructions:*
1. Go to your forum group
2. Tap the message box
3. Paste and send this code
4. Wait for the magic! ✨

*Copy the code above and send it in your forum!*`,
                { parse_mode: 'Markdown' });
        });

        // cancel
        bot.action('setup_cancel', async (ctx) => {
            await ctx.answerCbQuery('❌ Setup cancelled');
            const userId = ctx.dbUser.id;
            this.pendingSetups.delete(userId);

            await ctx.editMessageText(`❌ *Setup Cancelled* ❌

No worries! You can start the setup anytime.

🚀 *Ready to try again?* Send /start
💬 *Need help first?* Contact support

🌿 *Your culinary journey awaits!* ✨`,
                { parse_mode: 'Markdown' });
        });
    }

    async setupPersonalForum(ctx, setupInfo) {
        try {
            await ctx.reply(`🎉 *Perfect Setup Detected!* 🎉

🔮 Setting up your personal recipe categories...
📂 Creating organized topics for your collection...

*Ancient magic in progress...* ⚡`, { parse_mode: 'Markdown' });

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

            await ctx.reply(`✅ *Your Personal Recipe Forum is Ready!* ✅

📂 *Created Categories:*
${categoriesList}

🎯 *How to use:*
1️⃣ Send cooking videos to our *General* topic
2️⃣ I'll extract recipes and post them here automatically
3️⃣ Browse organized recipes by category
4️⃣ Keep your culinary collection forever!

🌿 *Your personal grimoire awaits new recipes!* ✨

*Start by sending me a cooking video in our chat!*`,
                { parse_mode: 'Markdown' });

            console.log(`🎉 Personal forum setup completed for user ${ctx.dbUser.id}`);

        } catch (error) {
            console.error('Error setting up personal forum:', error);
            await ctx.reply(`🐛 *Setup Error* 🐛

${this.escapeHtml(error.message || 'Unknown setup error occurred')}

💬 *Need help?* Contact support for assistance!
🔄 *Try again:* Send the setup code again

*We'll get this working perfectly!* 🌿`, { parse_mode: 'HTML' });
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
                await this.sleep(1500);
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
        const platform = this.escapeHtml(recipe.video_platform || 'Unknown');

        // Convert Markdown to HTML formatting instead of escaping
        const recipeTextHtml = this.convertMarkdownToHtml(recipe.structured_recipe);

        return `🍳 <b>${title}</b> 🍳

${recipeTextHtml}

📅 <b>Added:</b> ${timestamp}
📱 <b>Source:</b> ${platform}

🌿 <i>From your personal GreenGrimoire collection</i> ✨`;
    }

    convertMarkdownToHtml(markdownText) {
        if (!markdownText) return '';
        let htmlText = markdownText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        htmlText = htmlText.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
        htmlText = htmlText.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<i>$1</i>');

        return htmlText;
    }

    getRecipeKeyboard(recipeId, hasNutritionAnalysis = false) {
        const baseButtons = [
            [
                { text: '⭐ Rate', callback_data: `rate_recipe_${recipeId}` },
                { text: '⚖️ Scale', callback_data: `scale_recipe_${recipeId}` }
            ]
        ];

        if (!hasNutritionAnalysis) {
            baseButtons.push([
                { text: '📊 Analyze Nutrition', callback_data: `analyze_nutrition_${recipeId}` },
                { text: '🛒 Shopping List', callback_data: `generate_single_list_${recipeId}` }
            ]);
        } else {
            baseButtons.push([
                { text: '✅ Has Nutrition Data', callback_data: 'nutrition_already_done' },
                { text: '🛒 Shopping List', callback_data: `generate_single_list_${recipeId}` }
            ]);
        }

        baseButtons.push([
            { text: '🌐 Translate', callback_data: `translate_recipe_${recipeId}` },
        ]);

        return {
            inline_keyboard: baseButtons
        };
    }

    async sendCategoryWelcomeMessage(ctx, topicId, category) {
        const categoryName = this.escapeHtml(category.name_en);
        const categoryNameLower = this.escapeHtml(category.name_en.toLowerCase());

        const message = `🌿✨ <b>Welcome to your ${categoryName}!</b> ✨🌿

📚 All your <b>${categoryNameLower}</b> recipes will appear here automatically!

🤖 <b>How it works:</b>
• Send cooking videos to <b>General</b> topic
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