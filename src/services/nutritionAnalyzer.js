const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Comprehensive nutrition database with common cooking ingredients
const NUTRITION_DATABASE = {
    // Proteins
    'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, unit: '100g' },
    'chicken thigh': { calories: 209, protein: 26, carbs: 0, fat: 11, fiber: 0, sugar: 0, unit: '100g' },
    'ground beef': { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0, unit: '100g' },
    'salmon': { calories: 208, protein: 25, carbs: 0, fat: 12, fiber: 0, sugar: 0, unit: '100g' },
    'eggs': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, unit: '100g' },
    'tofu': { calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, sugar: 0.6, unit: '100g' },

    // Grains & Starches
    'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, unit: '100g' },
    'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.8, unit: '100g' },
    'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, unit: '100g' },
    'quinoa': { calories: 120, protein: 4.4, carbs: 22, fat: 1.9, fiber: 2.8, sugar: 0.9, unit: '100g' },
    'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, unit: '100g' },

    // Vegetables
    'onion': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, unit: '100g' },
    'garlic': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, sugar: 1, unit: '100g' },
    'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, unit: '100g' },
    'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, unit: '100g' },
    'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.5, unit: '100g' },
    'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, unit: '100g' },
    'bell pepper': { calories: 31, protein: 1, carbs: 7, fat: 0.3, fiber: 2.5, sugar: 4.2, unit: '100g' },

    // Dairy
    'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, unit: '100ml' },
    'cheese': { calories: 400, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, unit: '100g' },
    'butter': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1, unit: '100g' },
    'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.2, unit: '100g' },

    // Oils & Fats
    'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, unit: '100ml' },
    'coconut oil': { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, unit: '100ml' },
    'vegetable oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, unit: '100ml' },

    // Condiments & Seasonings
    'salt': { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, unit: '100g' },
    'black pepper': { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25, sugar: 0.6, unit: '100g' },
    'soy sauce': { calories: 8, protein: 1.3, carbs: 0.8, fat: 0, fiber: 0.1, sugar: 0.4, unit: '100ml' },
    'honey': { calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2, sugar: 82, unit: '100g' },

    // Nuts & Seeds
    'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4.4, unit: '100g' },
    'walnuts': { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, sugar: 2.6, unit: '100g' },

    // Fruits
    'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, unit: '100g' },
    'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, unit: '100g' },
    'lemon': { calories: 29, protein: 1.1, carbs: 9, fat: 0.3, fiber: 2.8, sugar: 1.5, unit: '100g' }
};

// Standard unit conversions for cooking
const UNIT_CONVERSIONS = {
    'cup': { 'flour': 120, 'sugar': 200, 'rice': 195, 'milk': 240, 'water': 240, 'oil': 240, 'default': 240 },
    'tablespoon': { 'oil': 15, 'butter': 14, 'honey': 21, 'soy sauce': 15, 'default': 15 },
    'teaspoon': { 'salt': 6, 'sugar': 4, 'oil': 5, 'default': 5 }
};

const analyzeRecipeNutrition = async (structuredRecipe, recipeTitle = 'Recipe') => {
    try {
        console.log(`🔬 On-demand nutrition analysis for: ${recipeTitle}`);

        const ingredients = extractIngredientsFromRecipe(structuredRecipe);
        console.log(`📋 Extracted ${ingredients.length} ingredients for analysis`);

        if (ingredients.length === 0) {
            return {
                success: false,
                error: 'No ingredients found for nutrition analysis'
            };
        }

        const nutritionBreakdown = await calculateIngredientNutrition(ingredients);
        const totalNutrition = calculateTotalNutrition(nutritionBreakdown);
        const servings = extractServingsFromRecipe(structuredRecipe);
        const perServingNutrition = calculatePerServingNutrition(totalNutrition, servings);
        const dietaryInfo = analyzeDietaryCompatibility(ingredients, nutritionBreakdown);

        const formattedNutrition = formatNutritionAnalysis({
            totalNutrition,
            perServingNutrition,
            servings,
            dietaryInfo,
            ingredientCount: ingredients.length
        });

        console.log(`✅ On-demand nutrition analysis completed for ${recipeTitle}`);

        return {
            success: true,
            nutritionText: formattedNutrition,
            totalNutrition,
            perServingNutrition,
            servings,
            dietaryInfo
        };

    } catch (error) {
        console.error('On-demand nutrition analysis error:', error);
        return {
            success: false,
            error: error.message || 'Nutrition analysis failed'
        };
    }
};

const extractIngredientsFromRecipe = (recipeText) => {
    const ingredients = [];
    const lines = recipeText.split('\n');
    let inIngredientsSection = false;

    for (const line of lines) {
        if (line.includes('**INGREDIENTS:**') || line.includes('📋 **INGREDIENTS:**')) {
            inIngredientsSection = true;
            continue;
        }

        if (inIngredientsSection && (
            line.includes('**COOKING STEPS:**') ||
            line.includes('👩‍🍳 **COOKING STEPS:**') ||
            line.includes('**INSTRUCTIONS:**')
        )) {
            break;
        }

        if (inIngredientsSection && line.trim().startsWith('-')) {
            const ingredient = line.substring(1).trim();
            if (ingredient.length > 0) {
                ingredients.push(ingredient);
            }
        }
    }

    return ingredients;
};

const calculateIngredientNutrition = async (ingredients) => {
    const nutritionBreakdown = [];

    for (const ingredient of ingredients) {
        try {
            const parsedIngredient = parseIngredientLine(ingredient);
            const nutrition = calculateSingleIngredientNutrition(parsedIngredient);

            if (nutrition) {
                nutritionBreakdown.push({
                    original: ingredient,
                    parsed: parsedIngredient,
                    nutrition: nutrition
                });
            }
        } catch (error) {
            console.log(`Failed to analyze ingredient: ${ingredient}`, error.message);
        }
    }

    return nutritionBreakdown;
};

const parseIngredientLine = (ingredientLine) => {
    const cleaned = ingredientLine.replace(/\*\*/g, '');
    const quantityPattern = /^([\d\/\.\s-]+(?:\s+\d+\/\d+)?)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)?(.*)$/;
    const match = cleaned.match(quantityPattern);

    if (match) {
        const [, quantityStr, unit, rest] = match;
        const quantity = parseQuantity(quantityStr.trim());
        const ingredientName = rest.trim();

        return {
            quantity: quantity || 1,
            unit: unit ? unit.trim().toLowerCase() : null,
            name: ingredientName,
            original: ingredientLine
        };
    }

    return {
        quantity: 1,
        unit: null,
        name: cleaned.trim(),
        original: ingredientLine
    };
};

const parseQuantity = (quantityStr) => {
    if (!quantityStr) return 1;

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

    return 1;
};

const calculateSingleIngredientNutrition = (parsedIngredient) => {
    const { quantity, unit, name } = parsedIngredient;

    const nutritionData = findNutritionData(name);
    if (!nutritionData) {
        console.log(`Nutrition data not found for: ${name}`);
        return null;
    }

    const gramsAmount = convertToGrams(quantity, unit, name);
    const nutritionPer100g = nutritionData;
    const scaleFactor = gramsAmount / 100;

    return {
        ingredient: name,
        amount: gramsAmount,
        unit: 'g',
        calories: Math.round(nutritionPer100g.calories * scaleFactor),
        protein: Math.round(nutritionPer100g.protein * scaleFactor * 10) / 10,
        carbs: Math.round(nutritionPer100g.carbs * scaleFactor * 10) / 10,
        fat: Math.round(nutritionPer100g.fat * scaleFactor * 10) / 10,
        fiber: Math.round(nutritionPer100g.fiber * scaleFactor * 10) / 10,
        sugar: Math.round(nutritionPer100g.sugar * scaleFactor * 10) / 10
    };
};

const findNutritionData = (ingredientName) => {
    const lowerName = ingredientName.toLowerCase();

    if (NUTRITION_DATABASE[lowerName]) {
        return NUTRITION_DATABASE[lowerName];
    }

    for (const [key, data] of Object.entries(NUTRITION_DATABASE)) {
        if (lowerName.includes(key) || key.includes(lowerName)) {
            return data;
        }
    }

    const substitutions = {
        'chicken': 'chicken breast',
        'beef': 'ground beef',
        'fish': 'salmon',
        'cheese': 'cheese',
        'oil': 'olive oil',
        'flour': 'flour',
        'sugar': 'sugar'
    };

    for (const [search, replacement] of Object.entries(substitutions)) {
        if (lowerName.includes(search) && NUTRITION_DATABASE[replacement]) {
            return NUTRITION_DATABASE[replacement];
        }
    }

    return null;
};

const convertToGrams = (quantity, unit, ingredientName) => {
    if (!unit) return quantity;

    const lowerUnit = unit.toLowerCase();
    const lowerIngredient = ingredientName.toLowerCase();

    if (lowerUnit.includes('g') || lowerUnit === 'gram' || lowerUnit === 'grams') {
        return quantity;
    }

    if (lowerUnit.includes('kg') || lowerUnit === 'kilogram' || lowerUnit === 'kilograms') {
        return quantity * 1000;
    }

    if (lowerUnit === 'cup' || lowerUnit === 'cups') {
        return quantity * (UNIT_CONVERSIONS.cup[lowerIngredient] || UNIT_CONVERSIONS.cup.default);
    }

    if (lowerUnit === 'tablespoon' || lowerUnit === 'tbsp' || lowerUnit === 'tablespoons') {
        return quantity * (UNIT_CONVERSIONS.tablespoon[lowerIngredient] || UNIT_CONVERSIONS.tablespoon.default);
    }

    if (lowerUnit === 'teaspoon' || lowerUnit === 'tsp' || lowerUnit === 'teaspoons') {
        return quantity * (UNIT_CONVERSIONS.teaspoon[lowerIngredient] || UNIT_CONVERSIONS.teaspoon.default);
    }

    if (lowerUnit === 'ml' || lowerUnit === 'milliliter' || lowerUnit === 'milliliters') {
        return quantity;
    }

    if (lowerUnit === 'l' || lowerUnit === 'liter' || lowerUnit === 'liters') {
        return quantity * 1000;
    }

    if (lowerUnit === 'oz' || lowerUnit === 'ounce' || lowerUnit === 'ounces') {
        return quantity * 28.35;
    }

    if (lowerUnit === 'lb' || lowerUnit === 'pound' || lowerUnit === 'pounds') {
        return quantity * 453.6;
    }

    console.log(`Unknown unit: ${unit} for ${ingredientName}, assuming grams`);
    return quantity;
};

const calculateTotalNutrition = (nutritionBreakdown) => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };

    for (const item of nutritionBreakdown) {
        if (item.nutrition) {
            totals.calories += item.nutrition.calories;
            totals.protein += item.nutrition.protein;
            totals.carbs += item.nutrition.carbs;
            totals.fat += item.nutrition.fat;
            totals.fiber += item.nutrition.fiber;
            totals.sugar += item.nutrition.sugar;
        }
    }

    Object.keys(totals).forEach(key => {
        totals[key] = Math.round(totals[key] * 10) / 10;
    });

    return totals;
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

    return 4; // default
};

const calculatePerServingNutrition = (totalNutrition, servings) => {
    const perServing = {};
    Object.keys(totalNutrition).forEach(key => {
        perServing[key] = Math.round((totalNutrition[key] / servings) * 10) / 10;
    });
    return perServing;
};

const analyzeDietaryCompatibility = (ingredients, nutritionBreakdown) => {
    const dietaryFlags = {
        vegetarian: true,
        vegan: true,
        glutenFree: true,
        dairyFree: true,
        lowCarb: true,
        highProtein: false,
        lowCalorie: true
    };

    const meatKeywords = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'meat', 'bacon', 'ham'];
    const dairyKeywords = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy'];
    const glutenKeywords = ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye'];

    for (const ingredient of ingredients) {
        const lowerIngredient = ingredient.toLowerCase();

        if (meatKeywords.some(keyword => lowerIngredient.includes(keyword))) {
            dietaryFlags.vegetarian = false;
            dietaryFlags.vegan = false;
        }

        if (dairyKeywords.some(keyword => lowerIngredient.includes(keyword))) {
            dietaryFlags.vegan = false;
            dietaryFlags.dairyFree = false;
        }

        if (glutenKeywords.some(keyword => lowerIngredient.includes(keyword))) {
            dietaryFlags.glutenFree = false;
        }
    }

    const totalNutrition = calculateTotalNutrition(nutritionBreakdown);
    const servings = 4;

    if (totalNutrition.carbs / servings > 30) {
        dietaryFlags.lowCarb = false;
    }

    if (totalNutrition.protein / servings > 20) {
        dietaryFlags.highProtein = true;
    }

    if (totalNutrition.calories / servings > 400) {
        dietaryFlags.lowCalorie = false;
    }

    return dietaryFlags;
};

const formatNutritionAnalysis = ({ totalNutrition, perServingNutrition, servings, dietaryInfo, ingredientCount }) => {
    const { calories, protein, carbs, fat, fiber, sugar } = perServingNutrition;

    const totalMacros = protein * 4 + carbs * 4 + fat * 9;
    const proteinPercent = Math.round((protein * 4 / totalMacros) * 100) || 0;
    const carbsPercent = Math.round((carbs * 4 / totalMacros) * 100) || 0;
    const fatPercent = Math.round((fat * 9 / totalMacros) * 100) || 0;

    const dietaryTags = [];
    if (dietaryInfo.vegetarian) dietaryTags.push('🌱 Vegetarian');
    if (dietaryInfo.vegan) dietaryTags.push('🌿 Vegan');
    if (dietaryInfo.glutenFree) dietaryTags.push('🌾 Gluten-Free');
    if (dietaryInfo.dairyFree) dietaryTags.push('🥛 Dairy-Free');
    if (dietaryInfo.lowCarb) dietaryTags.push('🥗 Low-Carb');
    if (dietaryInfo.highProtein) dietaryTags.push('💪 High-Protein');
    if (dietaryInfo.lowCalorie) dietaryTags.push('📉 Low-Calorie');

    let nutritionText = `\n📊 **NUTRITION ANALYSIS** 📊\n\n`;

    nutritionText += `🍽️ **Per Serving** (${servings} servings total):\n`;
    nutritionText += `• **${calories}** calories\n`;
    nutritionText += `• **${protein}g** protein (${proteinPercent}%)\n`;
    nutritionText += `• **${carbs}g** carbs (${carbsPercent}%)\n`;
    nutritionText += `• **${fat}g** fat (${fatPercent}%)\n`;
    if (fiber > 0) nutritionText += `• **${fiber}g** fiber\n`;
    if (sugar > 0) nutritionText += `• **${sugar}g** sugar\n`;

    nutritionText += `\n📈 **Total Recipe**:\n`;
    nutritionText += `• **${totalNutrition.calories}** total calories\n`;
    nutritionText += `• **${totalNutrition.protein}g** total protein\n`;
    nutritionText += `• **${totalNutrition.carbs}g** total carbs\n`;
    nutritionText += `• **${totalNutrition.fat}g** total fat\n`;

    if (dietaryTags.length > 0) {
        nutritionText += `\n🏷️ **Dietary Info**:\n`;
        nutritionText += dietaryTags.map(tag => `• ${tag}`).join('\n');
    }

    nutritionText += `\n💡 **Health Insights**:\n`;
    if (calories < 300) {
        nutritionText += `• Light meal - Great for weight management\n`;
    } else if (calories > 600) {
        nutritionText += `• Hearty meal - Perfect for active days\n`;
    }

    if (protein > 25) {
        nutritionText += `• High protein - Excellent for muscle building\n`;
    }

    if (fiber > 5) {
        nutritionText += `• High fiber - Supports digestive health\n`;
    }

    if (carbs < 20) {
        nutritionText += `• Low carb - Keto-friendly option\n`;
    }

    nutritionText += `\n🔬 *Nutrition calculated from ${ingredientCount} analyzed ingredients*\n`;
    nutritionText += `⚖️ *Values are estimates based on standard ingredient data*`;

    return nutritionText;
};

module.exports = {
    analyzeRecipeNutrition,
    NUTRITION_DATABASE
};