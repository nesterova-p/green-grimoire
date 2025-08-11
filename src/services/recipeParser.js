const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const parseRecipe = async (textSources, ctx, videoInfo) => {
    try {
        const combinedText = combineTextSources(textSources);

        if (!combinedText || combinedText.length < 20) {
            ctx.reply(`📝✨ *Moss searches for recipe patterns...* ✨📝

🌿 *The mystical texts are too brief for recipe extraction...*
🔮 *No clear cooking instructions detected*

🧙‍♀️ *This video might be:*
- Non-recipe content (entertainment, music, etc.)
- Very short cooking clip
- Recipe in visual form only

*The captured content is still preserved in the grimoire!* ✨🌱`,
                { parse_mode: 'Markdown' });
            return null;
        }

        ctx.reply(`🍳✨ *Moss begins the recipe parsing ritual!* ✨🍳

🔮 *Analyzing ${combinedText.length} characters of culinary wisdom...*
📝 *Extracting ingredients and sacred cooking steps...*
🧙‍♀️ *Organizing ancient kitchen knowledge...*

*Recipe magic is flowing...* 🌿📜`,
            { parse_mode: 'Markdown' });

        const recipeAnalysis = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a master chef and recipe organizer. Extract and format recipes from text.

TASK: Parse the provided text and extract recipe information.

OUTPUT FORMAT (use this exact structure):
**🍳 RECIPE TITLE:**
[Extract or create descriptive title]

**📋 INGREDIENTS:**
- [ingredient 1 with quantity]
- [ingredient 2 with quantity]
- [etc.]

**👩‍🍳 COOKING STEPS:**
1. [Step 1]
2. [Step 2]
3. [etc.]

**⏱️ COOKING TIME:**
[Extract timing if mentioned, or estimate based on cooking method]

**🍽️ SERVINGS:**
[Extract serving info if mentioned, OR estimate based on ingredient quantities]

**📝 NOTES:**
[Any additional tips or notes]

INTELLIGENT ESTIMATION RULES:
- SERVINGS: If not mentioned, estimate based on ingredient amounts:
  * 1 chicken breast = 1-2 servings
  * 4-5 chicken thighs = 3-4 servings  
  * 1 cup rice/pasta = 2-3 servings
  * Large soup recipe = 4-6 servings
  * Small snack recipe = 1-2 servings
  
- COOKING TIME: If not mentioned, estimate based on method:
  * Soup/stew = 20-45 minutes
  * Stir-fry = 10-15 minutes
  * Baking = 25-60 minutes
  * Quick assembly = 5-10 minutes

- MISSING QUANTITIES: If ingredients lack amounts, suggest reasonable quantities:
  * "garlic" → "2-3 cloves garlic"
  * "onion" → "1 medium onion"
  * "salt" → "salt to taste"

RULES:
- If no clear recipe found, respond: "NO_RECIPE_DETECTED"
- ALWAYS provide serving estimates, even if not mentioned
- ALWAYS provide time estimates, even if not mentioned  
- Add "(estimated)" when you're estimating missing info
- Keep original cooking terms and techniques
- Preserve any cultural/regional cooking methods
- If text is in non-English, keep original language but add structure
- Be helpful and complete the recipe information`
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
            ctx.reply(`🔍✨ *Moss has thoroughly examined the mystical texts...* ✨🔍

🌿 *No structured recipe patterns detected in:*
- Transcribed speech
- Video description  
- Visual text overlays

🧙‍♀️ *This content appears to be:*
- Entertainment or lifestyle content
- Recipe inspiration without specific instructions
- Visual-only cooking demonstration

*All captured text is preserved for reference!* ✨🌱`,
                { parse_mode: 'Markdown' });
            return null;
        }

        ctx.reply(`📜🎉 *RECIPE SUCCESSFULLY EXTRACTED!* 🎉📜

${recipeContent}

🌱 *Moss has organized the culinary wisdom into sacred scrolls!*
🧙‍♀️ *The ancient recipe is now preserved in structured form!*
🍳 *Ready for cooking adventures!*

*May your kitchen be blessed with delicious magic!* ✨🌿`,
            { parse_mode: 'Markdown' });

        return {
            rawText: combinedText,
            structuredRecipe: recipeContent,
            videoTitle: videoInfo.title,
            extractedFrom: Object.keys(textSources)
        };

    } catch (error) {
        console.error('Recipe parsing error:', error);

        ctx.reply(`🐛🍳 *The recipe parsing ritual encountered resistance!* 🍳🐛

🌿 *Error during culinary analysis:*
${error.message || 'The recipe spirits are not cooperating!'}

🧙‍♀️ *Possible causes:*
- OpenAI API issues
- Text too complex for parsing  
- Network magical interference
- Recipe magic temporarily unavailable

*The raw transcription is still safely captured!* ✨🌱`);

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