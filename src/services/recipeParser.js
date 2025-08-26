const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const {saveRecipe, addRecipeToCategory, addTagsToRecipe} = require('../database/recipeService');
const { getCategoryByKey, suggestCategory } = require('../database/categoryService');
const { detectPlatformFromUrl } = require('./platformDetection');
const PersonalForumService = require('../services/PersonalForumService');
const { query } = require('../database/connection');

const parseRecipe = async (textSources, ctx, videoInfo, silent = false, videoMessageInfo = null) => {

    try {
        const combinedText = combineTextSources(textSources);

        if (!combinedText || combinedText.length < 20) {
            if (!silent) {
                ctx.reply(`📝 **No Recipe Content** 📝

🌿 The video content is too brief for recipe extraction.

This might be:
- Entertainment content
- Visual-only cooking demonstration  
- Non-recipe video

*Content is preserved for reference!* ✨`,
                    { parse_mode: 'Markdown' });
            }
            return null;
        }

        if (!silent) {
            ctx.reply(`🍳 **Extracting Recipe** 🍳

🔮 Analyzing ${combinedText.length} characters of content...
🧙‍♀️ Organizing ingredients and cooking steps...

*AI magic in progress...* 🌿`,
                { parse_mode: 'Markdown' });
        }

        const recipeAnalysis = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a master chef and recipe organizer. Extract and format recipes from text.

TASK: Parse the provided text and extract recipe information.

OUTPUT FORMAT (use this exact structure):
🍳 **RECIPE TITLE:**
[Extract or create descriptive title]

📋 **INGREDIENTS:**
- **[quantity]** [ingredient name]
- **[quantity]** [ingredient name]
- **[quantity]** [ingredient name]
(etc.)

👩‍🍳 **COOKING STEPS:**
1. [Very detailed step with specific techniques, timing, and visual cues]
2. [Very detailed step with specific techniques, timing, and visual cues]
3. [Very detailed step with specific techniques, timing, and visual cues]
(etc.)

⏱️ **COOKING TIME:**
[Extract timing if mentioned, or estimate based on cooking method]

🍽️ **SERVINGS:**
[Extract serving info if mentioned, OR estimate based on ingredient quantities]

📝 **NOTES:**
[Any additional tips or notes]

FORMATTING RULES:
- **QUANTITIES MUST BE BOLD**: Use **bold** formatting around all quantities and measurements
- Examples: **4-5** chicken thighs, **3 cm** ginger, **2 tbsp** soy sauce, **1 cup** rice
- For ingredients without specific quantities: **to taste** salt, **as needed** oil

DETAILED COOKING STEPS REQUIREMENTS:
- **BE VERY DETAILED**: Each step should be comprehensive with specific instructions
- **Include timing**: "Sauté for **2-3 minutes** until golden" not just "sauté"
- **Visual cues**: "until edges are golden brown" or "until fragrant"
- **Techniques**: Specify how to cut, mix, heat level, etc.
- **Temperature details**: "over medium heat", "bring to a boil then reduce to simmer"
- **Texture descriptions**: "until soft and translucent", "until crispy"
- **Equipment details**: "in a large pot", "using a wooden spoon"

EXAMPLES OF DETAILED STEPS:
❌ Simple: "Cook chicken"
✅ Detailed: "Heat **2 tbsp** oil in a large pot over medium-high heat. Add chicken thighs and sear for **3-4 minutes** per side until golden brown and crispy. Remove chicken and set aside."

❌ Simple: "Add vegetables"  
✅ Detailed: "In the same pot, add diced onion and cook for **2-3 minutes** until translucent. Add minced garlic and ginger, stirring constantly for **30 seconds** until fragrant."

INTELLIGENT ESTIMATION RULES:
- SERVINGS: If not mentioned, estimate based on ingredient amounts
- COOKING TIME: If not mentioned, estimate based on method
- MISSING QUANTITIES: If ingredients lack amounts, suggest reasonable quantities and make them bold

RULES:
- If no clear recipe found, respond: "NO_RECIPE_DETECTED"
- ALWAYS provide serving estimates, even if not mentioned
- ALWAYS provide time estimates, even if not mentioned  
- Add "(estimated)" when you're estimating missing info
- Keep original cooking terms and techniques
- Preserve any cultural/regional cooking methods
- **ALWAYS make quantities and measurements bold with ** formatting**
- **MAKE EVERY COOKING STEP VERY DETAILED AND COMPREHENSIVE**`
                },
                {
                    role: 'user',
                    content: `Please extract and format the recipe from this text:\n\n${combinedText}`
                }
            ],
            temperature: 0.3,
            max_tokens: 1000
        });

        const recipeContent = recipeAnalysis.choices[0].message.content.trim();

        if (recipeContent === 'NO_RECIPE_DETECTED' || recipeContent.includes('NO_RECIPE_DETECTED')) {
            if (!silent) {
                ctx.reply(`🔍 **No Recipe Structure Found** 🔍

🌿 Content analyzed but no structured recipe detected:
- May be entertainment or lifestyle content
- Visual-only cooking demonstration
- Recipe inspiration without specific instructions

*All captured text is preserved for reference!* ✨`,
                    { parse_mode: 'Markdown' });
            }
            return null;
        }

        const titleMatch = recipeContent.match(/🍳 \*\*RECIPE TITLE:\*\*\s*(.+?)(?=\n|$)/);
        const recipeTitle = titleMatch ? titleMatch[1].trim() : (videoInfo.title || 'Untitled Recipe');

        await ctx.reply(`🎉 **RECIPE EXTRACTED!** 🎉

${recipeContent}

💾 *Saving to your recipe collection...* ✨`,
            { parse_mode: 'Markdown' });

        // auto save
        const savedRecipe = await saveRecipeToDatabase({
            title: recipeTitle,
            originalVideoUrl: videoInfo.original_video_url || videoInfo.webpage_url,
            videoPlatform: detectPlatformFromUrl(videoInfo.original_video_url || videoInfo.webpage_url),
            contentSources: textSources,
            structuredRecipe: recipeContent,
            sourceLanguage: 'auto',
            targetLanguage: ctx.dbUser.preferred_language || 'en',
            cookingTimeMinutes: extractCookingTime(recipeContent),
            servings: extractServings(recipeContent),
            difficulty: 'medium'
        }, ctx.dbUser.id, ctx, recipeContent, videoMessageInfo);

        if (savedRecipe) {
            await ctx.reply(`✅ **RECIPE SAVED TO YOUR COLLECTION!** ✅

📚 **Recipe:** "${recipeTitle}"
📂 **Category:** ${savedRecipe.categoryName}
🏷️ **Tags:** ${savedRecipe.tags.join(', ')}

🔍 *Use /my_recipes to see your collection!*
📊 *Use /stats to see your cooking stats!*

🌿 *Your culinary grimoire grows stronger!* ✨`,
                { parse_mode: 'Markdown' });
        }

        return {
            rawText: combinedText,
            structuredRecipe: recipeContent,
            videoTitle: videoInfo.title,
            extractedFrom: Object.keys(textSources).filter(key => textSources[key]),
            savedRecipe: savedRecipe
        };

    } catch (error) {
        console.error('Recipe parsing error:', error);

        if (!silent) {
            ctx.reply(`🐛 **Recipe Parsing Failed** 🐛

${error.message || 'AI recipe analysis temporarily unavailable'}

🌿 **Possible causes:**
- OpenAI API issues
- Content too complex for parsing  
- Network interference

*Raw transcription is still captured!* ✨`,
                { parse_mode: 'Markdown' });
        }

        return null;
    }
};

const combineTextSources = (textSources) => {
    let combinedText = '';

    if (textSources.transcript) {
        combinedText += `SPEECH TRANSCRIPT:\n${textSources.transcript}\n\n`;
    }

    if (textSources.description) {
        combinedText += `VIDEO DESCRIPTION:\n${textSources.description}\n\n`;
    }

    if (textSources.ocrText) {
        combinedText += `VISUAL TEXT:\n${textSources.ocrText}\n\n`;
    }

    return combinedText.trim();
};

const saveRecipeToDatabase = async (recipeData, userId, ctx, recipeContent, videoMessageInfo = null) => {
    try {
        console.log(`Auto-saving recipe: "${recipeData.title}" for user ${userId}`);
        const recipeDataWithVideo = {
            ...recipeData,
            videoMessageId: videoMessageInfo?.messageId || null,
            videoFileId: videoMessageInfo?.fileId || null,
            videoChatId: videoMessageInfo?.chatId || null
        };
        const savedRecipe = await saveRecipe(recipeDataWithVideo, userId);
        const suggestedCategoryKey = suggestCategory(recipeContent);
        const category = await getCategoryByKey(suggestedCategoryKey);

        if (category) {
            await addRecipeToCategory(savedRecipe.id, category.id);
            console.log(`Recipe categorized as: ${category.name_en}`);
        }

        const tags = extractTags(recipeContent);
        if (tags.length > 0) {
            await addTagsToRecipe(savedRecipe.id, tags, ctx.dbUser.preferred_language || 'en');
            console.log(`Added tags: ${tags.join(', ')}`);
        }

        let forumPosted = false;
        const personalForumService = global.personalForumService;

        if (personalForumService && category) {
            try {
                const userForum = await personalForumService.getUserPersonalForum(userId);

                if (userForum && userForum.setup_completed) {
                    const recipeWithFullData = {
                        ...savedRecipe,
                        structured_recipe: recipeContent,
                        video_file_id: videoMessageInfo?.fileId,
                        title: recipeData.title,
                        created_at: new Date().toISOString(),
                        video_platform: recipeData.videoPlatform
                    };

                    const forumMessageId = await personalForumService.postRecipeToPersonalForum(
                        recipeWithFullData,
                        userId,
                        category.key
                    );

                    if (forumMessageId) {
                        const forumTopicId = userForum.topics?.find(t => t.category_key === category.key)?.topic_id;

                        await query(
                            `UPDATE recipes 
                             SET personal_forum_id = $1, forum_message_id = $2, forum_topic_id = $3 
                             WHERE id = $4`,
                            [userForum.id, forumMessageId, forumTopicId, savedRecipe.id]
                        );

                        forumPosted = true;
                        console.log(`📝 Recipe posted to personal forum: ${category.key}`);

                        setTimeout(async () => {
                            try {
                                const forumLink = userForum.forum_chat_id ?
                                    `https://t.me/c/${Math.abs(userForum.forum_chat_id).toString().slice(4)}/${forumTopicId || '1'}` :
                                    'your personal forum';

                               /* await ctx.reply(`✅ **Recipe Also Posted to Your Personal Forum!** ✅

📂 **Category Topic:** ${category.icon} ${category.name_en}
👥 **Your Forum:** [View in ${category.name_en}](${forumLink})

🌿 *Your recipe is now beautifully organized and easy to find!* ✨

📱 *Browse all your recipes by category in your personal forum!*`,
                                    { parse_mode: 'Markdown' });*/
                            } catch (notificationError) {
                                console.log('Could not send forum notification:', notificationError.message);
                            }
                        }, 2000);
                    }
                } else {
                    setTimeout(async () => {
                        try {
                            await ctx.reply(`💡 **Want Better Organization?** 💡

Your recipe was saved successfully! For even better organization, set up your personal recipe forum:

🚀 **Send /start** to create your personal forum with:
• 📂 Automatic categorization by dish type
• 🎬 Original videos preserved with recipes  
• 🔍 Easy browsing by category topics
• 📱 Beautiful organized interface

*Transform your recipe collection today!* 🌿✨`,
                                { parse_mode: 'Markdown' });
                        } catch (reminderError) {
                            console.log('Could not send forum reminder:', reminderError.message);
                        }
                    }, 3000);
                }

            } catch (forumError) {
                console.error('Error posting to personal forum:', forumError);
            }
        }

        return {
            id: savedRecipe.id,
            categoryName: category ? category.name_en : 'Uncategorized',
            tags: tags,
            forumPosted: forumPosted
        };

    } catch (error) {
        console.error('Error saving recipe to database:', error);
        await ctx.reply(`⚠️ **Recipe Extracted but Save Failed** ⚠️

🍳 Your recipe is displayed above for immediate use!
💾 However, it couldn't be saved to your collection.

🔧 *This might be a temporary database issue.*
📱 *Try saving manually later with /my_recipes*

*Your cooking knowledge is still captured!* 🌿`,
            { parse_mode: 'Markdown' });

        return null;
    }
};


const extractCookingTime = (recipeText) => {
    const timePattern = /⏱️\s*\*\*COOKING TIME:\*\*\s*(.+?)(?=\n|$)/;
    const match = recipeText.match(timePattern);

    if (match) {
        const timeText = match[1].toLowerCase();
        const minuteMatch = timeText.match(/(\d+)\s*(?:min|minute)/);
        const hourMatch = timeText.match(/(\d+)\s*(?:hour|hr)/);

        let totalMinutes = 0;
        if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
        if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);

        return totalMinutes > 0 ? totalMinutes : null;
    }
    return null;
};

const extractServings = (recipeText) => {
    const servingsPattern = /🍽️\s*\*\*SERVINGS:\*\*\s*(.+?)(?=\n|$)/;
    const match = recipeText.match(servingsPattern);

    if (match) {
        const servingsText = match[1];
        const numberMatch = servingsText.match(/(\d+)/);
        return numberMatch ? parseInt(numberMatch[1]) : null;
    }
    return null;
};

const extractTags = (recipeText) => {
    const tags = new Set();
    const text = recipeText.toLowerCase();

    const ingredients = [
        'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp',
        'pasta', 'rice', 'noodles', 'bread',
        'cheese', 'eggs', 'milk', 'butter',
        'tomato', 'onion', 'garlic', 'potato',
        'chocolate', 'vanilla', 'cinnamon',
        'oil', 'butter', 'cream'
    ];

    const methods = [
        'baked', 'fried', 'grilled', 'steamed', 'boiled',
        'sautéed', 'roasted', 'braised', 'slow cook'
    ];

    const styles = [
        'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
        'spicy', 'sweet', 'savory', 'healthy', 'quick', 'easy'
    ];

    ingredients.forEach(ingredient => {
        if (text.includes(ingredient)) {
            tags.add(ingredient);
        }
    });
    methods.forEach(method => {
        if (text.includes(method)) {
            tags.add(method);
        }
    });

    styles.forEach(style => {
        if (text.includes(style)) {
            tags.add(style);
        }
    });

    const timeMinutes = extractCookingTime(recipeText);
    if (timeMinutes) {
        if (timeMinutes <= 15) tags.add('quick');
        if (timeMinutes <= 30) tags.add('30-min-meal');
        if (timeMinutes >= 120) tags.add('slow-cook');
    }

    return Array.from(tags).slice(0, 10); // limit 10 tags
};

module.exports = {
    parseRecipe,
    saveRecipeToDatabase
};