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

const CATEGORIES = ['Мужчины', 'Женщины', 'Дети', 'Аксессуары'];

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

// Start Command
bot.start((ctx) => {
  ctx.reply(
    '👋 Добро пожаловать!Выберите категорию:',
    Markup.inlineKeyboard([
      [Markup.button.callback('👕 Мужчины', 'cat_Мужчины'), Markup.button.callback('👗 Женщины', 'cat_Женщины')],
      [Markup.button.callback('🧢 Дети', 'cat_Дети'), Markup.button.callback('🎒 Аксессуары', 'cat_Аксессуары')]
    ])
  );
});

let adminState = {}; // temporary memory

// Admin command to start adding product
bot.command('add', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ You are not authorized.');
  adminState[ctx.from.id] = { step: 1, product: {} };
  ctx.reply('📂 Choose a category for the product:', Markup.keyboard(CATEGORIES).oneTime().resize());
});

// Handle category
bot.hears(CATEGORIES, (ctx) => {
  const state = adminState[ctx.from.id];
  if (!state || state.step !== 1) return;
  state.product.category = ctx.message.text;
  state.step = 2;
  ctx.reply('📸 Send the product image');
});

// Handle image
bot.on('photo', async (ctx) => {
  const state = adminState[ctx.from.id];
  if (!state || state.step !== 2) return;
  const fileId = ctx.message.photo.pop().file_id;
  state.product.image = fileId;
  state.step = 3;
  ctx.reply('💰 Send product name and price like: `Nike Air Zoom — $120`', { parse_mode: 'Markdown' });
});

// Handle name + price
bot.hears(/.+[-—].+/i, (ctx) => {
  const state = adminState[ctx.from.id];
  if (!state || state.step !== 3) return;
  const [name, price] = ctx.message.text.split(/[-—]/).map(s => s.trim());
  state.product.name = name;
  state.product.price = price;
  state.step = 4;
  ctx.reply('🔗 Send product link or type `skip`');
});

// Handle link or skip
bot.hears(/https?:\/\/\S+|skip/i, async (ctx) => {
  const state = adminState[ctx.from.id];
  if (!state || state.step !== 4) return;

  state.product.link = ctx.message.text.toLowerCase() === 'skip' ? null : ctx.message.text;

  // Save to file
  const products = await fs.readJson(PRODUCTS_FILE);
  products.push(state.product);
  await fs.writeJson(PRODUCTS_FILE, products, { spaces: 2 });

  ctx.reply('✅ Product added successfully!');
  delete adminState[ctx.from.id];
});

// ------------------- SHOW PRODUCTS -------------------
bot.action(/cat_.+/, async (ctx) => {
  const category = ctx.callbackQuery.data.split('_')[1];
  const products = await fs.readJson(PRODUCTS_FILE);
  const items = products.filter((p) => p.category === category);

  if (!items.length) return ctx.reply('⚠️ Тут ничего.');

  for (const item of items) {
    await ctx.replyWithPhoto(item.image, {
      caption: `${item.name}\n💰 Цена: ${item.price}`,
      reply_markup: {
        inline_keyboard: [[
          { text: '🛒 Купить', callback_data: `Купить_${item.name}` }
        ]]
      }
    });
  }
});

// ------------------- HANDLE BUY BUTTON -------------------
bot.action(/Купить_.+/, (ctx) => {
  const productName = ctx.callbackQuery.data.replace('Купить_', '');
  
  // Notify admin
  bot.telegram.sendMessage(
    ADMIN_ID,
    `🛒 New order!\nProduct: ${productName}\nFrom: @${ctx.from.username || ctx.from.id}`
  );
  
  ctx.reply('✅ Ваш запрос был отправлен в магазин. Менеджер скоро с вами свяжется.');
});

// ------------------- START EXPRESS -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Web app running on http://localhost:${PORT}`);
});
