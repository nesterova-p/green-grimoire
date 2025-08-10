require('dotenv').config();
const { Telegraf } = require('telegraf');

console.log('🔍 Testing imports...');

// Test imports one by one
try {
    const startCommand = require('./commands/start');
    console.log('✅ startCommand:', typeof startCommand);
} catch (e) {
    console.log('❌ startCommand failed:', e.message);
}

try {
    const helpCommand = require('./commands/help');
    console.log('✅ helpCommand:', typeof helpCommand);
} catch (e) {
    console.log('❌ helpCommand failed:', e.message);
}

try {
    const pingCommand = require('./commands/ping');
    console.log('✅ pingCommand:', typeof pingCommand);
} catch (e) {
    console.log('❌ pingCommand failed:', e.message);
}

try {
    const textHandler = require('./handlers/textHandler');
    console.log('✅ textHandler:', typeof textHandler);
} catch (e) {
    console.log('❌ textHandler failed:', e.message);
}

try {
    const mediaHandler = require('./handlers/mediaHandler');
    console.log('✅ mediaHandler:', typeof mediaHandler);
    console.log('✅ mediaHandler.video:', typeof mediaHandler.video);
} catch (e) {
    console.log('❌ mediaHandler failed:', e.message);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

if(!process.env.BOT_TOKEN){
    console.error('Error! BOT_TOKEN environment variable is required!');
    process.exit(1);
}

console.log('🌿 All imports tested, starting bot...');