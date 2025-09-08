const { query } = require('./connection');

const saveRecipe = async (recipeData, userId) => {
    const {
        title,
        originalVideoUrl,
        videoPlatform,
        contentSources,
        structuredRecipe,
        sourceLanguage = 'en',
        targetLanguage = 'en',
        cookingTimeMinutes = null,
        servings = null,
        difficulty = 'medium',
        videoMessageId = null,
        videoFileId = null,
        videoChatId = null
    } = recipeData;

    try {
        const result = await query(
            `INSERT INTO recipes (
                user_id, title, original_video_url, video_platform,
                content_sources, structured_recipe, source_language,
                target_language, cooking_time_minutes, servings, difficulty,
                video_message_id, video_file_id, video_chat_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 RETURNING *`,
            [
                userId, title, originalVideoUrl, videoPlatform,
                JSON.stringify(contentSources), structuredRecipe, sourceLanguage,
                targetLanguage, cookingTimeMinutes, servings, difficulty,
                videoMessageId, videoFileId, videoChatId
            ]
        );
        const savedRecipe = result.rows[0];
        console.log(`Recipe saved: "${title}" (ID: ${savedRecipe.id})`);
        return savedRecipe;

    } catch (error) {
        console.error('Error saving recipe:', error.message);
        throw error;
    }
};

const addRecipeToCategory = async (recipeId, categoryId) => {
    try {
        await query(
            `INSERT INTO recipe_categories (recipe_id, category_id) 
             VALUES ($1, $2) 
             ON CONFLICT (recipe_id, category_id) DO NOTHING`,
            [recipeId, categoryId]
        );
        console.log(`Recipe ${recipeId} added to category ${categoryId}`);
    } catch (error) {
        console.error('Error adding recipe to category:', error.message);
        throw error;
    }
};

const addTagsToRecipe = async (recipeId, tags, language = 'en') => {
    try {
        for (const tag of tags) {
            await query(
                `INSERT INTO recipe_tags (recipe_id, tag, language) 
                 VALUES ($1, $2, $3)`,
                [recipeId, tag.toLowerCase().trim(), language]
            );
        }
        console.log(`Added ${tags.length} tags to recipe ${recipeId}`);
    } catch (error) {
        console.error('Error adding tags to recipe:', error.message);
        throw error;
    }
};

const getUserRecipes = async (userId, limit = 10, offset = 0) => {
    try {
        const result = await query(
            `SELECT 
                r.*,
                ARRAY_AGG(DISTINCT c.name_en) FILTER (WHERE c.name_en IS NOT NULL) as categories,
                ARRAY_AGG(DISTINCT rt.tag) FILTER (WHERE rt.tag IS NOT NULL) as tags
             FROM recipes r
             LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
             LEFT JOIN categories c ON rc.category_id = c.id
             LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
             WHERE r.user_id = $1
             GROUP BY r.id
             ORDER BY r.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId,
                    limit,
                    offset]
        );
        return result.rows;


    } catch (error) {
        console.error('Error getting user recipes:', error.message);
        throw error;
    }
};

const searchUserRecipes = async (userId, searchTerm) => {
    try {
        const result = await query(
            `SELECT DISTINCT r.*,
                ARRAY_AGG(DISTINCT c.name_en) FILTER (WHERE c.name_en IS NOT NULL) as categories
             FROM recipes r
             LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
             LEFT JOIN categories c ON rc.category_id = c.id
             LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
             WHERE r.user_id = $1 
               AND (
                 r.title ILIKE $2 
                 OR r.structured_recipe ILIKE $2
                 OR rt.tag ILIKE $2
               )
             GROUP BY r.id
             ORDER BY r.created_at DESC`,

            [userId, `%${searchTerm}%`]
        );

        return result.rows;

    } catch (error) {
        console.error('Error searching recipes:', error.message);
        throw error;
    }
};


const getRecipeById = async (recipeId, userId) => {
    try {
        const result = await query(
            `SELECT 
                r.*,
                ARRAY_AGG(DISTINCT c.name_en) FILTER (WHERE c.name_en IS NOT NULL) as categories,
                ARRAY_AGG(DISTINCT rt.tag) FILTER (WHERE rt.tag IS NOT NULL) as tags,
                u.first_name as owner_name
             FROM recipes r
             LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
             LEFT JOIN categories c ON rc.category_id = c.id
             LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.id = $1 AND r.user_id = $2
             GROUP BY r.id, u.first_name`,
            [recipeId, userId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {

        console.error('Error getting recipe by ID:', error.message);
        throw error;
    }
};


const deleteRecipe = async (recipeId, userId) => {
    try {
        const result = await query(
            'DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id',
            [recipeId, userId]
        );

        if (result.rows.length === 0) {
            return false;
        }

        console.log(`Recipe ${recipeId} deleted by user ${userId}`);
        return true;
    } catch (error) {
        console.error('Error deleting recipe:', error.message);
        throw error;
    }
};

const updateRecipeNutrition = async (recipeId, userId, structuredRecipeWithNutrition) => {
    try {
        const result = await query(
            `UPDATE recipes 
             SET structured_recipe = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [structuredRecipeWithNutrition, recipeId, userId]
        );

        if (result.rows.length === 0) {
            throw new Error('Recipe not found or not accessible');
        }

        console.log(`Recipe ${recipeId} updated with nutrition analysis`);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating recipe nutrition:', error.message);
        throw error;
    }
};

module.exports = {
    saveRecipe,
    addRecipeToCategory,
    addTagsToRecipe,
    getUserRecipes,
    searchUserRecipes,
    getRecipeById,
    deleteRecipe,
    updateRecipeNutrition
};