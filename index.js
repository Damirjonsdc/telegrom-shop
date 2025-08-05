const { Telegraf, Markup } = require('telegraf');
const db = require('./db');

const BOT_TOKEN = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // смените пароль
const bot = new Telegraf(BOT_TOKEN);

// Сессии для админа (чтобы помнить, что он добавляет товар)
let adminSessions = {};

// Помощники
function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE telegram_id=?').get(id);
}

function addUser(id, name, phone) {
  db.prepare('INSERT OR IGNORE INTO users (telegram_id,name,phone) VALUES (?,?,?)')
    .run(id, name, phone);
}

function addProduct(category, name, price, photo, size, link) {
  db.prepare('INSERT INTO products (category,name,price,photo,size,link) VALUES (?,?,?,?,?,?)')
    .run(category, name, price, photo, size, link);
}

function getProducts(category) {
  return db.prepare('SELECT * FROM products WHERE category=?').all(category);
}

function deleteProduct(id) {
  db.prepare('DELETE FROM products WHERE id=?').run(id);
}

// Старт
bot.start((ctx) => {
  const user = getUser(ctx.from.id);
  if (!user) {
    ctx.session = { step: 'name' };
    ctx.reply('Добро пожаловать! Введите ваше имя:');
  } else {
    showMenu(ctx, user);
  }
});

// Обработка текстов
bot.on('text', (ctx) => {
  const user = getUser(ctx.from.id);

  // Регистрация
  if (ctx.session && ctx.session.step === 'name') {
    ctx.session.name = ctx.message.text;
    ctx.session.step = 'phone';
    ctx.reply('Введите ваш номер телефона:');
    return;
  }
  if (ctx.session && ctx.session.step === 'phone') {
    addUser(ctx.from.id, ctx.session.name, ctx.message.text);
    ctx.session = null;
    ctx.reply('✅ Регистрация завершена!');
    showMenu(ctx, getUser(ctx.from.id));
    return;
  }

  // Логин в админку
  if (ctx.session && ctx.session.step === 'admin_login') {
    if (ctx.message.text === ADMIN_PASSWORD) {
      db.prepare('UPDATE users SET is_admin=1 WHERE telegram_id=?').run(ctx.from.id);
      ctx.session = null;
      ctx.reply('✅ Доступ администратора предоставлен!');
      showMenu(ctx, getUser(ctx.from.id));
    } else {
      ctx.reply('❌ Неверный пароль');
    }
    return;
  }

  // Админ добавляет товар
  const adminSession = adminSessions[ctx.from.id];
  if (adminSession) {
    if (adminSession.step === 'name') {
      adminSession.name = ctx.message.text;
      adminSession.step = 'price';
      ctx.reply('Введите цену товара:');
    } else if (adminSession.step === 'price') {
      adminSession.price = parseFloat(ctx.message.text);
      adminSession.step = 'size';
      ctx.reply('Введите размер или описание товара:');
    } else if (adminSession.step === 'size') {
      adminSession.size = ctx.message.text;
      adminSession.step = 'link';
      ctx.reply('Введите ссылку на товар:');
    } else if (adminSession.step === 'link') {
      adminSession.link = ctx.message.text;
      addProduct(adminSession.category, adminSession.name, adminSession.price, adminSession.photo, adminSession.size, adminSession.link);
      delete adminSessions[ctx.from.id];
      ctx.reply('✅ Товар успешно добавлен!');
    }
  }
});

// Команда для входа в админку
bot.command('admin', (ctx) => {
  ctx.session = { step: 'admin_login' };
  ctx.reply('Введите пароль администратора:');
});

// Главное меню
function showMenu(ctx, user) {
  if (user.is_admin) {
    ctx.reply('Панель администратора:', Markup.keyboard([
      ['➕ Добавить товар','📦 Список товаров'],
      ['🗑 Удалить товар','🛒 Заказы']
    ]).resize());
  } else {
    ctx.reply('Выберите категорию:', Markup.keyboard([
      ['👟 Мужчины','👠 Женщины'],
      ['🧢 Дети','🎒 Аксессуары']
    ]).resize());
  }
}

// Приём фото от админа для товара
bot.on('photo', (ctx) => {
  const user = getUser(ctx.from.id);
  if (!user || !user.is_admin) return;

  const fileId = ctx.message.photo.pop().file_id;

  adminSessions[ctx.from.id] = { step: 'name', photo: fileId, category: 'Мужчины' }; 
  ctx.reply('Введите название товара:');
});

// Покупка товара (пример)
bot.action(/buy_.+/, (ctx) => {
  const productId = ctx.callbackQuery.data.replace('buy_', '');
  const user = getUser(ctx.from.id);

  db.prepare('INSERT INTO orders (user_id, product_id) VALUES (?, ?)').run(user.id, productId);
  ctx.reply('✅ Ваша заявка отправлена, администратор свяжется с вами!');
});

bot.launch();
console.log('Бот запущен...');
