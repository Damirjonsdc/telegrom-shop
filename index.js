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
let adminState = {}; // Track where admin is in the product-adding flow

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

// Admin Add Command
bot.command('add', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ Вы не зарегестривованы.');
  adminState[ctx.from.id] = { step: 1, product: {} };
  ctx.reply('📂 Выберите категорию товаров:', Markup.keyboard(CATEGORIES).oneTime().resize());
});

// Handle Category Selection in Admin Flow
bot.hears(CATEGORIES, (ctx) => {
  if (!adminState[ctx.from.id] || adminState[ctx.from.id].step !== 1) return;
  adminState[ctx.from.id].product.category = ctx.message.text;
  adminState[ctx.from.id].step = 2;
  ctx.reply('📸 Отправьте фото товаров:');
});

// Handle Photo Upload
bot.on('фото', async (ctx) => {
  if (!adminState[ctx.from.id] || adminState[ctx.from.id].step !== 2) return;
  const fileId = ctx.message.photo.pop().file_id;
  adminState[ctx.from.id].product.image = fileId;
  adminState[ctx.from.id].step = 3;
  ctx.reply('💰 Отправите название и цену товара, н.р., `Nike Air Zoom — $120`', { parse_mode: 'Markdown' });
});

// Handle Name & Price
bot.hears(/.+—.+/i, (ctx) => {
  if (!adminState[ctx.from.id] || adminState[ctx.from.id].step !== 3) return;
  adminState[ctx.from.id].product.name = ctx.message.text.split('—')[0].trim();
  adminState[ctx.from.id].product.price = ctx.message.text.split('—')[1].trim();
  adminState[ctx.from.id].step = 4;
  ctx.reply('🔗 Отправьте ссылку на товар (https://...)');
});

// Handle Link & Save Product
bot.hears(/https?:\/\/\S+/i, async (ctx) => {
  if (!adminState[ctx.from.id] || adminState[ctx.from.id].step !== 4) return;
  adminState[ctx.from.id].product.link = ctx.message.text;

  // Save to products.json
  const products = await fs.readJson(PRODUCTS_FILE);
  products.push(adminState[ctx.from.id].product);
  await fs.writeJson(PRODUCTS_FILE, products, { spaces: 2 });

  ctx.reply('✅ Товар добавлен!');
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
