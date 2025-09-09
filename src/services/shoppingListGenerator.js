const { query } = require('../database/connection');

const INGREDIENT_CATEGORIES = {
    'produce': {
        name: '🥬 Produce',
        keywords: ['onion', 'garlic', 'tomato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'potato', 'bell pepper', 'cucumber', 'celery', 'mushrooms', 'lemon', 'lime', 'apple', 'banana', 'herbs', 'cilantro', 'parsley', 'basil', 'ginger', 'scallions', 'avocado']
    },
    'meat': {
        name: '🥩 Meat & Seafood',
        keywords: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'lamb', 'bacon', 'sausage', 'ground beef', 'ground turkey']
    },
    'dairy': {
        name: '🥛 Dairy & Eggs',
        keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'eggs', 'sour cream', 'cream cheese', 'mozzarella', 'cheddar', 'parmesan']
    },
    'pantry': {
        name: '🏠 Pantry & Dry Goods',
        keywords: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soy sauce', 'honey', 'spices', 'beans', 'lentils', 'quinoa', 'oats', 'nuts', 'almonds', 'walnuts']
    },
    'frozen': {
        name: '🧊 Frozen',
        keywords: ['frozen', 'ice cream', 'frozen vegetables', 'frozen fruit']
    },
    'bakery': {
        name: '🍞 Bakery',
        keywords: ['bread', 'bagels', 'rolls', 'tortillas', 'pita']
    },
    'beverages': {
        name: '🥤 Beverages',
        keywords: ['water', 'juice', 'coffee', 'tea', 'wine', 'beer', 'soda', 'sparkling water']
    },
    'condiments': {
        name: '🍯 Condiments & Sauces',
        keywords: ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'hot sauce', 'barbecue sauce', 'salad dressing']
    }
};

const UNIT_EQUIVALENTS = {
    // Volume
    'cup': { base: 'cup', factor: 1 },
    'cups': { base: 'cup', factor: 1 },
    'tablespoon': { base: 'tablespoon', factor: 1 },
    'tablespoons': { base: 'tablespoon', factor: 1 },
    'tbsp': { base: 'tablespoon', factor: 1 },
    'teaspoon': { base: 'teaspoon', factor: 1 },
    'teaspoons': { base: 'teaspoon', factor: 1 },
    'tsp': { base: 'teaspoon', factor: 1 },

    // Weight
    'pound': { base: 'pound', factor: 1 },
    'pounds': { base: 'pound', factor: 1 },
    'lb': { base: 'pound', factor: 1 },
    'lbs': { base: 'pound', factor: 1 },
    'ounce': { base: 'ounce', factor: 1 },
    'ounces': { base: 'ounce', factor: 1 },
    'oz': { base: 'ounce', factor: 1 },

    // Metric
    'gram': { base: 'gram', factor: 1 },
    'grams': { base: 'gram', factor: 1 },
    'g': { base: 'gram', factor: 1 },
    'kilogram': { base: 'kilogram', factor: 1 },
    'kilograms': { base: 'kilogram', factor: 1 },
    'kg': { base: 'kilogram', factor: 1 },
    'milliliter': { base: 'milliliter', factor: 1 },
    'milliliters': { base: 'milliliter', factor: 1 },
    'ml': { base: 'milliliter', factor: 1 },
    'liter': { base: 'liter', factor: 1 },
    'liters': { base: 'liter', factor: 1 },
    'l': { base: 'liter', factor: 1 }
};

const generateShoppingList = async (recipeIds, userId, listName = null) => {
    try {
        console.log(`🛒 Generating shopping list for ${recipeIds.length} recipes for user ${userId}`);

        // Get recipes
        const recipes = await getRecipesByIds(recipeIds, userId);
        if (recipes.length === 0) {
            return {
                success: false,
                error: 'No accessible recipes found'
            };
        }

        console.log(`📚 Found ${recipes.length} recipes: ${recipes.map(r => r.title).join(', ')}`);

        const consolidatedIngredients = await consolidateIngredientsFromRecipes(recipes);
        const categorizedIngredients = categorizeIngredients(consolidatedIngredients);
        const userPreferences = await getUserShoppingPreferences(userId);
        const filteredIngredients = applyDietaryRestrictions(categorizedIngredients, userPreferences);
        const finalListName = listName || generateAutoListName(recipes);

        const savedList = await saveShoppingList(userId, {
            name: finalListName,
            recipeIds: recipeIds,
            categorizedIngredients: filteredIngredients,
            recipeCount: recipes.length,
            totalItems: Object.values(filteredIngredients).flat().length
        });


        const formattedList = formatShoppingListForDisplay(filteredIngredients, recipes, finalListName);

        console.log(`✅ Shopping list generated: ${finalListName} (${Object.values(filteredIngredients).flat().length} items)`);

        return {
            success: true,
            shoppingList: savedList,
            formattedText: formattedList,
            categorizedIngredients: filteredIngredients,
            recipeCount: recipes.length,
            totalItems: Object.values(filteredIngredients).flat().length
        };

    } catch (error) {
        console.error('Shopping list generation error:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate shopping list'
        };
    }
};

const getRecipesByIds = async (recipeIds, userId) => {
    try {
        const placeholders = recipeIds.map((_, index) => `$${index + 2}`).join(',');
        const result = await query(
            `SELECT id, title, structured_recipe, servings 
             FROM recipes 
             WHERE id IN (${placeholders}) AND user_id = $1
             ORDER BY created_at DESC`,
            [userId, ...recipeIds]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting recipes by IDs:', error);
        throw error;
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
            line.includes('**INSTRUCTIONS:**') ||
            line.includes('📊 **NUTRITION ANALYSIS**')
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

const consolidateIngredientsFromRecipes = async (recipes) => {
    const allIngredients = [];
    for (const recipe of recipes) {
        const ingredients = extractIngredientsFromRecipe(recipe.structured_recipe);
        for (const ingredient of ingredients) {
            const parsed = parseIngredientForShopping(ingredient, recipe.title);
            if (parsed) {
                allIngredients.push(parsed);
            }
        }
    }
    const consolidated = consolidateSimilarIngredients(allIngredients);

    return consolidated;
};

const parseIngredientForShopping = (ingredientLine, recipeTitle) => {
    try {
        const cleaned = ingredientLine.replace(/\*\*/g, '').trim();
        const quantityPattern = /^([\d\/\.\s-]+(?:\s+\d+\/\d+)?)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)?(.*)$/;
        const match = cleaned.match(quantityPattern);

        if (match) {
            const [, quantityStr, unit, ingredientName] = match;
            const quantity = parseQuantity(quantityStr.trim());

            return {
                original: ingredientLine,
                quantity: quantity || 1,
                unit: unit ? unit.trim().toLowerCase() : null,
                ingredient: ingredientName.trim(),
                recipeTitle: recipeTitle,
                combinedText: cleaned
            };
        }

        return {
            original: ingredientLine,
            quantity: null,
            unit: null,
            ingredient: cleaned,
            recipeTitle: recipeTitle,
            combinedText: cleaned
        };

    } catch (error) {
        console.log(`Failed to parse ingredient: ${ingredientLine}`, error.message);
        return null;
    }
};

const parseQuantity = (quantityStr) => {
    if (!quantityStr) return null;

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
        const rangeMatch = quantityStr.match(/([\d\.]+)\s*-\s*([\d\.]+)/);
        if (rangeMatch) {
            return Math.max(parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2]));
        }
    }

    const numberMatch = quantityStr.match(/^([\d\.]+)/);
    if (numberMatch) {
        return parseFloat(numberMatch[1]);
    }

    return null;
};

const consolidateSimilarIngredients = (ingredients) => {
    const consolidated = {};

    for (const ingredient of ingredients) {
        const key = normalizeIngredientName(ingredient.ingredient);

        if (!consolidated[key]) {
            consolidated[key] = {
                ingredient: ingredient.ingredient,
                items: [],
                totalQuantity: 0,
                commonUnit: null,
                canConsolidate: false
            };
        }

        consolidated[key].items.push(ingredient);

        if (ingredient.quantity && ingredient.unit) {
            const normalizedUnit = normalizeUnit(ingredient.unit);
            if (!consolidated[key].commonUnit) {
                consolidated[key].commonUnit = normalizedUnit;
                consolidated[key].totalQuantity = ingredient.quantity;
                consolidated[key].canConsolidate = true;
            } else if (consolidated[key].commonUnit === normalizedUnit) {
                consolidated[key].totalQuantity += ingredient.quantity;
            } else {
                consolidated[key].canConsolidate = false;
            }
        }
    }

    const result = [];
    for (const [key, data] of Object.entries(consolidated)) {
        if (data.canConsolidate && data.totalQuantity > 0) {
            result.push({
                ingredient: data.ingredient,
                quantity: formatQuantityForShopping(data.totalQuantity),
                unit: data.commonUnit,
                recipes: [...new Set(data.items.map(item => item.recipeTitle))],
                combinedText: `${formatQuantityForShopping(data.totalQuantity)} ${data.commonUnit || ''} ${data.ingredient}`.trim(),
                isConsolidated: data.items.length > 1
            });
        } else {
            for (const item of data.items) {
                result.push({
                    ingredient: item.ingredient,
                    quantity: item.quantity ? formatQuantityForShopping(item.quantity) : null,
                    unit: item.unit,
                    recipes: [item.recipeTitle],
                    combinedText: item.combinedText,
                    isConsolidated: false
                });
            }
        }
    }
    return result;
};

const normalizeIngredientName = (ingredient) => {
    return ingredient.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[,()]/g, '')
        .trim();
};

const normalizeUnit = (unit) => {
    if (!unit) return null;
    const lowerUnit = unit.toLowerCase();
    return UNIT_EQUIVALENTS[lowerUnit]?.base || lowerUnit;
};

const formatQuantityForShopping = (quantity) => {
    if (!quantity) return '';

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
            return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
        }
    }

    return quantity.toFixed(2).replace(/\.?0+$/, '');
};

const categorizeIngredients = (ingredients) => {
    const categorized = {};

    for (const [key, category] of Object.entries(INGREDIENT_CATEGORIES)) {
        categorized[key] = [];
    }
    categorized['other'] = [];

    for (const ingredient of ingredients) {
        let assigned = false;
        const ingredientLower = ingredient.ingredient.toLowerCase();

        for (const [categoryKey, category] of Object.entries(INGREDIENT_CATEGORIES)) {
            if (category.keywords.some(keyword =>
                ingredientLower.includes(keyword) || keyword.includes(ingredientLower)
            )) {
                categorized[categoryKey].push(ingredient);
                assigned = true;
                break;
            }
        }

        if (!assigned) {
            categorized['other'].push(ingredient);
        }
    }

    const result = {};
    for (const [key, items] of Object.entries(categorized)) {
        if (items.length > 0) {
            result[key] = items;
        }
    }

    return result;
};

const getUserShoppingPreferences = async (userId) => {
    try {
        const result = await query(
            'SELECT * FROM user_shopping_preferences WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length > 0) {
            return result.rows[0];
        }

        return {
            dietary_restrictions: [],
            exclude_ingredients: [],
            preferred_brands: [],
            store_layout: 'default'
        };
    } catch (error) {
        console.log('Error getting user shopping preferences:', error.message);
        return {
            dietary_restrictions: [],
            exclude_ingredients: [],
            preferred_brands: [],
            store_layout: 'default'
        };
    }
};

const applyDietaryRestrictions = (categorizedIngredients, preferences) => {
    if (!preferences.dietary_restrictions || preferences.dietary_restrictions.length === 0) {
        return categorizedIngredients;
    }
    const filtered = {};

    for (const [category, ingredients] of Object.entries(categorizedIngredients)) {
        filtered[category] = ingredients.filter(ingredient => {
            const ingredientLower = ingredient.ingredient.toLowerCase();

            // Check against excluded ingredients
            if (preferences.exclude_ingredients &&
                preferences.exclude_ingredients.some(excluded =>
                    ingredientLower.includes(excluded.toLowerCase())
                )) {
                return false;
            }

            return true;
        });

        if (filtered[category].length === 0) {
            delete filtered[category];
        }
    }

    return filtered;
};

const generateAutoListName = (recipes) => {
    const now = new Date();
    const date = now.toLocaleDateString();

    if (recipes.length === 1) {
        return `${recipes[0].title} - ${date}`;
    } else if (recipes.length <= 3) {
        const titles = recipes.map(r => r.title).join(', ');
        return `${titles} - ${date}`;
    } else {
        return `${recipes.length} Recipes Shopping List - ${date}`;
    }
};

const saveShoppingList = async (userId, shoppingListData) => {
    try {
        const result = await query(
            `INSERT INTO shopping_lists (
                user_id, name, recipe_ids, categorized_ingredients, 
                recipe_count, total_items
            ) VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *`,
            [
                userId,
                shoppingListData.name,
                JSON.stringify(shoppingListData.recipeIds),
                JSON.stringify(shoppingListData.categorizedIngredients),
                shoppingListData.recipeCount,
                shoppingListData.totalItems
            ]
        );

        console.log(`💾 Shopping list saved: "${shoppingListData.name}" (ID: ${result.rows[0].id})`);
        return result.rows[0];
    } catch (error) {
        console.error('Error saving shopping list:', error);
        throw error;
    }
};

const formatShoppingListForDisplay = (categorizedIngredients, recipes, listName) => {
    let formatted = `🛒 **${listName}** 🛒\n\n`;

    formatted += `📚 **From ${recipes.length} Recipe${recipes.length > 1 ? 's' : ''}:**\n`;
    recipes.forEach((recipe, index) => {
        formatted += `${index + 1}. ${recipe.title}\n`;
    });
    formatted += '\n';

    const totalItems = Object.values(categorizedIngredients).flat().length;
    formatted += `📝 **Shopping List** (${totalItems} items):\n\n`;

    for (const [categoryKey, ingredients] of Object.entries(categorizedIngredients)) {
        const categoryName = INGREDIENT_CATEGORIES[categoryKey]?.name || '📦 Other';
        formatted += `${categoryName}:\n`;

        ingredients.forEach(ingredient => {
            const checkBox = '☐';
            let itemText = `${checkBox} ${ingredient.combinedText}`;

            if (ingredient.isConsolidated) {
                itemText += ` *(from ${ingredient.recipes.length} recipes)*`;
            }

            formatted += `  ${itemText}\n`;
        });

        formatted += '\n';
    }

    formatted += `💡 **Shopping Tips:**\n`;
    formatted += `• Check off items as you shop\n`;
    formatted += `• Keep this list handy while shopping\n`;
    formatted += `• Consolidated items save time and money\n\n`;

    formatted += `🌿 *Happy shopping and cooking!* ✨`;

    return formatted;
};

const getUserShoppingLists = async (userId, limit = 10) => {
    try {
        const result = await query(
            `SELECT * FROM shopping_lists 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting user shopping lists:', error);
        throw error;
    }
};

module.exports = {
    generateShoppingList,
    getUserShoppingLists,
    INGREDIENT_CATEGORIES
};