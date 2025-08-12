const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const parseRecipe = async (textSources, ctx, videoInfo, silent = false) => {
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

        await ctx.reply(`🎉 **RECIPE EXTRACTED!** 🎉

${recipeContent}

🌱 *Your recipe is ready for cooking adventures!*
✨ *May your kitchen be blessed with delicious magic!*`,
            { parse_mode: 'Markdown' });

        return {
            rawText: combinedText,
            structuredRecipe: recipeContent,
            videoTitle: videoInfo.title,
            extractedFrom: Object.keys(textSources).filter(key => textSources[key])
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

module.exports = {
    parseRecipe
};