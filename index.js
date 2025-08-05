const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN); // Use your bot token

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// Telegram Webhook
const secretPath = `/webhook/${bot.secretPathComponent()}`;
bot.telegram.setWebhook(`https://telegrom-shop-production.up.railway.app${secretPath}`);
app.use(bot.webhookCallback(secretPath));

// Example start message
bot.start((ctx) => {
  ctx.reply('👋 Welcome to our Shop!', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🛍 Open Shop', web_app: { url: 'https://telegrom-shop-production.up.railway.app' } }
        ]
      ]
    }
  });
});

// Start Express server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Web app running on http://localhost:${8080}`);
});
