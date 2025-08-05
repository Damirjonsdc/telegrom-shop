<<<<<<< HEAD
const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');

const app = express();

// 🔹 Hardcode your token for testing (replace with your real token)
const bot = new Telegraf('7563280857:AAG4eiwp2wl4RyzV2j6e6EvlF37nMPobJjQ');

// 🔹 Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));


// 🔹 Generate a secure secret path for webhook
const secretPath = `/webhook/${bot.secretPathComponent()}`;

// 🔹 Set webhook for Telegram
bot.telegram.setWebhook(`https://telegrom-shop-production.up.railway.app${secretPath}`);

// 🔹 Express handles webhook requests from Telegram
app.use(bot.webhookCallback(secretPath));

// 🔹 Bot command example
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

// 🔹 Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web app running on http://localhost:${PORT}`);
});
=======
const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');

const app = express();

// 🔹 Hardcode your token for testing (replace with your real token)
const bot = new Telegraf('7563280857:AAG4eiwp2wl4RyzV2j6e6EvlF37nMPobJjQ');

// 🔹 Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 Generate a secure secret path for webhook
const secretPath = `/webhook/${bot.secretPathComponent()}`;

// 🔹 Set webhook for Telegram
bot.telegram.setWebhook(`https://telegrom-shop-production.up.railway.app${secretPath}`);

// 🔹 Express handles webhook requests from Telegram
app.use(bot.webhookCallback(secretPath));

// 🔹 Bot command example
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

// 🔹 Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web app running on http://localhost:${PORT}`);
});
>>>>>>> 07dbd8d0dccce596389a1688411bde744b98798f
