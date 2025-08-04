const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');

// ==== 1. SETUP BOT ====
const BOT_TOKEN = '7563280857:AAG4eiwp2wl4RyzV2j6e6EvlF37nMPobJjQ';
const bot = new Telegraf(BOT_TOKEN);

// ==== 2. WEB SERVER FOR MINI APP ====
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==== 3. TELEGRAM BOT ====
bot.start((ctx) => {
  ctx.reply('👋 Welcome to our Shop!', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🛍 Open Shop', web_app: { url: 'https://telegrom-shop-production.up.railway.app/' } }
        ]
      ]
    }
  });
});

// Start bot
bot.launch();
console.log('Bot is running...');

// Start local server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web app running on http://localhost:${PORT}`));
