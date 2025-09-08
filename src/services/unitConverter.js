const CONVERSIONS = {
    volume: {
        'teaspoon': { base: 1, aliases: ['tsp', 'teaspoons'] },
        'tablespoon': { base: 3, aliases: ['tbsp', 'tablespoons', 'tbsps'] },
        'fluid ounce': { base: 6, aliases: ['fl oz', 'fluid ounces', 'floz'] },
        'cup': { base: 48, aliases: ['cups', 'c'] },
        'pint': { base: 96, aliases: ['pints', 'pt'] },
        'quart': { base: 192, aliases: ['quarts', 'qt'] },
        'gallon': { base: 768, aliases: ['gallons', 'gal'] },
        'milliliter': { base: 0.2, aliases: ['ml', 'milliliters', 'mL'] },
        'liter': { base: 202.9, aliases: ['l', 'liters', 'L', 'litre', 'litres'] },
        'deciliter': { base: 20.29, aliases: ['dl', 'deciliters', 'dL'] }
    },
    weight: {
        'ounce': { base: 1, aliases: ['oz', 'ounces'] },
        'pound': { base: 16, aliases: ['lb', 'lbs', 'pounds'] },
        'gram': { base: 0.035, aliases: ['g', 'grams'] },
        'kilogram': { base: 35.27, aliases: ['kg', 'kilograms', 'kgs'] }
    },
    length: {
        'inch': { base: 1, aliases: ['in', 'inches', '"'] },
        'foot': { base: 12, aliases: ['ft', 'feet', "'"] },
        'centimeter': { base: 0.39, aliases: ['cm', 'centimeters'] },
        'millimeter': { base: 0.039, aliases: ['mm', 'millimeters'] }
    }
};

const TEMPERATURE = {
    fahrenheit: {
        toCelsius: (f) => (f - 32) * 5/9,
        aliases: ['f', '°f', 'fahrenheit', 'degrees f']
    },
    celsius: {
        toFahrenheit: (c) => c * 9/5 + 32,
        aliases: ['c', '°c', 'celsius', 'degrees c']
    }
};

const INGREDIENT_DENSITIES = {
    'flour': { gramsPerCup: 120, type: 'weight' },
    'sugar': { gramsPerCup: 200, type: 'weight' },
    'brown sugar': { gramsPerCup: 220, type: 'weight' },
    'butter': { gramsPerCup: 227, type: 'weight' },
    'oil': { gramsPerCup: 220, type: 'weight' },
    'honey': { gramsPerCup: 340, type: 'weight' },
    'water': { gramsPerCup: 240, type: 'weight' },
    'milk': { gramsPerCup: 245, type: 'weight' },
    'rice': { gramsPerCup: 185, type: 'weight' }
};

const normalizeUnit = (unit) => {
    if (!unit) return '';
    const normalized = unit.toLowerCase().trim();

    for (const category of Object.values(CONVERSIONS)) {
        for (const [canonical, data] of Object.entries(category)) {
            if (canonical === normalized || data.aliases.includes(normalized)) {
                return canonical;
            }
        }
    }

    return normalized;
};

const getUnitType = (unit) => {
    const normalized = normalizeUnit(unit);

    for (const [type, units] of Object.entries(CONVERSIONS)) {
        if (units[normalized]) {
            return type;
        }
    }

    return 'unknown';
};

const convertUnits = (quantity, fromUnit) => {
    const normalized = normalizeUnit(fromUnit);
    const unitType = getUnitType(normalized);

    if (unitType === 'unknown') {
        return { converted: false, quantity, unit: fromUnit };
    }

    const conversions = CONVERSIONS[unitType];
    const fromBase = conversions[normalized]?.base || 1;
    const totalBase = quantity * fromBase;
    const bestUnit = selectBestUnit(totalBase, unitType);

    if (bestUnit === normalized) {
        return { converted: false, quantity, unit: fromUnit };
    }

    const toBase = conversions[bestUnit].base;
    const convertedQuantity = totalBase / toBase;

    return {
        converted: true,
        quantity: convertedQuantity,
        unit: bestUnit,
        originalQuantity: quantity,
        originalUnit: fromUnit
    };
};

const selectBestUnit = (baseUnits, unitType) => {
    const conversions = CONVERSIONS[unitType];

    if (unitType === 'volume') {
        if (baseUnits >= 768) return 'gallon';          // 1+ gallons
        if (baseUnits >= 192) return 'quart';           // 1+ quarts
        if (baseUnits >= 96) return 'pint';             // 1+ pints
        if (baseUnits >= 48) return 'cup';              // 1+ cups
        if (baseUnits >= 6) return 'fluid ounce';       // 1+ fl oz
        if (baseUnits >= 3) return 'tablespoon';        // 1+ tbsp
        return 'teaspoon';                              // < 1 tbsp
    }

    if (unitType === 'weight') {
        // Weight unit selection logic
        if (baseUnits >= 16) return 'pound';            // 1+ pounds
        return 'ounce';                                 // < 1 pound
    }

    if (unitType === 'length') {
        // Length unit selection logic
        if (baseUnits >= 12) return 'foot';             // 1+ feet
        return 'inch';                                  // < 1 foot
    }

    return Object.keys(conversions)[0];
};

const convertBetweenSystems = (quantity, fromUnit, ingredient = null) => {
    const normalized = normalizeUnit(fromUnit);
    if (getUnitType(normalized) === 'volume') {
        const conversions = CONVERSIONS.volume;
        const fromBase = conversions[normalized]?.base || 1;
        const totalTeaspoons = quantity * fromBase;
        const isMetric = ['milliliter', 'liter', 'deciliter'].includes(normalized);

        if (isMetric) {
            const bestImperial = selectBestUnit(totalTeaspoons, 'volume');
            const imperialBase = conversions[bestImperial].base;
            return {
                quantity: totalTeaspoons / imperialBase,
                unit: bestImperial,
                system: 'imperial'
            };
        } else {
            const ml = totalTeaspoons * 4.93; // 1 tsp = 4.93 ml
            if (ml >= 1000) {
                return { quantity: ml / 1000, unit: 'liter', system: 'metric' };
            } else {
                return { quantity: ml, unit: 'milliliter', system: 'metric' };
            }
        }
    }

    if (getUnitType(normalized) === 'weight') {
        const conversions = CONVERSIONS.weight;
        const fromBase = conversions[normalized]?.base || 1;
        const totalOunces = quantity * fromBase;

        const isMetric = ['gram', 'kilogram'].includes(normalized);

        if (isMetric) {
            if (totalOunces >= 16) {
                return { quantity: totalOunces / 16, unit: 'pound', system: 'imperial' };
            } else {
                return { quantity: totalOunces, unit: 'ounce', system: 'imperial' };
            }
        } else {
            const grams = totalOunces * 28.35;
            if (grams >= 1000) {
                return { quantity: grams / 1000, unit: 'kilogram', system: 'metric' };
            } else {
                return { quantity: grams, unit: 'gram', system: 'metric' };
            }
        }
    }

    return { quantity, unit: fromUnit, system: 'unknown' };
};

const volumeToWeight = (quantity, volumeUnit, ingredient) => {
    const normalized = normalizeUnit(volumeUnit);
    const ingredientKey = findIngredientKey(ingredient);
    if (!ingredientKey || !INGREDIENT_DENSITIES[ingredientKey]) {
        return null;
    }

    const density = INGREDIENT_DENSITIES[ingredientKey];
    const volumeType = getUnitType(normalized);

    if (volumeType !== 'volume') {
        return null; // Not a volume unit
    }

    const conversions = CONVERSIONS.volume;
    const fromBase = conversions[normalized]?.base || 1;
    const totalTeaspoons = quantity * fromBase;
    const cups = totalTeaspoons / 48; // 48 tsp per cup

    const grams = cups * density.gramsPerCup;

    if (grams >= 1000) {
        return { quantity: grams / 1000, unit: 'kilogram' };
    } else if (grams >= 28.35) {
        return { quantity: grams / 28.35, unit: 'ounce' };
    } else {
        return { quantity: grams, unit: 'gram' };
    }
};

const findIngredientKey = (ingredient) => {
    if (!ingredient) return null;

    const lower = ingredient.toLowerCase();

    for (const key of Object.keys(INGREDIENT_DENSITIES)) {
        if (lower.includes(key)) {
            return key;
        }
    }

    if (lower.includes('all-purpose') || lower.includes('plain')) return 'flour';
    if (lower.includes('granulated') || lower.includes('white sugar')) return 'sugar';
    if (lower.includes('packed') || lower.includes('light')) return 'brown sugar';
    if (lower.includes('vegetable') || lower.includes('olive')) return 'oil';
    if (lower.includes('whole') || lower.includes('2%')) return 'milk';

    return null;
};

const convertTemperature = (temp, fromUnit, toUnit = null) => {
    const fromNormalized = normalizeUnit(fromUnit);
    if (!toUnit) {
        toUnit = fromNormalized === 'celsius' ? 'fahrenheit' : 'celsius';
    }

    const toNormalized = normalizeUnit(toUnit);

    if (fromNormalized === 'fahrenheit' && toNormalized === 'celsius') {
        return {
            temperature: TEMPERATURE.fahrenheit.toCelsius(temp),
            unit: 'celsius',
            symbol: '°C'
        };
    } else if (fromNormalized === 'celsius' && toNormalized === 'fahrenheit') {
        return {
            temperature: TEMPERATURE.celsius.toFahrenheit(temp),
            unit: 'fahrenheit',
            symbol: '°F'
        };
    }

    return { temperature: temp, unit: fromUnit };
};

const getEquivalentMeasurements = (quantity, unit) => {
    const equivalents = [];
    const normalized = normalizeUnit(unit);
    const unitType = getUnitType(normalized);

    if (unitType === 'volume') {
        const conversions = CONVERSIONS.volume;
        const fromBase = conversions[normalized]?.base || 1;
        const totalTeaspoons = quantity * fromBase;
        const commonUnits = ['teaspoon', 'tablespoon', 'cup'];

        for (const targetUnit of commonUnits) {
            if (targetUnit !== normalized) {
                const targetBase = conversions[targetUnit].base;
                const converted = totalTeaspoons / targetBase;
                if (converted >= 0.25 && converted <= 16) {
                    equivalents.push({
                        quantity: Math.round(converted * 4) / 4, // Round to quarter
                        unit: targetUnit
                    });
                }
            }
        }
    }

    return equivalents;
};

module.exports = {
    convertUnits,
    normalizeUnit,
    getUnitType,
    convertBetweenSystems,
    volumeToWeight,
    convertTemperature,
    getEquivalentMeasurements,
    CONVERSIONS,
    INGREDIENT_DENSITIES
};