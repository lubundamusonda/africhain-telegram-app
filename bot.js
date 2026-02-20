// Simple Telegram Bot for AfriChain
// Save this as bot.js and run: node bot.js

const TelegramBot = require('node-telegram-bot-api');
const token = 'YOUR_BOT_TOKEN_HERE'; // Replace with your token

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

// Store user data (in production, use a database)
const users = {};

// Command: /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;
    
    bot.sendMessage(chatId, 
        `🌱 Welcome ${firstName} to AfriChain Connect!\n\n` +
        `I'm your gateway to:\n` +
        `• 📊 Agricultural Marketplace\n` +
        `• ⚡ Renewable Energy Projects\n` +
        `• 🌍 Carbon Credit Trading\n\n` +
        `Tap the button below to open the app:`,
        {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '🚀 Open AfriChain App',
                        web_app: {url: 'https://YOUR_USERNAME.github.io/africhain/'}
                    }
                ]]
            }
        }
    );
    
    // Store user
    users[chatId] = {
        id: msg.from.id,
        name: firstName,
        username: msg.from.username,
        joined: new Date()
    };
    
    console.log(`New user: ${firstName} (${chatId})`);
});

// Command: /profile
bot.onText(/\/profile/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    
    if (user) {
        bot.sendMessage(chatId,
            `👤 Your Profile\n\n` +
            `Name: ${user.name}\n` +
            `Username: @${user.username || 'Not set'}\n` +
            `User ID: ${user.id}\n` +
            `Joined: ${user.joined.toLocaleDateString()}\n\n` +
            `Use /help for all commands`
        );
    } else {
        bot.sendMessage(chatId, 'Please use /start first!');
    }
});

// Command: /help
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🆘 AfriChain Bot Help\n\n` +
        `Available commands:\n` +
        `/start - Begin using AfriChain\n` +
        `/profile - View your profile\n` +
        `/help - Show this help message\n\n` +
        `Marketplace commands:\n` +
        `/list - List your products\n` +
        `/buy - Browse marketplace\n` +
        `/carbon - Learn about carbon credits\n\n` +
        `Need help? Contact @YourUsername`
    );
});

// Handle inline queries (search)
bot.on('inline_query', (query) => {
    const results = [
        {
            type: 'article',
            id: '1',
            title: '🌽 Maize Marketplace',
            description: 'Buy or sell maize in Zambia',
            input_message_content: {
                message_text: '🌽 Check out maize prices on AfriChain!\n\nTap below to open:',
                parse_mode: 'HTML'
            },
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: 'Open Marketplace',
                        web_app: {url: 'https://YOUR_USERNAME.github.io/africhain/'}
                    }
                ]]
            }
        },
        {
            type: 'article',
            id: '2',
            title: '☀️ Solar Projects',
            description: 'Invest in renewable energy',
            input_message_content: {
                message_text: '⚡ Discover solar energy projects in Africa!\n\nTap below to open:',
                parse_mode: 'HTML'
            },
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: 'Browse Energy Projects',
                        web_app: {url: 'https://YOUR_USERNAME.github.io/africhain/'}
                    }
                ]]
            }
        }
    ];
    
    bot.answerInlineQuery(query.id, results);
});

// Handle messages
bot.on('message', (msg) => {
    // Echo back simple messages
    if (msg.text && !msg.text.startsWith('/')) {
        bot.sendMessage(msg.chat.id, `I received: "${msg.text}"\n\nUse /help for commands.`);
    }
});

console.log('🤖 AfriChain Bot is running...');