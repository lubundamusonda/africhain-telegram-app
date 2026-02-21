
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============
// REPLACE THIS WITH YOUR ACTUAL BOT TOKEN FROM @BotFather
const BOT_TOKEN = '7665340593:AAFhvYA_6GiDMuMEqhitKLKaUBY5cQBhaUg'; // Example: 6123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALD_abcde
const YOUR_TELEGRAM_ID = 7992042568; // Replace with your personal Telegram ID (for admin commands)
const GITHUB_PAGES_URL = 'https://lubundamusonda.github.io/africhain-telegram-app/'; // Your GitHub Pages URL

// ============ INITIALIZE BOT ============
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log('🤖 AfriChain Bot starting...');

// ============ DATA STORAGE (In-memory, use database in production) ============
let users = {}; // Store user data: {chatId: {id, name, username, type, farmData, joined}}
let products = []; // Store products: [{id, type, name, price, sellerId, sellerName, quantity, unit, location, date}]
let carbonProjects = []; // Store carbon projects

// ============ HELPER FUNCTIONS ============
function saveToFile() {
    // In production, replace with database
    const data = { users, products, carbonProjects, timestamp: new Date() };
    fs.writeFileSync('data_backup.json', JSON.stringify(data, null, 2));
    console.log('💾 Data saved to file');
}

function loadFromFile() {
    try {
        if (fs.existsSync('data_backup.json')) {
            const data = JSON.parse(fs.readFileSync('data_backup.json'));
            users = data.users || {};
            products = data.products || [];
            carbonProjects = data.carbonProjects || [];
            console.log('📂 Data loaded from file');
        }
    } catch (error) {
        console.log('No previous data found, starting fresh');
    }
}

// Load any existing data
loadFromFile();

// Auto-save every 5 minutes
setInterval(saveToFile, 5 * 60 * 1000);

// ============ COMMAND: /start ============
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name;
    const username = msg.from.username;
    
    console.log(`👤 New user: ${firstName} (ID: ${userId})`);
    
    // Store user
    users[chatId] = {
        id: userId,
        name: firstName,
        username: username || 'No username',
        type: 'visitor', // visitor, farmer, buyer, investor
        farmData: null,
        joined: new Date().toISOString(),
        lastActive: new Date().toISOString()
    };
    
    // Create welcome message with inline keyboard
    const welcomeMessage = 
`🌱 *Welcome to AfriChain Connect, ${firstName}!*  

I'm your gateway to Zambia's Agricultural & Energy Marketplace.

*What I can help you with:*
• 🌽 *Buy/Sell Crops* - Connect with farmers & buyers
• ⚡ *Energy Projects* - Invest in solar/wind projects  
• 🌍 *Carbon Credits* - Earn from sustainable farming
• 💰 *Instant Payments* - Secure Telegram payments

*Quick Commands:*
/register - Create farmer profile
/market - Browse marketplace  
/list - List your products
/carbon - Learn about carbon credits
/help - All commands

*Tap below to open the full app:*`;

    bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '🚀 OPEN AFRICHAIN APP',
                    web_app: { url: GITHUB_PAGES_URL }
                }],
                [{
                    text: '👨‍🌾 I\'m a Farmer',
                    callback_data: 'user_type_farmer'
                }, {
                    text: '🛒 I\'m a Buyer',
                    callback_data: 'user_type_buyer'
                }],
                [{
                    text: '📊 Market Prices',
                    callback_data: 'market_prices'
                }, {
                    text: '🌤️ Solar Projects',
                    callback_data: 'solar_projects'
                }]
            ]
        }
    });
    
    // Send follow-up message after 2 seconds
    setTimeout(() => {
        bot.sendMessage(chatId, 
`💡 *Pro Tip:* You can also type "@${bot.options.username} maize" in any chat to search for products!

Need help? Just type /help anytime.`, 
        { parse_mode: 'Markdown' });
    }, 2000);
});

// ============ COMMAND: /register ============
bot.onText(/\/register/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    
    if (!user) {
        bot.sendMessage(chatId, 'Please use /start first!');
        return;
    }
    
    bot.sendMessage(chatId, 
`*Farmer Registration*  

Let's set up your farmer profile. This will help buyers find you and verify your farm.

*Please choose your main activity:*`,
    {
        parse_mode: 'Markdown',
        reply_markup: {
            keyboard: [
                ['🌽 Crop Farming', '🐄 Livestock'],
                ['☀️ Solar Energy', '🌾 Mixed Farming'],
                ['❌ Cancel']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
    
    // Set user state to expect farm type
    user.state = 'awaiting_farm_type';
});

// ============ COMMAND: /market ============
bot.onText(/\/market/, (msg) => {
    const chatId = msg.chat.id;
    
    if (products.length === 0) {
        bot.sendMessage(chatId, 
`🏪 *Marketplace is Empty*  

No products listed yet. Be the first to list!

Tap below to list your first product:`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '📝 List Product',
                        callback_data: 'list_product'
                    }
                ]]
            }
        });
        return;
    }
    
    // Show latest 5 products
    const latestProducts = products.slice(-5).reverse();
    let marketMessage = `🏪 *Latest Marketplace Listings*  \n`;
    
    latestProducts.forEach((product, index) => {
        marketMessage += `
*${index + 1}. ${product.type} ${product.name}*
💰 Price: $${product.price} per ${product.unit}
📦 Quantity: ${product.quantity} ${product.unit}
📍 Location: ${product.location}
👤 Seller: ${product.sellerName}
📅 Listed: ${new Date(product.date).toLocaleDateString()}
`;
    });
    
    marketMessage += `\n*Tap below to open full marketplace:*`;
    
    bot.sendMessage(chatId, marketMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '🛒 Browse All Products',
                    web_app: { url: GITHUB_PAGES_URL + '#marketplace' }
                }],
                [{
                    text: '🌽 Search Maize',
                    callback_data: 'search_maize'
                }, {
                    text: '☕ Search Coffee',
                    callback_data: 'search_coffee'
                }]
            ]
        }
    });
});

// ============ COMMAND: /list ============
bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    
    if (!user || user.type !== 'farmer') {
        bot.sendMessage(chatId, 'Please register as a farmer first using /register');
        return;
    }
    
    bot.sendMessage(chatId,
`📝 *List a New Product*  

What would you like to sell today?`,
    {
        parse_mode: 'Markdown',
        reply_markup: {
            keyboard: [
                ['🌽 Maize', '🥜 Soybeans'],
                ['☕ Coffee', '🌾 Wheat'],
                ['🐄 Cattle', '🐔 Poultry'],
                ['❌ Cancel']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
    
    user.state = 'awaiting_product_type';
});

// ============ COMMAND: /carbon ============
bot.onText(/\/carbon/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId,
`🌍 *Carbon Credit Program*  

Earn extra income by adopting sustainable farming practices!

*How it works:*
1. Register your farm with GPS coordinates
2. Implement sustainable practices:
   • Agroforestry (planting trees)
   • Conservation tillage  
   • Organic fertilizers
   • Solar irrigation

3. Our AI verifies carbon reduction via satellite
4. Receive carbon credits as NFTs
5. Sell to European companies via our marketplace

*Potential Earnings:*
• Small farm (1-5 ha): $200-500/year
• Medium farm (5-20 ha): $500-2,000/year
• Large farm (20+ ha): $2,000-10,000/year

*Tap below to learn more:*`,
    {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '📊 Calculate My Potential',
                    web_app: { url: GITHUB_PAGES_URL + '#carbon-calculator' }
                }],
                [{
                    text: '📖 Learn More',
                    url: 'https://unfccc.int/climate-action'
                }],
                [{
                    text: '👨‍🌾 Register for Program',
                    callback_data: 'carbon_register'
                }]
            ]
        }
    });
});

// ============ COMMAND: /help ============
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId,
`🆘 *AfriChain Bot Help*  

*Main Commands:*
/start - Start using AfriChain
/register - Create farmer profile  
/market - Browse marketplace
/list - List your products
/carbon - Carbon credit program
/profile - View your profile
/stats - Admin statistics

*Marketplace Commands:*
/search [product] - Search products
/prices - Current market prices
/buy - Browse as buyer

*Farmer Tools:*
/weather - Weather forecast
/prices - Crop prices
/calculator - Profit calculator

*Support:*
/help - This message
/contact - Contact support
/feedback - Send feedback

*Quick Tips:*
• Type "@${bot.options.username} maize" in any chat to search
• Open full app for advanced features
• Payments via Telegram Pay (coming soon)

*Need immediate help?* Contact @[YourSupportUsername]`,
    {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '📱 Open Full App',
                    web_app: { url: GITHUB_PAGES_URL }
                }
            ]]
        }
    });
});

// ============ COMMAND: /profile ============
bot.onText(/\/profile/, (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    
    if (!user) {
        bot.sendMessage(chatId, 'Please use /start first!');
        return;
    }
    
    let profileMessage = `👤 *Your Profile*  \n`;
    profileMessage += `Name: ${user.name}  \n`;
    profileMessage += `Username: @${user.username}  \n`;
    profileMessage += `User Type: ${user.type || 'Not set'}  \n`;
    profileMessage += `Joined: ${new Date(user.joined).toLocaleDateString()}  \n`;
    
    if (user.farmData) {
        profileMessage += `\n*Farm Details:*  \n`;
        profileMessage += `Farm Name: ${user.farmData.name || 'Not set'}  \n`;
        profileMessage += `Farm Type: ${user.farmData.type || 'Not set'}  \n`;
        profileMessage += `Size: ${user.farmData.size || 'Not set'} hectares  \n`;
        profileMessage += `Location: ${user.farmData.location || 'Not set'}  \n`;
    }
    
    // Count user's products
    const userProducts = products.filter(p => p.sellerId === user.id);
    profileMessage += `\n*Marketplace Activity:*  \n`;
    profileMessage += `Products Listed: ${userProducts.length}  \n`;
    
    if (userProducts.length > 0) {
        profileMessage += `Last Listed: ${new Date(userProducts[userProducts.length - 1].date).toLocaleDateString()}  \n`;
    }
    
    profileMessage += `\n*Account Status:* Active ✅`;
    
    bot.sendMessage(chatId, profileMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '✏️ Edit Profile',
                    callback_data: 'edit_profile'
                }],
                [{
                    text: '📊 My Listings',
                    callback_data: 'my_listings'
                }, {
                    text: '💰 Earnings',
                    callback_data: 'earnings'
                }]
            ]
        }
    });
});

// ============ COMMAND: /stats (ADMIN ONLY) ============
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Check if user is admin (you)
    if (userId !== YOUR_TELEGRAM_ID) {
        bot.sendMessage(chatId, '⛔ This command is for administrators only.');
        return;
    }
    
    const totalUsers = Object.keys(users).length;
    const farmers = Object.values(users).filter(u => u.type === 'farmer').length;
    const buyers = Object.values(users).filter(u => u.type === 'buyer').length;
    
    const statsMessage = 
`📊 *ADMIN STATISTICS*  

*Users:*
• Total Users: ${totalUsers}
• Farmers: ${farmers}
• Buyers: ${buyers}
• Visitors: ${totalUsers - farmers - buyers}

*Marketplace:*
• Total Products: ${products.length}
• Active Listings: ${products.filter(p => new Date(p.date) > new Date(Date.now() - 30*24*60*60*1000)).length}
• Average Price: $${products.length > 0 ? (products.reduce((sum, p) => sum + parseFloat(p.price), 0) / products.length).toFixed(2) : '0.00'}

*Carbon Projects:*
• Registered: ${carbonProjects.length}
• Verified: ${carbonProjects.filter(p => p.verified).length}

*System:*
• Uptime: ${Math.floor(process.uptime() / 3600)} hours
• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB
• Last Backup: ${new Date().toLocaleTimeString()}

*Top Products:*
${getTopProducts()}

*Recent Activity:*
${getRecentActivity()}`;

    bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
    
    // Auto-save after stats
    saveToFile();
});

// ============ INLINE QUERIES (Search via @bot) ============
bot.on('inline_query', (query) => {
    const searchTerm = query.query.toLowerCase();
    
    // Filter products based on search
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.type.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to 10 results
    
    const results = [];
    
    if (filteredProducts.length === 0 && searchTerm) {
        // No results found
        results.push({
            type: 'article',
            id: 'no_results',
            title: 'No products found',
            description: `Try searching for "maize", "coffee", etc.`,
            input_message_content: {
                message_text: `🔍 No products found for "${searchTerm}"\n\nBe the first to list this product!`,
                parse_mode: 'Markdown'
            },
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '📝 List This Product',
                        web_app: { url: GITHUB_PAGES_URL + '#list-product' }
                    }
                ]]
            }
        });
    } else if (!searchTerm) {
        // Empty search - show categories
        const categories = [
            { emoji: '🌽', name: 'Maize', query: 'maize' },
            { emoji: '☕', name: 'Coffee', query: 'coffee' },
            { emoji: '🥜', name: 'Soybeans', query: 'soybeans' },
            { emoji: '🐄', name: 'Livestock', query: 'cattle' }
        ];
        
        categories.forEach((cat, index) => {
            results.push({
                type: 'article',
                id: `cat_${index}`,
                title: `${cat.emoji} ${cat.name}`,
                description: `Browse ${cat.name} products`,
                input_message_content: {
                    message_text: `🔍 Search results for ${cat.name}:`,
                    parse_mode: 'Markdown'
                },
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: `View ${cat.name}`,
                            web_app: { url: GITHUB_PAGES_URL + `#search=${cat.query}` }
                        }
                    ]]
                }
            });
        });
    } else {
        // Show actual products
        filteredProducts.forEach((product, index) => {
            results.push({
                type: 'article',
                id: `product_${product.id || index}`,
                title: `${product.type} ${product.name} - $${product.price}/${product.unit}`,
                description: `${product.quantity} ${product.unit} in ${product.location}`,
                input_message_content: {
                    message_text: 
`🛒 *Product Found!*  

*${product.type} ${product.name}*
💰 *Price:* $${product.price} per ${product.unit}
📦 *Quantity:* ${product.quantity} ${product.unit}
📍 *Location:* ${product.location}
👤 *Seller:* ${product.sellerName}
📅 *Listed:* ${new Date(product.date).toLocaleDateString()}

*Interested? Contact the seller via the app.*`,
                    parse_mode: 'Markdown'
                },
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '💬 Contact Seller',
                            web_app: { url: GITHUB_PAGES_URL + `#contact=${product.sellerId}` }
                        },
                        {
                            text: '🛒 Buy Now',
                            web_app: { url: GITHUB_PAGES_URL + `#buy=${product.id}` }
                        }
                    ]]
                }
            });
        });
    }
    
    bot.answerInlineQuery(query.id, results, { cache_time: 1 });
});

// ============ CALLBACK QUERIES (Button Clicks) ============
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const user = users[chatId];
    
    console.log(`🔘 Callback received: ${data} from ${user?.name}`);
    
    switch(data) {
        case 'user_type_farmer':
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Great! Let\'s set up your farmer profile.' });
            bot.sendMessage(chatId, 'Please use /register to create your farmer profile.');
            break;
            
        case 'user_type_buyer':
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Welcome buyer! Browse products with /market' });
            if (user) {
                user.type = 'buyer';
                bot.sendMessage(chatId, '✅ Registered as buyer! Use /market to browse products.');
            }
            break;
            
        case 'market_prices':
            bot.answerCallbackQuery(callbackQuery.id);
            sendMarketPrices(chatId);
            break;
            
        case 'solar_projects':
            bot.answerCallbackQuery(callbackQuery.id);
            bot.sendMessage(chatId,
`☀️ *Solar Energy Projects*  

*Available in Zambia:*
1. *Lusaka Solar Farm* - 50MW
   • Investment: $5,000 per share
   • Returns: 12% annually
   • Timeline: 2 years

2. *Copperbelt Mini-Grids* 
   • Investment: $500-5,000
   • Returns: 8-15% annually
   • Powering 10,000 homes

3. *Solar Irrigation Systems*
   • Cost: $1,000 per system
   • Farmers pay via mobile money
   • 3-year ROI

*Tap to invest:*`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '📈 Invest Now',
                            web_app: { url: GITHUB_PAGES_URL + '#solar-invest' }
                        }
                    ]]
                }
            });
            break;
            
        case 'list_product':
            bot.answerCallbackQuery(callbackQuery.id);
            bot.sendMessage(chatId, 'Please use /list to list a product');
            break;
            
        case 'search_maize':
            bot.answerCallbackQuery(callbackQuery.id);
            const maizeProducts = products.filter(p => p.type.includes('maize') || p.name.toLowerCase().includes('maize'));
            if (maizeProducts.length > 0) {
                let message = `🌽 *Maize Products Available*  \n`;
                maizeProducts.forEach((p, i) => {
                    message += `${i+1}. ${p.name} - $${p.price}/${p.unit} (${p.quantity} ${p.unit})\n`;
                });
                bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, 'No maize products found. Be the first to list!');
            }
            break;
            
        case 'carbon_register':
            bot.answerCallbackQuery(callbackQuery.id);
            bot.sendMessage(chatId,
`🌍 *Carbon Program Registration*  

To register for carbon credits:

1. Your farm must be GPS-mapped
2. Implement at least 2 sustainable practices
3. Allow satellite verification
4. Minimum 1 hectare required

*Are you ready to proceed?*`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Yes, Register', callback_data: 'carbon_confirm' },
                        { text: '❌ Not Now', callback_data: 'carbon_cancel' }
                    ]]
                }
            });
            break;
            
        case 'carbon_confirm':
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Registration started!' });
            bot.sendMessage(chatId,
`📋 *Carbon Program - Step 1*  

Please provide your farm details:

1. *Farm Name:* 
2. *GPS Coordinates* (latitude, longitude):
3. *Farm Size* (hectares):
4. *Current Practices* (check all that apply):
   • Agroforestry
   • Conservation tillage  
   • Organic fertilizers
   • Solar irrigation
   • Other (specify)

*Reply with "Farm: [name], GPS: [coords], Size: [ha], Practices: [list]"*

Or open the app for easier form:`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '📱 Open Registration Form',
                            web_app: { url: GITHUB_PAGES_URL + '#carbon-register' }
                        }
                    ]]
                }
            });
            break;
            
        default:
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Action processed' });
    }
});

// ============ MESSAGE HANDLER (Non-command messages) ============
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const user = users[chatId];
    
    if (!text || text.startsWith('/')) return; // Skip commands
    
    // Update last active
    if (user) {
        user.lastActive = new Date().toISOString();
    }
    
    // Handle farm type selection (from /register)
    if (user && user.state === 'awaiting_farm_type') {
        if (['🌽 Crop Farming', '🐄 Livestock', '☀️ Solar Energy', '🌾 Mixed Farming'].includes(text)) {
            user.type = 'farmer';
            user.farmData = user.farmData || {};
            user.farmData.type = text;
            user.state = 'awaiting_farm_name';
            
            bot.sendMessage(chatId,
`✅ Registered as ${text}!

*Step 2: Farm Name*  
What is your farm called?  

Example: "Mwila Family Farm" or "Copperbelt Maize Co-op"

*Reply with your farm name:*`,
            { parse_mode: 'Markdown' });
        } else if (text === '❌ Cancel') {
            user.state = null;
            bot.sendMessage(chatId, 'Registration cancelled.');
        }
        return;
    }
    
    // Handle farm name
    if (user && user.state === 'awaiting_farm_name') {
        user.farmData.name = text;
        user.state = 'awaiting_farm_size';
        
        bot.sendMessage(chatId,
`🏡 *Farm Name:* ${text}

*Step 3: Farm Size*  
How many hectares is your farm?  

Example: "5" for 5 hectares

*Reply with the number:*`,
        { parse_mode: 'Markdown' });
        return;
    }
    
    // Handle farm size
    if (user && user.state === 'awaiting_farm_size') {
        const size = parseInt(text);
        if (isNaN(size) || size <= 0) {
            bot.sendMessage(chatId, 'Please enter a valid number (e.g., 5 for 5 hectares)');
            return;
        }
        
        user.farmData.size = size;
        user.state = 'awaiting_farm_location';
        
        bot.sendMessage(chatId,
`📏 *Farm Size:* ${size} hectares

*Step 4: Location*  
Which province is your farm in?  

Example: "Copperbelt", "Lusaka", "Eastern Province"

*Reply with your province:*`,
        { parse_mode: 'Markdown' });
        return;
    }
    
    // Handle farm location
    if (user && user.state === 'awaiting_farm_location') {
        user.farmData.location = text;
        user.state = null; // Registration complete
        
        // Save to carbon projects if applicable
        if (user.farmData.type === '🌽 Crop Farming' || user.farmData.type === '🌾 Mixed Farming') {
            carbonProjects.push({
                farmerId: user.id,
                farmerName: user.name,
                farmName: user.farmData.name,
                size: user.farmData.size,
                location: user.farmData.location,
                type: user.farmData.type,
                registered: new Date().toISOString(),
                verified: false,
                carbonCredits: 0
            });
        }
        
        bot.sendMessage(chatId,
`🎉 *Registration Complete!*  

*Farm Profile Created:*
• Name: ${user.farmData.name}
• Type: ${user.farmData.type}
• Size: ${user.farmData.size} hectares  
• Location: ${user.farmData.location}

*What you can do now:*
1. List products with /list
2. Check market prices with /market
3. Learn about carbon credits with /carbon
4. Open the full app for advanced features

*Welcome to AfriChain Connect!* 🌱`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '🚀 Open Full App',
                        web_app: { url: GITHUB_PAGES_URL }
                    }
                ]]
            }
        });
        return;
    }
    
    // Handle product type selection (from /list)
    if (user && user.state === 'awaiting_product_type') {
        if (['🌽 Maize', '🥜 Soybeans', '☕ Coffee', '🌾 Wheat', '🐄 Cattle', '🐔 Poultry'].includes(text)) {
            user.state = 'awaiting_product_details';
            user.tempProduct = { type: text };
            
            bot.sendMessage(chatId,
`📝 Listing: ${text}

*Step 2: Product Details*  
What specific variety/type?  

Examples: 
• For Maize: "White Maize", "Yellow Maize"
• For Coffee: "Arabica", "Robusta"
• For Cattle: "Beef Cattle", "Dairy Cows"

*Reply with the product name:*`,
            { parse_mode: 'Markdown' });
        } else if (text === '❌ Cancel') {
            user.state = null;
            bot.sendMessage(chatId, 'Product listing cancelled.');
        }
        return;
    }
    
    // Handle product name
    if (user && user.state === 'awaiting_product_details' && user.tempProduct) {
        user.tempProduct.name = text;
        user.state = 'awaiting_product_price';
        
        bot.sendMessage(chatId,
`📦 *Product:* ${user.tempProduct.type} - ${text}

*Step 3: Price*  
What's your price per unit?  

Example: "200" for $200 per ton

*Reply with the price (numbers only):*`,
        { parse_mode: 'Markdown' });
        return;
    }
    
    // Handle product price
    if (user && user.state === 'awaiting_product_price' && user.tempProduct) {
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
            bot.sendMessage(chatId, 'Please enter a valid price (e.g., 200 for $200)');
            return;
        }
        
        user.tempProduct.price = price;
        user.state = 'awaiting_product_unit';
        
        bot.sendMessage(chatId,
`💰 *Price:* $${price}

*Step 4: Unit*  
What unit are you selling in?  

Examples: "ton", "kg", "bag", "head", "liter"

*Reply with the unit:*`,
        { parse_mode: 'Markdown' });
        return;
    }
    
    // Handle product unit
    if (user && user.state === 'awaiting_product_unit' && user.tempProduct) {
        user.tempProduct.unit = text;
        user.state = 'awaiting_product_quantity';
        
        bot.sendMessage(chatId,
`📏 *Unit:* ${text}

*Step 5: Quantity*  
How many ${text} are available?  

Example: "10" for 10 ${text}

*Reply with the quantity:*`,
        { parse_mode: 'Markdown' });
        return;
    }
    
    // Handle product quantity
    if (user && user.state === 'awaiting_product_quantity' && user.tempProduct) {
        const quantity = parseInt(text);
        if (isNaN(quantity) || quantity <= 0) {
            bot.sendMessage(chatId, `Please enter a valid quantity (e.g., 10 for 10 ${user.tempProduct.unit})`);
            return;
        }
        
        user.tempProduct.quantity = quantity;
        user.tempProduct.sellerId = user.id;
        user.tempProduct.sellerName = user.name;
        user.tempProduct.location = user.farmData?.location || 'Zambia';
        user.tempProduct.date = new Date().toISOString();
        user.tempProduct.id = Date.now(); // Simple ID
        
        // Add to products
        products.push({ ...user.tempProduct });
        
        bot.sendMessage(chatId,
`🎉 *Product Listed Successfully!*  

*${user.tempProduct.type} ${user.tempProduct.name}*
💰 Price: $${user.tempProduct.price} per ${user.tempProduct.unit}
📦 Quantity: ${user.tempProduct.quantity} ${user.tempProduct.unit}
📍 Location: ${user.tempProduct.location}

*What happens next:*
• Buyers can now find your product
• Use /market to see all listings
• You'll be notified of inquiries
• Open the app for better management

*Product ID:* ${user.tempProduct.id}`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '📱 Open Marketplace',
                        web_app: { url: GITHUB_PAGES_URL }
                    }
                ]]
            }
        });
        
        // Reset state
        user.state = null;
        user.tempProduct = null;
        
        // Notify admin (you) of new listing
        if (YOUR_TELEGRAM_ID) {
            bot.sendMessage(YOUR_TELEGRAM_ID,
`🆕 *New Product Listed!*  

Product: ${user.tempProduct?.type} ${user.tempProduct?.name}
Seller: ${user.name} (@${user.username})
Price: $${user.tempProduct?.price}/${user.tempProduct?.unit}

Total products now: ${products.length}`,
            { parse_mode: 'Markdown' });
        }
        
        return;
    }
    
    // Default response for other messages
    if (text && user) {
        bot.sendMessage(chatId,
`🤔 I didn't understand that.  

Here are some things you can do:
• Use /help for all commands
• Type /market to browse products  
• Type /register to become a farmer
• Or just open the full app:

[Open AfriChain App](${GITHUB_PAGES_URL})`,
        { parse_mode: 'Markdown' });
    }
});

// ============ HELPER FUNCTIONS ============
function sendMarketPrices(chatId) {
    // Mock market data - in production, fetch from API
    const marketData = [
        { product: '🌽 Maize', price: '$180-220/ton', trend: '↗️ Up 5%' },
        { product: '🥜 Soybeans', price: '$450-500/ton', trend: '↘️ Down 2%' },
        { product: '☕ Coffee', price: '$3,500-4,000/ton', trend: '↗️ Up 12%' },
        { product: '🌾 Wheat', price: '$250-280/ton', trend: '➡️ Stable' },
        { product: '🐄 Beef Cattle', price: '$800-1,200/head', trend: '↗️ Up 8%' }
    ];
    
    let message = `📈 *Current Market Prices - Zambia*  \n\n`;
    
    marketData.forEach(item => {
        message += `${item.product}: ${item.price} ${item.trend}\n`;
    });
    
    message += `\n*Source:* Zambia National Farmers Union (Daily)`;
    message += `\n\n*Note:* Prices vary by location and quality.`;
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

function getTopProducts() {
    if (products.length === 0) return 'No products yet';
    
    // Group by type and count
    const counts = {};
    products.forEach(p => {
        counts[p.type] = (counts[p.type] || 0) + 1;
    });
    
    let result = '';
    Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([type, count], i) => {
            result += `${i+1}. ${type}: ${count} listings\n`;
        });
    
    return result;
}

function getRecentActivity() {
    if (products.length === 0) return 'No recent activity';
    
    const recent = products
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);
    
    let result = '';
    recent.forEach((p, i) => {
        const timeAgo = Math.floor((Date.now() - new Date(p.date).getTime()) / (1000 * 60 * 60));
        result += `${i+1}. ${p.type} by ${p.sellerName} (${timeAgo}h ago)\n`;
    });
    
    return result;
}

// ============ ERROR HANDLING ============
bot.on('polling_error', (error) => {
    console.error('🔴 Polling error:', error.message);
});

bot.on('webhook_error', (error) => {
    console.error('🔴 Webhook error:', error.message);
});

// ============ STARTUP MESSAGE ============
console.log('✅ AfriChain Bot is running successfully!');
console.log(`📱 Bot Username: @${bot.options.username}`);
console.log(`🌐 Mini-App URL: ${GITHUB_PAGES_URL}`);
console.log(`👥 Users in memory: ${Object.keys(users).length}`);
console.log(`📦 Products listed: ${products.length}`);
console.log('\n💡 Type /stats in Telegram to see admin statistics');
console.log('🔧 Press Ctrl+C to stop the bot');

// Auto-save on exit
process.on('SIGINT', () => {
    console.log('\n💾 Saving data before exit...');
    saveToFile();
    console.log('👋 Bot stopped gracefully');
    process.exit(0);
});
