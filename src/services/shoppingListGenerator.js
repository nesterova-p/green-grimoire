const { query } = require('../database/connection');

const INGREDIENT_CATEGORIES = {
    'produce': {
        name: '🥬 Produce',
        keywords: [
            // English
            'onion', 'garlic', 'tomato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'potato',
            'bell pepper', 'cucumber', 'celery', 'mushrooms', 'lemon', 'lime', 'apple', 'banana',
            'herbs', 'cilantro', 'parsley', 'basil', 'ginger', 'scallions', 'avocado', 'cabbage',
            'zucchini', 'eggplant', 'cauliflower', 'kale', 'arugula', 'fennel', 'leek', 'radish',

            // Ukrainian
            'цибуля', 'часник', 'помідор', 'морква', 'броколі', 'шпинат', 'салат', 'картопля',
            'перець', 'огірок', 'селера', 'гриби', 'лимон', 'лайм', 'яблуко', 'банан',
            'зелень', 'кінза', 'петрушка', 'базилік', 'імбир', 'зелена цибуля', 'авокадо', 'капуста',
            'кабачок', 'баклажан', 'цвітна капуста', 'кейл', 'руккола', 'фенхель', 'порей', 'редиска',
            'буряк', 'ріпа', 'редька', 'пастернак', 'топінамбур', 'кріп', 'кропива', 'щавель',

            // Polish
            'cebula', 'czosnek', 'pomidor', 'marchew', 'brokuły', 'szpinak', 'sałata', 'ziemniak',
            'papryka', 'ogórek', 'seler', 'grzyby', 'cytryna', 'limonka', 'jabłko', 'banan',
            'zioła', 'kolendra', 'pietruszka', 'bazylia', 'imbir', 'szczypiorek', 'awokado', 'kapusta',

            // Russian
            'лук', 'чеснок', 'томат', 'морковь', 'брокколи', 'шпинат', 'салат', 'картофель',
            'перец', 'огурец', 'сельдерей', 'грибы', 'лимон', 'лайм', 'яблоко', 'банан',
            'зелень', 'кинза', 'петрушка', 'базилик', 'имбирь', 'зеленый лук', 'авокадо', 'капуста'
        ]
    },
    'meat': {
        name: '🥩 Meat & Seafood',
        keywords: [
            // English
            'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'lamb',
            'bacon', 'sausage', 'ground beef', 'ground turkey', 'cod', 'tilapia', 'crab', 'lobster',
            'duck', 'goose', 'venison', 'rabbit', 'ham', 'prosciutto', 'chorizo',

            // Ukrainian
            'курка', 'яловичина', 'свинина', 'риба', 'лосось', 'тунець', 'креветки', 'індичка', 'баранина',
            'бекон', 'ковбаса', 'фарш яловичий', 'фарш індичий', 'тріска', 'тилапія', 'краб', 'омар',
            'качка', 'гусь', 'оленина', 'кролик', 'шинка', 'прошутто', 'чорізо', 'курятина',
            'м\'ясо', 'телятина', 'печінка', 'серце', 'нирки', 'мідії', 'устриці', 'кальмар',
            'осьминог', 'окунь', 'карп', 'щука', 'судак', 'форель', 'скумбрія', 'сельдь',

            // Polish
            'kurczak', 'wołowina', 'wieprzowina', 'ryba', 'łosoś', 'tuńczyk', 'krewetki', 'indyk', 'baranina',
            'bekon', 'kiełbasa', 'mielona wołowina', 'mielony indyk', 'dorsz', 'tilapia', 'krab', 'homar',

            // Russian
            'курица', 'говядина', 'свинина', 'рыба', 'лосось', 'тунец', 'креветки', 'индейка', 'баранина',
            'бекон', 'колбаса', 'фарш говяжий', 'фарш индюшиный', 'треска', 'тилапия', 'краб', 'омар'
        ]
    },
    'dairy': {
        name: '🥛 Dairy & Eggs',
        keywords: [
            // English
            'milk', 'cheese', 'butter', 'cream', 'yogurt', 'eggs', 'sour cream', 'cream cheese',
            'mozzarella', 'cheddar', 'parmesan', 'cottage cheese', 'ricotta', 'feta', 'goat cheese',
            'heavy cream', 'half and half', 'buttermilk', 'kefir', 'crème fraîche',

            // Ukrainian
            'молоко', 'сир', 'масло', 'вершки', 'йогурт', 'яйця', 'сметана', 'вершковий сир',
            'моцарела', 'чеддер', 'пармезан', 'сир кисломолочний', 'рікота', 'фета', 'козячий сир',
            'жирні вершки', 'кефір', 'крем фреш', 'ряжанка', 'простокваша', 'творог', 'бринза',
            'маскарпоне', 'горгонзола', 'камамбер', 'бри', 'перепелині яйця', 'качині яйця',

            // Polish
            'mleko', 'ser', 'masło', 'śmietana', 'jogurt', 'jajka', 'kwaśna śmietana', 'serek śmietankowy',
            'mozzarella', 'cheddar', 'parmezan', 'twaróg', 'ricotta', 'feta', 'kozi ser',

            // Russian
            'молоко', 'сыр', 'масло', 'сливки', 'йогурт', 'яйца', 'сметана', 'сливочный сыр',
            'моцарелла', 'чеддер', 'пармезан', 'творог', 'рикотта', 'фета', 'козий сыр'
        ]
    },
    'pantry': {
        name: '🏠 Pantry & Dry Goods',
        keywords: [
            // English
            'rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soy sauce',
            'honey', 'spices', 'beans', 'lentils', 'quinoa', 'oats', 'nuts', 'almonds', 'walnuts',
            'olive oil', 'vegetable oil', 'coconut oil', 'baking powder', 'baking soda', 'vanilla',
            'cinnamon', 'paprika', 'oregano', 'thyme', 'rosemary', 'bay leaves', 'cumin', 'turmeric',

            // Ukrainian
            'рис', 'макарони', 'борошно', 'цукор', 'сіль', 'перець', 'олія', 'оцет', 'соєвий соус',
            'мед', 'спеції', 'квасоля', 'сочевиця', 'кіноа', 'вівсянка', 'горіхи', 'мигдаль', 'волоські горіхи',
            'оливкова олія', 'рослинна олія', 'кокосова олія', 'розпушувач', 'сода', 'ваніль',
            'кориця', 'паприка', 'орегано', 'чебрець', 'розмарин', 'лавровий лист', 'кумін', 'куркума',
            'гречка', 'пшоно', 'ячмінь', 'перлова крупа', 'манка', 'кукурудзяна крупа', 'булгур',
            'гірчиця', 'кетчуп', 'майонез', 'томатна паста', 'томатний соус', 'аджика', 'хрін',
            'лавровий лист', 'гвоздика', 'мускатний горіх', 'кардамон', 'бадьян', 'фенхель',

            // Polish
            'ryż', 'makaron', 'mąka', 'cukier', 'sól', 'pieprz', 'olej', 'ocet', 'sos sojowy',
            'miód', 'przyprawy', 'fasola', 'soczewica', 'quinoa', 'płatki owsiane', 'orzechy', 'migdały', 'orzechy włoskie',

            // Russian
            'рис', 'макароны', 'мука', 'сахар', 'соль', 'перец', 'масло', 'уксус', 'соевый соус',
            'мёд', 'специи', 'фасоль', 'чечевица', 'киноа', 'овсянка', 'орехи', 'миндаль', 'грецкие орехи'
        ]
    },
    'frozen': {
        name: '🧊 Frozen',
        keywords: [
            // English
            'frozen', 'ice cream', 'frozen vegetables', 'frozen fruit', 'frozen fish', 'frozen chicken',
            'ice', 'sorbet', 'frozen berries', 'frozen peas', 'frozen corn', 'frozen spinach',

            // Ukrainian
            'заморожений', 'морозиво', 'заморожені овочі', 'заморожені фрукти', 'заморожена риба', 'заморожена курка',
            'лід', 'сорбет', 'заморожені ягоди', 'заморожений горошок', 'заморожена кукурудза', 'заморожений шпинат',
            'заморожений', 'льодяники', 'фруктовий лід', 'заморожена суміш', 'заморожені креветки',

            // Polish
            'mrożony', 'lody', 'mrożone warzywa', 'mrożone owoce', 'mrożona ryba', 'mrożony kurczak',
            'lód', 'sorbet', 'mrożone jagody', 'mrożony groszek', 'mrożona kukurydza', 'mrożony szpinak',

            // Russian
            'замороженный', 'мороженое', 'замороженные овощи', 'замороженные фрукты', 'замороженная рыба', 'замороженная курица',
            'лёд', 'сорбет', 'замороженные ягоды', 'замороженный горошек', 'замороженная кукуруза', 'замороженный шпинат'
        ]
    },
    'bakery': {
        name: '🍞 Bakery',
        keywords: [
            // English
            'bread', 'bagels', 'rolls', 'tortillas', 'pita', 'baguette', 'croissant', 'muffins',
            'donuts', 'cookies', 'cake', 'pastry', 'crackers', 'pretzels',

            // Ukrainian
            'хліб', 'бейгли', 'булочки', 'тортілья', 'піта', 'багет', 'круасан', 'маффіни',
            'пончики', 'печиво', 'торт', 'випічка', 'крекери', 'крендель', 'лаваш', 'батон',
            'хлібець', 'сухарі', 'бісквіт', 'кекс', 'рогалик', 'слойка', 'ешклер', 'тарталетка',

            // Polish
            'chleb', 'bagietki', 'bułki', 'tortille', 'pita', 'bagietka', 'croissant', 'muffiny',
            'pączki', 'ciastka', 'ciasto', 'ciastko', 'krakersy', 'precle',

            // Russian
            'хлеб', 'бейглы', 'булочки', 'тортильи', 'пита', 'багет', 'круассан', 'маффины',
            'пончики', 'печенье', 'торт', 'выпечка', 'крекеры', 'крендели'
        ]
    },
    'beverages': {
        name: '🥤 Beverages',
        keywords: [
            // English
            'water', 'juice', 'coffee', 'tea', 'wine', 'beer', 'soda', 'sparkling water',
            'milk', 'smoothie', 'energy drink', 'sports drink', 'coconut water', 'kombucha',

            // Ukrainian
            'вода', 'сік', 'кава', 'чай', 'вино', 'пиво', 'газована вода', 'газовка',
            'молоко', 'смузі', 'енергетичний напій', 'спортивний напій', 'кокосова вода', 'комбуча',
            'мінеральна вода', 'квас', 'морс', 'компот', 'узвар', 'лимонад', 'кока-кола',
            'пепсі', 'фанта', 'спрайт', 'ред булл', 'горілка', 'коньяк', 'віскі', 'ром',

            // Polish
            'woda', 'sok', 'kawa', 'herbata', 'wino', 'piwo', 'gazowana woda', 'napój gazowany',
            'mleko', 'smoothie', 'napój energetyczny', 'napój sportowy', 'woda kokosowa', 'kombucha',

            // Russian
            'вода', 'сок', 'кофе', 'чай', 'вино', 'пиво', 'газированная вода', 'газировка',
            'молоко', 'смузи', 'энергетический напиток', 'спортивный напиток', 'кокосовая вода', 'комбуча'
        ]
    },
    'condiments': {
        name: '🍯 Condiments & Sauces',
        keywords: [
            // English
            'ketchup', 'mustard', 'mayo', 'mayonnaise', 'hot sauce', 'barbecue sauce', 'salad dressing',
            'ranch', 'caesar', 'italian dressing', 'balsamic', 'worcestershire', 'fish sauce', 'teriyaki',

            // Ukrainian
            'кетчуп', 'гірчиця', 'майонез', 'гострий соус', 'соус барбекю', 'заправка для салату',
            'ранч', 'цезар', 'італійська заправка', 'бальзамік', 'вустерширський соус', 'рибний соус', 'теріякі',
            'аджика', 'хрін', 'васабі', 'табаско', 'шрірача', 'чілі соус', 'томатний соус',
            'песто', 'тар-тар', 'голландський соус', 'бешамель', 'болоньєзе', 'карбонара',

            // Polish
            'ketchup', 'musztarda', 'majonez', 'ostry sos', 'sos barbecue', 'dressing do sałatek',
            'ranch', 'caesar', 'sos włoski', 'balsamiczny', 'sos worcestershire', 'sos rybny', 'teriyaki',

            // Russian
            'кетчуп', 'горчица', 'майонез', 'острый соус', 'соус барбекю', 'заправка для салата',
            'ранч', 'цезарь', 'итальянская заправка', 'бальзамик', 'вустерширский соус', 'рыбный соус', 'терияки'
        ]
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
        const cleaned = ingredientLine
            .replace(/\*\*/g, '')
            .replace(/^\s*-\s*/, '')
            .trim();

        const patterns = [
            /^([\d\/\.\s-]+(?:\s+\d+\/\d+)?)\s*([a-zA-Zа-яё]+(?:\s+[a-zA-Zа-яё]+)*)\s+(.+)$/,
            /^(.+?)\s*\(([^)]+)\)$/,
            /^([\d\/\.\s-]+(?:\s+\d+\/\d+)?)\s+(.+)$/
        ];

        let quantity = null;
        let unit = null;
        let ingredient = cleaned;

        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
                if (pattern.source.includes('(.+?)')) {
                    ingredient = match[1].trim();
                    const quantityPart = match[2].trim();
                    const qMatch = quantityPart.match(/([\d\/\.\s-]+)\s*([a-zA-Zа-яё]*)/);
                    if (qMatch) {
                        quantity = parseQuantity(qMatch[1]);
                        unit = qMatch[2] || null;
                    }
                } else if (match.length === 4) {
                    quantity = parseQuantity(match[1]);
                    unit = match[2].trim();
                    ingredient = match[3].trim();
                } else if (match.length === 3) {
                    quantity = parseQuantity(match[1]);
                    ingredient = match[2].trim();
                }
                break;
            }
        }

        ingredient = extractCoreIngredient(ingredient);

        return {
            original: ingredientLine,
            quantity: quantity,
            unit: unit ? unit.toLowerCase() : null,
            ingredient: ingredient,
            recipeTitle: recipeTitle,
            combinedText: cleaned
        };

    } catch (error) {
        console.log(`Failed to parse ingredient: ${ingredientLine}`, error.message);
        return {
            original: ingredientLine,
            quantity: null,
            unit: null,
            ingredient: ingredientLine.replace(/\*\*/g, '').replace(/^\s*-\s*/, '').trim(),
            recipeTitle: recipeTitle,
            combinedText: ingredientLine.replace(/\*\*/g, '').replace(/^\s*-\s*/, '').trim()
        };
    }
};

const extractCoreIngredient = (ingredient) => {
    let core = ingredient
        .replace(/\(.*?\)/g, '') // parentheses
        .replace(/,.*$/, '') // after first comma
        .replace(/\bor\b.*$/i, '') // or alternatives
        .replace(/\bof choice\b/i, '') // of choice
        .replace(/\bany\b/i, '') // any
        .replace(/\bfresh\b/i, '') // "fresh"
        .replace(/\bdried\b/i, '') // "dried"
        .replace(/\bground\b/i, '') // "ground"
        .replace(/\bwhole\b/i, '') // "whole"
        .replace(/\bfinely chopped\b/i, '') // preparation methods
        .replace(/\bchopped\b/i, '')
        .replace(/\bsliced\b/i, '')
        .replace(/\bdiced\b/i, '')
        .replace(/\bminced\b/i, '')
        .trim();

    if (core.includes('oil')) {
        return 'oil';
    }
    if (core.includes('sauce')) {
        return core;
    }
    if (core.includes('milk') || core.includes('молок')) {
        return 'milk';
    }
    if (core.includes('tea') || core.includes('чай')) {
        return 'tea';
    }

    return core;
};

const consolidateSimilarIngredients = (ingredients) => {
    const consolidated = {};

    for (const ingredient of ingredients) {
        const key = normalizeIngredientForGrouping(ingredient.ingredient);

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
            } else if (areUnitsCompatible(consolidated[key].commonUnit, normalizedUnit)) {
                const convertedQuantity = convertToBaseUnit(ingredient.quantity, normalizedUnit);
                const baseQuantity = convertToBaseUnit(consolidated[key].totalQuantity, consolidated[key].commonUnit);
                consolidated[key].totalQuantity = baseQuantity + convertedQuantity;
                consolidated[key].commonUnit = 'tbsp';
            } else {
                consolidated[key].canConsolidate = false;
            }
        }
    }

    const result = [];
    for (const [key, data] of Object.entries(consolidated)) {
        if (data.canConsolidate && data.totalQuantity > 0 && data.items.length > 1) {
            // Successfully consolidated multiple items
            result.push({
                ingredient: data.ingredient,
                quantity: formatQuantityForShopping(data.totalQuantity),
                unit: data.commonUnit,
                recipes: [...new Set(data.items.map(item => item.recipeTitle))],
                combinedText: `${formatQuantityForShopping(data.totalQuantity)} ${data.commonUnit || ''} ${data.ingredient}`.trim(),
                isConsolidated: true
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

const normalizeIngredientForGrouping = (ingredient) => {
    return ingredient.toLowerCase()
        .replace(/s$/, '')
        .replace(/\s+/g, ' ')
        .replace(/[,()]/g, '')
        .trim();
};

const areUnitsCompatible = (unit1, unit2) => {
    const volumeUnits = ['tsp', 'teaspoon', 'tbsp', 'tablespoon', 'cup', 'ml', 'l'];
    const weightUnits = ['g', 'kg', 'oz', 'lb'];

    return (volumeUnits.includes(unit1) && volumeUnits.includes(unit2)) ||
        (weightUnits.includes(unit1) && weightUnits.includes(unit2));
};

const convertToBaseUnit = (quantity, unit) => {
    const conversions = {
        'tsp': 1/3,
        'teaspoon': 1/3,
        'tbsp': 1,
        'tablespoon': 1,
        'cup': 16,
        'ml': 1/15,
        'l': 67
    };
    return quantity * (conversions[unit] || 1);
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
            const matched = category.keywords.some(keyword => {
                const keywordLower = keyword.toLowerCase();
                return ingredientLower.includes(keywordLower) ||
                    keywordLower.includes(ingredientLower) ||
                    (ingredientLower.length > 3 && keywordLower.includes(ingredientLower)) ||
                    (keywordLower.length > 3 && ingredientLower.includes(keywordLower));
            });

            if (matched) {
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

const formatShoppingListForDisplay = (categorizedIngredients, recipes, listName) => {
    let formatted = `🛒 **${listName}** 🛒\n\n`;

    formatted += `📚 **From ${recipes.length} Recipe${recipes.length > 1 ? 's' : ''}:**\n`;
    recipes.forEach((recipe, index) => {
        formatted += `${index + 1}. ${recipe.title}\n`;
    });
    formatted += '\n';

    const totalItems = Object.values(categorizedIngredients).flat().length;
    formatted += `📝 **Shopping List** (${totalItems} items):\n\n`;
    const categoryOrder = ['produce', 'meat', 'dairy', 'pantry', 'frozen', 'bakery', 'beverages', 'condiments', 'other'];

    for (const categoryKey of categoryOrder) {
        if (categorizedIngredients[categoryKey]) {
            const ingredients = categorizedIngredients[categoryKey];
            const categoryName = INGREDIENT_CATEGORIES[categoryKey]?.name || '📦 Other';
            formatted += `${categoryName}:\n`;

            ingredients.forEach(ingredient => {
                const checkBox = '☐';
                let itemText = `${checkBox} ${ingredient.combinedText}`;

                if (ingredient.isConsolidated && ingredient.recipes.length > 1) {
                    itemText += ` *(consolidated from ${ingredient.recipes.length} recipes)*`;
                }

                formatted += `  ${itemText}\n`;
            });

            formatted += '\n';
        }
    }

    formatted += `💡 **Shopping Tips:**\n`;
    formatted += `• Check off items as you shop\n`;
    formatted += `• Items are organized by store sections\n`;
    formatted += `• Consolidated items save time and money\n\n`;

    formatted += `🌿 *Happy shopping and cooking!* ✨`;

    return formatted;
};

const parseQuantity = (quantityStr) => {
    if (!quantityStr) return null;
    const cleaned = quantityStr.toString().trim();

    const rangeMatch = cleaned.match(/^(\d*\.?\d+)\s*[-–—]\s*(\d*\.?\d+)/);
    if (rangeMatch) {
        return Math.max(parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2]));
    }

    const fractionMatch = cleaned.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
    if (fractionMatch) {
        const whole = fractionMatch[1] ? parseInt(fractionMatch[1]) : 0;
        const numerator = parseInt(fractionMatch[2]);
        const denominator = parseInt(fractionMatch[3]);
        return whole + (numerator / denominator);
    }

    const europeanDecimal = cleaned.replace(',', '.');
    const decimalMatch = europeanDecimal.match(/^(\d*\.?\d+)/);
    if (decimalMatch) {
        return parseFloat(decimalMatch[1]);
    }
    const wordNumbers = {
        // Ukrainian
        'один': 1, 'одна': 1, 'одне': 1,
        'два': 2, 'дві': 2, 'двоє': 2,
        'три': 3, 'чотири': 4, 'п\'ять': 5, 'шість': 6,
        'сім': 7, 'вісім': 8, 'дев\'ять': 9, 'десять': 10,
        'пів': 0.5, 'половина': 0.5, 'чверть': 0.25,

        // Russian
        'половину': 0.5, 'четверть': 0.25,
        'одну': 1, 'две': 2, 'пять': 5, 'шесть': 6,
        'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,

        // Polish
        'jeden': 1, 'jedna': 1, 'jedno': 1,
        'dwa': 2, 'dwie': 2, 'trzy': 3, 'cztery': 4,
        'pięć': 5, 'sześć': 6, 'siedem': 7, 'osiem': 8,
        'dziewięć': 9, 'dziesięć': 10,
        'pół': 0.5, 'ćwierć': 0.25,

        // English
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'half': 0.5, 'quarter': 0.25
    };

    const lowerCleaned = cleaned.toLowerCase();
    if (wordNumbers[lowerCleaned]) {
        return wordNumbers[lowerCleaned];
    }

    const anyNumberMatch = cleaned.match(/(\d*\.?\d+)/);
    if (anyNumberMatch) {
        return parseFloat(anyNumberMatch[1]);
    }

    return null;
};

const normalizeIngredientName = (ingredient) => {
    return ingredient.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[,()]/g, '')
        .trim();
};

const normalizeUnit = (unit) => {
    if (!unit) return null;

    const lowerUnit = unit.toLowerCase().trim();

    // Enhanced unit mappings with multilingual support
    const unitMappings = {
        // Volume - English
        'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
        'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
        'cup': 'cup', 'cups': 'cup', 'c': 'cup',
        'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
        'l': 'l', 'liter': 'l', 'liters': 'l', 'litre': 'l', 'litres': 'l',

        // Volume - Ukrainian
        'ч.л.': 'tsp', 'ч. л.': 'tsp', 'чайна ложка': 'tsp', 'чайні ложки': 'tsp',
        'ст.л.': 'tbsp', 'ст. л.': 'tbsp', 'столова ложка': 'tbsp', 'столові ложки': 'tbsp',
        'склянка': 'cup', 'склянки': 'cup', 'стакан': 'cup', 'стакани': 'cup',
        'мл': 'ml', 'міліліт': 'ml', 'міліліт.': 'ml', 'мілілітр': 'ml', 'мілілітри': 'ml',
        'л.': 'l', 'літр': 'l', 'літри': 'l',

        // Volume - Polish
        'łyżeczka': 'tsp', 'łyżeczki': 'tsp', 'łyż.': 'tsp',
        'łyżka': 'tbsp', 'łyżki': 'tbsp', 'łyż. stol.': 'tbsp',
        'szklanka': 'cup', 'szklanki': 'cup',

        // Volume - Russian
        'ч.л': 'tsp', 'чайная ложка': 'tsp', 'чайные ложки': 'tsp',
        'ст.л': 'tbsp', 'столовая ложка': 'tbsp', 'столовые ложки': 'tbsp',
        'стакан': 'cup', 'стаканы': 'cup',
        'мл.': 'ml', 'миллилитр': 'ml', 'миллилитры': 'ml',
        'л': 'l', 'литр': 'l', 'литры': 'l',

        // Weight - English
        'g': 'g', 'gram': 'g', 'grams': 'g', 'gr': 'g',
        'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
        'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
        'lb': 'lb', 'pound': 'lb', 'pounds': 'lb', 'lbs': 'lb',

        // Weight - Ukrainian
        'г': 'g', 'г.': 'g', 'грам': 'g', 'грами': 'g', 'грамів': 'g',
        'кг': 'kg', 'кг.': 'kg', 'кілограм': 'kg', 'кілограми': 'kg', 'кілограмів': 'kg',
        'унція': 'oz', 'унції': 'oz',
        'фунт': 'lb', 'фунти': 'lb', 'фунтів': 'lb',

        // Weight - Polish
        'gram': 'g', 'gramy': 'g', 'gramów': 'g',
        'kilogram': 'kg', 'kilogramy': 'kg', 'kilogramów': 'kg',

        // Weight - Russian
        'гр': 'g', 'гр.': 'g', 'грамм': 'g', 'граммы': 'g', 'граммов': 'g',
        'килограмм': 'kg', 'килограммы': 'kg', 'килограммов': 'kg',
        'унция': 'oz', 'унции': 'oz',
        'фунт': 'lb', 'фунты': 'lb', 'фунтов': 'lb',

        // Count/Pieces - Multilingual
        'piece': 'piece', 'pieces': 'piece', 'pc': 'piece', 'pcs': 'piece',
        'штука': 'piece', 'штуки': 'piece', 'штук': 'piece', 'шт': 'piece', 'шт.': 'piece',
        'sztuka': 'piece', 'sztuki': 'piece', 'sztuk': 'piece',
        'кусок': 'piece', 'куски': 'piece', 'кусков': 'piece',

        // Special cooking units
        'clove': 'clove', 'cloves': 'clove', 'зубчик': 'clove', 'зубчики': 'clove', 'зубчиків': 'clove',
        'stick': 'stick', 'sticks': 'stick', 'паличка': 'stick', 'палички': 'stick',
        'leaf': 'leaf', 'leaves': 'leaf', 'лист': 'leaf', 'листи': 'leaf', 'листя': 'leaf',
        'pinch': 'pinch', 'дрібка': 'pinch', 'щіпка': 'pinch'
    };

    return unitMappings[lowerUnit] || lowerUnit;
};

const formatQuantityForShopping = (quantity) => {
    if (!quantity || quantity === 0) return '';
    const rounded = Math.round(quantity * 8) / 8; // Round to nearest 1/8
    const fractions = {
        0.125: '⅛',
        0.25: '¼',
        0.375: '⅜',
        0.5: '½',
        0.625: '⅝',
        0.75: '¾',
        0.875: '⅞'
    };
    const tolerance = 0.01;
    for (const [decimal, fraction] of Object.entries(fractions)) {
        if (Math.abs(rounded - decimal) < tolerance) {
            return fraction;
        }
    }

    if (rounded >= 1) {
        const whole = Math.floor(rounded);
        const fractional = rounded - whole;

        for (const [decimal, fraction] of Object.entries(fractions)) {
            if (Math.abs(fractional - decimal) < tolerance) {
                return whole + fraction;
            }
        }

        if (fractional < 0.1) {
            return whole.toString();
        } else {
            return rounded.toFixed(1).replace(/\.0$/, '');
        }
    }

    return rounded.toFixed(2).replace(/\.?0+$/, '');
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
    if (!preferences.dietary_restrictions && !preferences.exclude_ingredients) {
        return categorizedIngredients;
    }

    const restrictions = preferences.dietary_restrictions || [];
    const excludedIngredients = preferences.exclude_ingredients || [];
    const dietaryFilters = {
        vegetarian: {
            exclude: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'lamb',
                'bacon', 'sausage', 'ham', 'duck', 'goose', 'venison', 'rabbit', 'meat',
                // Ukrainian
                'курка', 'яловичина', 'свинина', 'риба', 'лосось', 'креветки', 'індичка', 'баранина',
                'бекон', 'ковбаса', 'шинка', 'м\'ясо', 'курятина', 'телятина', 'печінка',
                // Polish
                'kurczak', 'wołowina', 'wieprzowina', 'ryba', 'łosoś', 'krewetki', 'indyk', 'baranina',
                // Russian
                'курица', 'говядина', 'свинина', 'рыба', 'лосось', 'креветки', 'индейка', 'баранина']
        },
        vegan: {
            exclude: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'eggs', 'honey', 'chicken', 'beef',
                'pork', 'fish', 'salmon', 'meat', 'bacon', 'sausage', 'ham',
                // Ukrainian
                'молоко', 'сир', 'масло', 'вершки', 'йогурт', 'яйця', 'мед', 'курка', 'м\'ясо',
                'сметана', 'творог', 'бринза', 'маскарпоне', 'яловичина', 'свинина', 'ковбаса',
                // Polish
                'mleko', 'ser', 'masło', 'śmietana', 'jogurt', 'jajka', 'miód', 'kurczak', 'mięso',
                // Russian
                'молоко', 'сыр', 'масло', 'сливки', 'йогурт', 'яйца', 'мёд', 'курица', 'мясо']
        },
        gluten_free: {
            exclude: ['flour', 'bread', 'pasta', 'wheat', 'barley', 'rye', 'oats', 'beer', 'soy sauce',
                'bagels', 'rolls', 'tortillas', 'crackers', 'cookies', 'cake', 'muffins',
                // Ukrainian
                'борошно', 'хліб', 'макарони', 'пшениця', 'ячмінь', 'жито', 'вівсянка', 'пиво',
                'соєвий соус', 'булочки', 'печиво', 'торт', 'кекс', 'батон', 'лаваш',
                // Polish
                'mąka', 'chleb', 'makaron', 'pszenica', 'jęczmień', 'żyto', 'owies', 'piwo',
                // Russian
                'мука', 'хлеб', 'макароны', 'пшеница', 'ячмень', 'рожь', 'овёс', 'пиво']
        },
        dairy_free: {
            exclude: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'cream cheese',
                'mozzarella', 'cheddar', 'parmesan', 'cottage cheese', 'ricotta', 'feta',
                // Ukrainian
                'молоко', 'сир', 'масло', 'вершки', 'йогурт', 'сметана', 'вершковий сир',
                'моцарела', 'чеддер', 'пармезан', 'творог', 'рікота', 'фета', 'бринза',
                // Polish
                'mleko', 'ser', 'masło', 'śmietana', 'jogurt', 'kwaśna śmietana', 'serek śmietankowy',
                // Russian
                'молоко', 'сыр', 'масло', 'сливки', 'йогурт', 'сметана', 'творог']
        },
        keto: {
            exclude: ['rice', 'pasta', 'bread', 'potato', 'sugar', 'flour', 'oats', 'quinoa',
                'beans', 'lentils', 'corn', 'banana', 'apple', 'honey', 'maple syrup',
                // Ukrainian
                'рис', 'макарони', 'хліб', 'картопля', 'цукор', 'борошно', 'вівсянка', 'кіноа',
                'квасоля', 'сочевиця', 'кукурудза', 'банан', 'яблуко', 'мед',
                // Polish
                'ryż', 'makaron', 'chleb', 'ziemniak', 'cukier', 'mąka', 'płatki owsiane',
                // Russian
                'рис', 'макароны', 'хлеб', 'картофель', 'сахар', 'мука', 'овсянка', 'киноа']
        },
        paleo: {
            exclude: ['beans', 'lentils', 'rice', 'oats', 'quinoa', 'bread', 'pasta', 'milk', 'cheese',
                'sugar', 'processed', 'peanuts', 'soy sauce', 'beer', 'corn',
                // Ukrainian
                'квасоля', 'сочевиця', 'рис', 'вівсянка', 'кіноа', 'хліб', 'макарони', 'молоко',
                'сир', 'цукор', 'арахіс', 'соєвий соус', 'пиво', 'кукурудза',
                // Polish
                'fasola', 'soczewica', 'ryż', 'płatki owsiane', 'quinoa', 'chleb', 'makaron',
                // Russian
                'фасоль', 'чечевица', 'рис', 'овсянка', 'киноа', 'хлеб', 'макароны']
        },
        nut_free: {
            exclude: ['nuts', 'almonds', 'walnuts', 'peanuts', 'cashews', 'pistachios', 'hazelnuts',
                'pecans', 'brazil nuts', 'pine nuts', 'nut oil', 'almond oil',
                // Ukrainian
                'горіхи', 'мигдаль', 'волоські горіхи', 'арахіс', 'кеш\'ю', 'фісташки', 'ліщина',
                'пекан', 'бразильський горіх', 'кедрові горішки', 'горіхове масло',
                // Polish
                'orzechy', 'migdały', 'orzechy włoskie', 'orzeszki ziemne', 'nerkowce', 'pistacje',
                // Russian
                'орехи', 'миндаль', 'грецкие орехи', 'арахис', 'кешью', 'фисташки', 'фундук']
        },
        shellfish_free: {
            exclude: ['shrimp', 'crab', 'lobster', 'crayfish', 'prawns', 'scallops', 'mussels', 'oysters',
                'clams', 'squid', 'octopus', 'sea urchin',
                // Ukrainian
                'креветки', 'краб', 'омар', 'рак', 'гребінці', 'мідії', 'устриці', 'молюски',
                'кальмар', 'осьминог', 'морський їжак',
                // Polish
                'krewetki', 'krab', 'homar', 'rak', 'przegrzebki', 'małże', 'ostrygi',
                // Russian
                'креветки', 'краб', 'омар', 'рак', 'гребешки', 'мидии', 'устрицы', 'моллюски']
        }
    };

    const filtered = {};

    for (const [category, ingredients] of Object.entries(categorizedIngredients)) {
        filtered[category] = ingredients.filter(ingredient => {
            const ingredientLower = ingredient.ingredient.toLowerCase();

            if (excludedIngredients.some(excluded =>
                ingredientLower.includes(excluded.toLowerCase()) ||
                excluded.toLowerCase().includes(ingredientLower)
            )) {
                console.log(`🚫 Filtered out "${ingredient.ingredient}" - in exclusion list`);
                return false;
            }

            for (const restriction of restrictions) {
                if (dietaryFilters[restriction]) {
                    const excludedItems = dietaryFilters[restriction].exclude;
                    if (excludedItems.some(excluded =>
                        ingredientLower.includes(excluded.toLowerCase()) ||
                        excluded.toLowerCase().includes(ingredientLower)
                    )) {
                        console.log(`🚫 Filtered out "${ingredient.ingredient}" - violates ${restriction}`);
                        return false;
                    }
                }
            }

            return true;
        });

        if (filtered[category].length === 0) {
            delete filtered[category];
        }
    }
    const originalCount = Object.values(categorizedIngredients).flat().length;
    const filteredCount = Object.values(filtered).flat().length;
    if (originalCount > filteredCount) {
        console.log(`🏷️ Dietary filtering: ${originalCount} → ${filteredCount} ingredients (${originalCount - filteredCount} filtered out)`);
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