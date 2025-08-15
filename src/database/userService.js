const {query} = require('./connection');

const findOrCreateUser  = async (ctx) => {
    const telegramUserId = ctx.from.id;
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;

    try{
        const existingUser = await query(
            'SELECT * FROM users WHERE telegram_user_id = $1',
            [telegramUserId]
        );

        if (existingUser.rows.length > 0) {
            console.log(`Welcome back ${firstName || username}!`);
            return existingUser.rows[0];
        }

        const newUser = await query(
            `INSERT INTO users (telegram_user_id, username, first_name, preferred_language) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [telegramUserId, username, firstName, 'en']
        );

        console.log(`New user created: ${firstName || username} (ID: ${telegramUserId})`);
        return newUser.rows[0]
    } catch (error){
        console.error('Error in findOrCreateUser:', error.message);
        throw error;
    }
}

const updateUserLanguage = async (userId, language) => {
    try {
        const result = await query(
            `UPDATE users 
             SET preferred_language = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [language, userId]
        );

        if (result.rows.length === 0) {
            throw new Error(`User with ID ${userId} not found`);
        }

        console.log(`🌍 User ${userId} language updated to: ${language}`);
        return result.rows[0];

    } catch (error) {
        console.error('Error updating user language:', error.message);
        throw error;
    }
};

const getUserById = async (userId) => {
    try {
        const result = await query('SELECT * FROM users WHERE id = $1',
            [userId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting user by ID:', error.message);
        throw error;
    }
};

const getUserByTelegramId = async (telegramUserId) => {
    try {
        const result = await query('SELECT * FROM users WHERE telegram_user_id = $1', [telegramUserId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting user by Telegram ID:', error.message);
        throw error;
    }
};

const getAllUsers = async () => {
    try {
        const result = await query(
            'SELECT id, username, first_name, preferred_language, created_at FROM users ORDER BY created_at DESC'
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting all users:', error.message);
        throw error;
    }
};


const getUserStats = async (userId) => {
    try {
        const result = await query(
            `SELECT 
                COUNT(r.id) as total_recipes,
                COUNT(DISTINCT r.video_platform) as platforms_used,
                COUNT(DISTINCT rc.category_id) as categories_used,
                MIN(r.created_at) as first_recipe_date,
                MAX(r.created_at) as last_recipe_date
             FROM recipes r
             LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
             WHERE r.user_id = $1`,
            [userId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error getting user stats:', error.message);
        throw error;
    }
};

module.exports = {
    findOrCreateUser,
    updateUserLanguage,
    getUserById,
    getUserByTelegramId,
    getAllUsers,
    getUserStats
};