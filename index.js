require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const { Pool } = require('pg');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Подключение к PostgreSQL (используем DATABASE_PUBLIC_URL от Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Создаем таблицу, если ее нет
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      photo TEXT,
      link TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

// /start для клиентов
bot.start(async (ctx) => {
  const products = await pool.query('SELECT * FROM products ORDER BY id DESC LIMIT 5');

  if (products.rows.length === 0) {
    return ctx.reply('🛍 Магазин пока пуст. Загляните позже!');
  }

  for (const p of products.rows) {
    await ctx.replyWithPhoto(p.photo || 'https://via.placeholder.com/300', {
      caption: `${p.name}\n💵 Цена: ${p.price}${p.link ? `\n🔗 ${p.link}` : ''}`,
      reply_markup: {
        inline_keyboard: [[{ text: '🛒 Купить', callback_data: `buy_${p.id}` }]]
      }
    });
  }
});

// Обработка покупки
bot.action(/buy_(\d+)/, async (ctx) => {
  const productId = ctx.match[1];
  const product = await pool.query('SELECT * FROM products WHERE id=$1', [productId]);

  if (product.rows.length > 0) {
    const p = product.rows[0];
    await bot.telegram.sendMessage(
      process.env.ADMIN_ID,
      `🛒 Новый заказ!\nТовар: ${p.name}\nОт: @${ctx.from.username || ctx.from.id}`
    );
    ctx.reply('✅ Заказ отправлен администратору. С вами свяжутся.');
  }
});

// Команда /add для админа
bot.command('add', async (ctx) => {
  if (ctx.from.id.toString() !== process.env.ADMIN_ID) return;
  ctx.reply('📸 Отправь фото товара с подписью:\nНазвание | Цена | Ссылка (необязательно)');
});

// Прием фото для добавления товара
bot.on('photo', async (ctx) => {
  if (ctx.from.id.toString() !== process.env.ADMIN_ID) return;

  const caption = ctx.message.caption;
  if (!caption) return ctx.reply('Добавь подпись: Название | Цена | Ссылка (необязательно)');

  const [name, price, link] = caption.split('|').map(s => s.trim());
  const fileId = ctx.message.photo.pop().file_id;
  const file = await ctx.telegram.getFileLink(fileId);

  await pool.query(
    'INSERT INTO products (name, price, link, photo) VALUES ($1, $2, $3, $4)',
    [name, price, link || null, file.href]
  );

  ctx.reply(`✅ Товар "${name}" добавлен в магазин!`);
});

// Настройка вебхука для Railway
const secretPath = `/webhook/${bot.secretPathComponent()}`;
app.use(bot.webhookCallback(secretPath));

const PORT = process.env.PORT || 3000;
const RAILWAY_URL = process.env.RAILWAY_URL || process.env.RAILWAY_STATIC_URL;

app.listen(PORT, async () => {
  console.log(`Server running on ${PORT}`);

  if (RAILWAY_URL) {
    const webhookUrl = `https://${RAILWAY_URL}${secretPath}`;
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Webhook set to ${webhookUrl}`);
  }
});
