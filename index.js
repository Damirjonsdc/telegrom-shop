const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { Telegraf, Markup } = require('telegraf');

const app = express();

// ------------------- CONFIG -------------------
const BOT_TOKEN = '7563280857:AAG4eiwp2wl4RyzV2j6e6EvlF37nMPobJjQ'; // <-- put your token
const ADMIN_ID = 250645896; // <-- your Telegram ID
const bot = new Telegraf(BOT_TOKEN);

const PRODUCTS_FILE = path.join(__dirname, 'products.json');
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeJsonSync(PRODUCTS_FILE, []);

const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories'];

// ------------------- EXPRESS -------------------
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Webhook for Railway
const secretPath = `/webhook/${bot.secretPathComponent()}`;
bot.telegram.setWebhook(`https://telegrom-shop-production.up.railway.app${secretPath}`);
app.use(bot.webhookCallback(secretPath));

// ------------------- BOT COMMANDS -------------------
let adminState = {}; // Track where admin is in the product-adding flow

// Start Command
bot.start((ctx) => {
  ctx.reply(
    '👋 Welcome to our Telegram Shop! Choose a category:',
    Markup.inlineKeyboard([
      [Markup.button.callback('👕 Men', 'cat_Men'), Markup.button.callback('👗 Women', 'cat_Women')],
      [Markup.button.callback('🧢 Kids', 'cat_Kids'), Markup.button.callback('🎒 Accessories', 'cat_Accessories')]
    ])
  );
});

// Admin Add Command
bot.command('add', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ You are not authorized.');
  adminState[ctx.from.id] = { step: 1, product: {} };
  ctx.reply('📂 Choose a category for the product:', Markup.keyboard(CATEGORIES).oneTime().resize());
});

// Handle Category Selection in Admin Flow
bot.hears(CATEGORIES, (ctx) => {
  if (!adminState[ctx.from.id] || adminState[ctx.from.id].step !== 1) return;
  adminState[ctx.from.id].product.category = ctx.message.text;
  adminState[ctx.from.id].step = 2;
  ctx.reply('📸 Send the product image');
});

// Handle Photo Upload
bot.on('photo', async (ctx) => {
  if (!adminState[ctx.from.id] || adminState[ctx.from.id].step !== 2) return;
  const fileId = ctx.message.photo.pop().file_id;
  adminState[ctx.from.id].product.image = fileId;
  adminState[ctx.from.id].step = 3;
  ctx.reply('💰 Send product name and price, e.g., `Nike Air Zoom — $120`', { parse_mode: 'Markdown' });
});

// Handle Name & Price
bot.hears(/.+—.+/i, (ctx) => {
  if (!adminState[ctx.from.id] || adminState[ctx.from.id].step !== 3) return;
  adminState[ctx.from.id].product.name = ctx.message.text.split('—')[0].trim();
  adminState[ctx.from.id].product.price = ctx.message.text.split('—')[1].trim();
  adminState[ctx.from.id].step = 4;
  ctx.reply('🔗 Send product link (https://...)');
});

// Handle Link & Save Product
bot.hears(/https?:\/\/\S+/i, async (ctx) => {
  if (!adminState[ctx.from.id] || adminState[ctx.from.id].step !== 4) return;
  adminState[ctx.from.id].product.link = ctx.message.text;

  // Save to products.json
  const products = await fs.readJson(PRODUCTS_FILE);
  products.push(adminState[ctx.from.id].product);
  await fs.writeJson(PRODUCTS_FILE, products, { spaces: 2 });

  ctx.reply('✅ Product added successfully!');
  delete adminState[ctx.from.id];
});

// ------------------- SHOW PRODUCTS -------------------
bot.action(/cat_.+/, async (ctx) => {
  const category = ctx.callbackQuery.data.split('_')[1];
  const products = await fs.readJson(PRODUCTS_FILE);
  const items = products.filter((p) => p.category === category);

  if (!items.length) return ctx.reply('⚠️ No products in this category yet.');

  for (const item of items) {
    await ctx.replyWithPhoto(item.image, {
      caption: `${item.name}\n💰 Price: ${item.price}`,
      reply_markup: {
        inline_keyboard: [[{ text: '🛒 Buy', url: item.link }]]
      }
    });
  }
});

// ------------------- START EXPRESS -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Web app running on http://localhost:${PORT}`);
});
