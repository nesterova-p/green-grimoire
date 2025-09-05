const { query } = require('../database/connection');

const rateRecipe = async (recipeId, userId, rating, notes = null) => {
    try {
        const recipeCheck = await query(
            'SELECT id, title FROM recipes WHERE id = $1 AND user_id = $2',
            [recipeId, userId]
        );
        if (recipeCheck.rows.length === 0) {
            throw new Error('Recipe not found or not accessible');
        }

        const result = await query(
            `INSERT INTO recipe_ratings (recipe_id, user_id, rating, notes)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (recipe_id, user_id) 
             DO UPDATE SET 
                rating = EXCLUDED.rating,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [recipeId, userId, rating, notes]
        );

        await query(
            `UPDATE recipes 
             SET user_rating = $1, rating_date = CURRENT_TIMESTAMP, rating_notes = $2
             WHERE id = $3 AND user_id = $4`,
            [rating, notes, recipeId, userId]
        );

        console.log(`⭐ Recipe ${recipeId} rated ${rating} stars by user ${userId}`);
        return {
            success: true,
            rating: result.rows[0],
            recipeTitle: recipeCheck.rows[0].title
        };

    } catch (error) {
        console.error('Error rating recipe:', error.message);
        throw error;
    }
};

const getRecipeRating = async (recipeId, userId) => {
    try {
        const result = await query(
            `SELECT rr.*, r.title as recipe_title
             FROM recipe_ratings rr
             JOIN recipes r ON rr.recipe_id = r.id
             WHERE rr.recipe_id = $1 AND rr.user_id = $2`,
            [recipeId, userId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting recipe rating:', error.message);
        throw error;
    }
};

const getUserRatedRecipes = async (userId, limit = 10, offset = 0) => {
    try {
        const result = await query(
            `SELECT 
                r.id,
                r.title,
                r.video_platform,
                r.created_at as recipe_date,
                rr.rating,
                rr.notes,
                rr.created_at as rating_date,
                rr.updated_at as rating_updated
             FROM recipes r
             JOIN recipe_ratings rr ON r.id = rr.recipe_id
             WHERE r.user_id = $1
             ORDER BY rr.updated_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting user rated recipes:', error.message);
        throw error;
    }
};

const getUnratedRecipes = async (userId, limit = 5) => {
    try {
        const result = await query(
            `SELECT 
                r.id,
                r.title,
                r.video_platform,
                r.created_at,
                ARRAY_AGG(DISTINCT c.name_en) FILTER (WHERE c.name_en IS NOT NULL) as categories
             FROM recipes r
             LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
             LEFT JOIN categories c ON rc.category_id = c.id
             LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id AND rr.user_id = r.user_id
             WHERE r.user_id = $1 AND rr.id IS NULL
             GROUP BY r.id, r.title, r.video_platform, r.created_at
             ORDER BY r.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting unrated recipes:', error.message);
        throw error;
    }
};

const getRatingStats = async (userId) => {
    try {
        const result = await query(
            `SELECT 
                COUNT(*) as total_rated,
                AVG(rating) as average_rating,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
                COUNT(CASE WHEN notes IS NOT NULL AND notes != '' THEN 1 END) as with_notes
             FROM recipe_ratings rr
             JOIN recipes r ON rr.recipe_id = r.id
             WHERE r.user_id = $1`,
            [userId]
        );

        const stats = result.rows[0];
        return {
            totalRated: parseInt(stats.total_rated),
            averageRating: stats.average_rating ? parseFloat(stats.average_rating).toFixed(1) : '0.0',
            distribution: {
                5: parseInt(stats.five_stars),
                4: parseInt(stats.four_stars),
                3: parseInt(stats.three_stars),
                2: parseInt(stats.two_stars),
                1: parseInt(stats.one_star)
            },
            withNotes: parseInt(stats.with_notes)
        };
    } catch (error) {
        console.error('Error getting rating stats:', error.message);
        throw error;
    }
};

const deleteRecipeRating = async (recipeId, userId) => {
    try {
        // Delete from recipe_ratings table first
        const deleteResult = await query(
            'DELETE FROM recipe_ratings WHERE recipe_id = $1 AND user_id = $2',
            [recipeId, userId]
        );

        // Clear rating from recipes table
        await query(
            `UPDATE recipes 
             SET user_rating = NULL, rating_date = NULL, rating_notes = NULL
             WHERE id = $1 AND user_id = $2`,
            [recipeId, userId]
        );

        // Return true if any rows were affected
        return deleteResult.rowCount > 0;

    } catch (error) {
        console.error('Error deleting recipe rating:', error.message);
        throw error;
    }
};

const getTopRatedRecipes = async (userId, limit = 10) => {
    try {
        const result = await query(
            `SELECT 
                r.id,
                r.title,
                r.video_platform,
                r.created_at,
                rr.rating,
                rr.notes,
                rr.created_at as rating_date,
                ARRAY_AGG(DISTINCT c.name_en) FILTER (WHERE c.name_en IS NOT NULL) as categories
             FROM recipes r
             JOIN recipe_ratings rr ON r.id = rr.recipe_id
             LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
             LEFT JOIN categories c ON rc.category_id = c.id
             WHERE r.user_id = $1
             GROUP BY r.id, r.title, r.video_platform, r.created_at, rr.rating, rr.notes, rr.created_at
             ORDER BY rr.rating DESC, rr.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting top rated recipes:', error.message);
        throw error;
    }
};



module.exports = {
    rateRecipe,
    getRecipeRating,
    getUserRatedRecipes,
    getUnratedRecipes,
    getRatingStats,
    deleteRecipeRating,
    getTopRatedRecipes
};