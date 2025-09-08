const { convertUnits, normalizeUnit, getUnitType } = require('./unitConverter');

const scaleRecipe = async (recipe, scaleFactor, ctx) => {
    try {
        console.log(`🔢 Scaling recipe "${recipe.title}" by factor ${scaleFactor}`);

        const recipeData = parseRecipeStructure(recipe.structured_recipe);

        const scaledIngredients = scaleIngredients(recipeData.ingredients, scaleFactor);

        const scaledTimes = scaleCookingTimes(recipeData, scaleFactor);

        const equipmentRecommendations = generateEquipmentRecommendations(scaleFactor, scaledIngredients);

        const originalServings = recipe.servings || extractServingsFromRecipe(recipe.structured_recipe) || 4;
        const newServings = Math.round(originalServings * scaleFactor);

        const scaledRecipeText = buildScaledRecipe({
            title: recipe.title,
            scaleFactor,
            originalServings,
            newServings,
            scaledIngredients,
            instructions: recipeData.instructions,
            scaledTimes,
            equipmentRecommendations,
            notes: recipeData.notes
        });

        return {
            success: true,
            originalServings,
            newServings,
            scaleFactor,
            scaledRecipeText,
            equipmentRecommendations,
            scalingNotes: generateScalingNotes(scaleFactor, originalServings, newServings)
        };

    } catch (error) {
        console.error('Recipe scaling error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const parseRecipeStructure = (recipeText) => {
    const sections = {
        ingredients: [],
        instructions: [],
        notes: '',
        cookingTime: null,
        prepTime: null
    };

    const lines = recipeText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let currentSection = '';

    for (const line of lines) {
        if (line.includes('**INGREDIENTS:**') || line.includes('📋 **INGREDIENTS:**')) {
            currentSection = 'ingredients';
            continue;
        } else if (line.includes('**COOKING STEPS:**') || line.includes('👩‍🍳 **COOKING STEPS:**')) {
            currentSection = 'instructions';
            continue;
        } else if (line.includes('**COOKING TIME:**') || line.includes('⏱️ **COOKING TIME:**')) {
            currentSection = 'cookingTime';
            continue;
        } else if (line.includes('**NOTES:**') || line.includes('📝 **NOTES:**')) {
            currentSection = 'notes';
            continue;
        }

        if (currentSection === 'ingredients' && line.startsWith('-')) {
            sections.ingredients.push(line.substring(1).trim());
        } else if (currentSection === 'instructions' && /^\d+\./.test(line)) {
            sections.instructions.push(line);
        } else if (currentSection === 'cookingTime') {
            sections.cookingTime = line;
        } else if (currentSection === 'notes') {
            sections.notes += line + ' ';
        }
    }

    return sections;
};

const scaleIngredients = (ingredients, scaleFactor) => {
    return ingredients.map(ingredient => {
        return scaleIndividualIngredient(ingredient, scaleFactor);
    });
};

const scaleIndividualIngredient = (ingredient, scaleFactor) => {
    try {
        const quantityPattern = /^(\*\*)?([\d\/\.\s-]+(?:\s+\d+\/\d+)?)\s*(\*\*)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)?(.*)$/;
        const match = ingredient.match(quantityPattern);

        if (!match) {
            return `**to taste** ${ingredient.replace(/^\*\*to taste\*\*\s*/, '')} *(adjust to preference)*`;
        }

        const [, startBold, quantityStr, endBold, unit, rest] = match;
        const hasBold = startBold === '**' && endBold === '**';
        const originalQuantity = parseQuantity(quantityStr.trim());

        if (originalQuantity === null) {
            return ingredient;
        }

        let scaledQuantity = originalQuantity * scaleFactor;

        if (scaledQuantity < 0.125) {
            scaledQuantity = 0.125;
        } else if (scaledQuantity < 1) {
            scaledQuantity = Math.round(scaledQuantity * 8) / 8; // 1/8
        } else if (scaledQuantity < 10) {
            scaledQuantity = Math.round(scaledQuantity * 4) / 4; // 1/4
        } else {
            scaledQuantity = Math.round(scaledQuantity * 2) / 2; // 1/2
        }

        let finalQuantity = scaledQuantity;
        let finalUnit = unit || '';

        if (unit) {
            const conversion = convertUnits(scaledQuantity, unit);
            if (conversion.converted) {
                finalQuantity = conversion.quantity;
                finalUnit = conversion.unit;
            }
        }
        const formattedQuantity = formatQuantity(finalQuantity);
        const boldMarkers = hasBold ? '**' : '';

        return `${boldMarkers}${formattedQuantity}${boldMarkers} ${finalUnit}${rest}`;

    } catch (error) {
        console.error('Error scaling ingredient:', ingredient, error);
        return ingredient;
    }
};

const parseQuantity = (quantityStr) => {
    if (quantityStr.includes('/')) {
        const fractionMatch = quantityStr.match(/(\d+)?\s*(\d+)\/(\d+)/);
        if (fractionMatch) {
            const [, whole, numerator, denominator] = fractionMatch;
            const wholeNum = whole ? parseInt(whole) : 0;
            const fractionValue = parseInt(numerator) / parseInt(denominator);
            return wholeNum + fractionValue;
        }
    }

    if (quantityStr.includes('-')) {
        const rangeMatch = quantityStr.match(/^([\d\.]+)/);
        if (rangeMatch) {
            return parseFloat(rangeMatch[1]);
        }
    }

    const numberMatch = quantityStr.match(/^([\d\.]+)/);
    if (numberMatch) {
        return parseFloat(numberMatch[1]);
    }
    return null;
};

const formatQuantity = (quantity) => {
    const commonFractions = {
        0.125: '1/8',
        0.25: '1/4',
        0.33: '1/3',
        0.375: '3/8',
        0.5: '1/2',
        0.625: '5/8',
        0.67: '2/3',
        0.75: '3/4',
        0.875: '7/8'
    };

    const tolerance = 0.02;
    for (const [decimal, fraction] of Object.entries(commonFractions)) {
        if (Math.abs(quantity - decimal) < tolerance) {
            return fraction;
        }
    }

    if (quantity >= 1) {
        const whole = Math.floor(quantity);
        const fractional = quantity - whole;

        for (const [decimal, fraction] of Object.entries(commonFractions)) {
            if (Math.abs(fractional - decimal) < tolerance) {
                return `${whole} ${fraction}`;
            }
        }

        if (fractional < 0.1) {
            return whole.toString();
        } else {
            return quantity.toFixed(1);
        }
    }
    return quantity.toFixed(2).replace(/\.?0+$/, '');
};

const scaleCookingTimes = (recipeData, scaleFactor) => {
    const timeScaling = {
        prep: scaleFactor,
        cook: calculateCookTimeScaling(scaleFactor),
        rest: 1.0
    };

    let scaledTimes = {};

    if (recipeData.cookingTime) {
        const timeText = recipeData.cookingTime;
        const prepMatch = timeText.match(/prep[:\s]*(\d+)/i);
        const cookMatch = timeText.match(/cook[:\s]*(\d+)/i);
        const totalMatch = timeText.match(/(\d+)\s*(?:min|minute)/i);

        if (prepMatch) {
            scaledTimes.prep = Math.round(parseInt(prepMatch[1]) * timeScaling.prep);
        }
        if (cookMatch) {
            scaledTimes.cook = Math.round(parseInt(cookMatch[1]) * timeScaling.cook);
        }
        if (totalMatch && !prepMatch && !cookMatch) {
            scaledTimes.total = Math.round(parseInt(totalMatch[1]) * timeScaling.cook);
        }
    }

    return scaledTimes;
};

const calculateCookTimeScaling = (scaleFactor) => {
    if (scaleFactor <= 0.5) return 0.8;
    if (scaleFactor <= 1.0) return 1.0;
    if (scaleFactor <= 2.0) return 1.2;
    if (scaleFactor <= 4.0) return 1.4;
    return 1.6;
};

const generateEquipmentRecommendations = (scaleFactor, ingredients) => {
    const recommendations = [];

    if (scaleFactor >= 2) {
        recommendations.push('🍳 **Larger cooking pan/pot required** - Scale up by 1-2 sizes');
    }
    if (scaleFactor >= 4) {
        recommendations.push('🥘 **Consider cooking in batches** - Very large quantities may not fit standard equipment');
        recommendations.push('🔥 **Monitor heat levels** - Larger quantities may need lower heat and longer cooking');
    }

    if (hasLiquidIngredients(ingredients)) {
        if (scaleFactor >= 2) {
            recommendations.push('🥛 **Larger mixing bowl needed** - Use biggest bowl available');
        }
        if (scaleFactor >= 4) {
            recommendations.push('⚖️ **Consider using kitchen scale** - More accurate for large quantities');
        }
    }

    if (scaleFactor >= 3) {
        recommendations.push('📦 **Plan extra storage containers** - Larger batch = more leftovers');
    }

    return recommendations;
};

const hasLiquidIngredients = (ingredients) => {
    const liquidKeywords = ['cup', 'ml', 'liter', 'fluid', 'milk', 'water', 'oil', 'juice', 'stock', 'broth'];
    return ingredients.some(ingredient =>
        liquidKeywords.some(keyword => ingredient.toLowerCase().includes(keyword))
    );
};

const extractServingsFromRecipe = (recipeText) => {
    const servingsMatch = recipeText.match(/🍽️\s*\*\*SERVINGS:\*\*\s*(\d+)/i);
    if (servingsMatch) {
        return parseInt(servingsMatch[1]);
    }

    const servesMatch = recipeText.match(/serves?\s*(\d+)/i);
    if (servesMatch) {
        return parseInt(servesMatch[1]);
    }

    return null;
};

const buildScaledRecipe = (data) => {
    const { title, scaleFactor, originalServings, newServings, scaledIngredients, instructions, scaledTimes, equipmentRecommendations } = data;

    let scaledText = `⚖️ **SCALED RECIPE** ⚖️\n\n`;
    scaledText += `🍳 **${title}**\n`;
    scaledText += `📊 **Scaled ${scaleFactor}x** (${originalServings} → ${newServings} servings)\n\n`;
    scaledText += `📋 **SCALED INGREDIENTS:**\n`;
    scaledIngredients.forEach(ingredient => {
        scaledText += `- ${ingredient}\n`;
    });
    scaledText += `\n`;

    if (instructions.length > 0) {
        scaledText += `👩‍🍳 **COOKING STEPS:**\n`;
        instructions.forEach(instruction => {
            scaledText += `${instruction}\n`;
        });
        scaledText += `\n`;
    }

    if (Object.keys(scaledTimes).length > 0) {
        scaledText += `⏱️ **ADJUSTED TIMING:**\n`;
        if (scaledTimes.prep) scaledText += `• **Prep time:** ~${scaledTimes.prep} minutes\n`;
        if (scaledTimes.cook) scaledText += `• **Cook time:** ~${scaledTimes.cook} minutes\n`;
        if (scaledTimes.total) scaledText += `• **Total time:** ~${scaledTimes.total} minutes\n`;
        scaledText += `\n`;
    }

    if (equipmentRecommendations.length > 0) {
        scaledText += `🍳 **EQUIPMENT NOTES:**\n`;
        equipmentRecommendations.forEach(rec => {
            scaledText += `• ${rec}\n`;
        });
        scaledText += `\n`;
    }

    scaledText += `🍽️ **SERVINGS:** ${newServings}\n\n`;
    scaledText += `📝 **SCALING NOTES:**\n`;
    scaledText += `• Original recipe served ${originalServings}, scaled by ${scaleFactor}x\n`;
    scaledText += `• Taste and adjust seasonings as needed\n`;
    scaledText += `• Cook times are estimates - monitor food closely\n`;
    if (scaleFactor >= 2) {
        scaledText += `• Consider equipment limitations for larger batches\n`;
    }

    scaledText += `\n🌿 *Smart scaling by GreenGrimoire!* ✨`;

    return scaledText;
};

const generateScalingNotes = (scaleFactor, originalServings, newServings) => {
    const notes = [];

    if (scaleFactor < 1) {
        notes.push(`Scaled down from ${originalServings} to ${newServings} servings`);
        notes.push('Cooking times may be reduced slightly');
        notes.push('Use smaller cookware if available');
    } else if (scaleFactor > 1) {
        notes.push(`Scaled up from ${originalServings} to ${newServings} servings`);
        if (scaleFactor >= 2) {
            notes.push('May require larger cookware');
            notes.push('Consider cooking in batches if equipment is too small');
        }
        if (scaleFactor >= 4) {
            notes.push('Large batch - monitor cooking closely');
            notes.push('Plan for extra storage containers');
        }
    }

    notes.push('Taste and adjust seasonings after scaling');

    return notes;
};

module.exports = {
    scaleRecipe,
    parseQuantity,
    formatQuantity,
    scaleIndividualIngredient
};