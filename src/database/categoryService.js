const { query } = require('./connection');

const getCategories = async (language = 'en') => {
    try {
        const nameColumn = getNameColumn(language);

        const result = await query(
            `SELECT id, key, ${nameColumn} as name, icon, is_default 
             FROM categories 
             WHERE is_default = true 
             ORDER BY key`,
            []
        );
        return result.rows;

    } catch (error) {
        console.error('Error getting categories:', error.message);
        throw error;
    }
};

const getCategoryByKey = async (categoryKey) => {
    try {
        const result = await query(
            'SELECT * FROM categories WHERE key = $1',
            [categoryKey]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting category by key:', error.message);
        throw error;
    }
};



const getCategoryById = async (categoryId) => {
    try {
        const result = await query(
            'SELECT * FROM categories WHERE id = $1',
            [categoryId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting category by ID:', error.message);
        throw error;
    }
};

const getRecipesByCategory = async (userId, categoryId, limit = 10) => {
    try {
        const result = await query(
            `SELECT r.*, c.name_en as category_name
             FROM recipes r
             JOIN recipe_categories rc ON r.id = rc.recipe_id
             JOIN categories c ON rc.category_id = c.id
             WHERE r.user_id = $1 AND rc.category_id = $2
             ORDER BY r.created_at DESC
             LIMIT $3`,
            [userId, categoryId, limit]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting recipes by category:', error.message);
        throw error;
    }
};

const createCustomCategory = async (key, names, icon = '📝') => {
    try {
        const result = await query(
            `INSERT INTO categories (key, name_en, name_pl, name_uk, icon, is_default)
             VALUES ($1, $2, $3, $4, $5, false)
             RETURNING *`,
            [key, names.en, names.pl ||
                    names.en, names.uk ||
                    names.en, icon]
        );

        console.log(`Custom category created: ${names.en} (${key})`);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating custom category:', error.message);
        throw error;
    }
};

const getUserCategoryStats = async (userId, language = 'en') => {
    try {
        const nameColumn = getNameColumn(language);

        const result = await query(
            `SELECT 
                c.id,
                c.key,
                c.${nameColumn} as name,
                c.icon,
                COUNT(rc.recipe_id) as recipe_count
             FROM categories c
             LEFT JOIN recipe_categories rc ON c.id = rc.category_id
             LEFT JOIN recipes r ON rc.recipe_id = r.id AND r.user_id = $1
             WHERE c.is_default = true
             GROUP BY c.id, c.key, c.${nameColumn}, c.icon
             ORDER BY recipe_count DESC, c.key`,
            [userId]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting user category stats:', error.message);
        throw error;
    }
};

const suggestCategory = (recipeText) => {
    const text = recipeText.toLowerCase();

    if (text.includes('salad') || text.includes('lettuce') || text.includes('greens')) {
        return 'salads';
    }
    if (text.includes('dessert') || text.includes('cake') || text.includes('sweet') || text.includes('chocolate')) {
        return 'desserts';
    }
    if (text.includes('soup') || text.includes('broth') || text.includes('stew')) {
        return 'soups';
    }
    if (text.includes('drink') || text.includes('smoothie') || text.includes('juice') || text.includes('coffee')) {
        return 'drinks';
    }
    if (text.includes('snack') || text.includes('appetizer') || text.includes('bite')) {
        return 'snacks';
    }

    return 'main_dishes';
};

const getNameColumn = (language) => {
    switch (language) {
        case 'pl': return 'name_pl';
        case 'uk': return 'name_uk';
        default: return 'name_en';
    }
};





module.exports = {
    getCategories,
    getCategoryByKey,
    getCategoryById,
    getRecipesByCategory,
    createCustomCategory,
    getUserCategoryStats,
    suggestCategory
};