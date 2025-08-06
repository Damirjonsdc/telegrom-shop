require('dotenv').config();
const { Telegraf } = require('telegraf');
const { Pool } = require('pg');

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Подключение к PostgreSQL
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

// Команда /start для клиента
bot.start(async (ctx) => {
  const products = await pool.query('SELECT * FROM products ORDER BY id DESC LIMIT 5');
  if (products.rows.length === 0) {
    return ctx.reply('Магазин пока пуст. Загляните позже!');
  }

  for (const p of products.rows) {
    await ctx.replyWithPhoto(p.photo || 'https://via.placeholder.com/300', {
      caption: `${p.name}\nЦена: ${p.price}`,
      reply_markup: {
        inline_keyboard: [[{ text: '🛒 Купить', callback_data: `buy_${p.id}` }]]
      }
    });
  }
});

// Покупка
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
  ctx.reply('Отправь фото товара с подписью: Название | Цена | Ссылка (необязательно)');
});

// Прием фото от админа
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

// --- ВАЖНО: запускаем только POLLING ---
bot.launch();
console.log('🤖 Bot started via polling');
