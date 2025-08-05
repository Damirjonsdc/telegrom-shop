const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const app = express();

// ------------------ CONFIG ------------------
// ✅ Hardcode your token for now (replace with your real one)
const bot = new Telegraf('7563280857:AAG4eiwp2wl4RyzV2j6e6EvlF37nMPobJjQ');

// ✅ Serve static files (public folder)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Always serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Webhook setup
const secretPath = `/webhook/${bot.secretPathComponent()}`;
bot.telegram.setWebhook(`https://telegrom-shop-production.up.railway.app${secretPath}`);
app.use(bot.webhookCallback(secretPath));

// ------------------ BOT COMMANDS ------------------
bot.start((ctx) => {
  ctx.reply('👋 Welcome to our Telegram Shop!', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🛍 Open Shop', web_app: { url: 'https://telegrom-shop-production.up.railway.app' } }
        ]
      ]
    }
  });
});

bot.hears(/hello/i, (ctx) => ctx.reply('Hey! Type /start to open the shop.'));

// ------------------ START EXPRESS ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Web app running on http://localhost:${PORT}`);
});
