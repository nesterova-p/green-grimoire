require('dotenv').config();
const {Pool} = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'greengrimoire',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const testConnection = async () => {
    try{
        const client = await pool.connect();
        const result = await client.query('SELECT current_database(), version()');
        client.release();
        console.log('✅ Database connected successfully!');
        console.log(`Database: ${result.rows[0].current_database}`);
        console.log(`PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}
const initDatabase = async() => {
    console.log('🔮 Initializing database connection...');
    const connected = await testConnection();
    if(!connected){
        console.error('💀 Cannot start bot without database connection!');
        process.exit(1);
    }
    return pool;
}

const query = async (text, params) => {
    const start = Date.now();
    try{
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`Query executed in ${duration}ms: ${text.substring(0, 50)}...`);
        return result;
    } catch (error) {
        console.error('Database query error:', error.message);
        console.error('Query:', text);
        console.error('Params:', params);
        throw error;
    }
}

process.on('SIGINT', async () => {
    console.log('Closing database connections...');
    await pool.end();
    console.log('Database connections closed.');
    process.exit(0);
});

module.exports = {
    pool,
    query,
    initDatabase,
    testConnection
};