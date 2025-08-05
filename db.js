const Database = require('better-sqlite3');
const db = new Database('shop.db');

// Таблица пользователей
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER UNIQUE,
  name TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT 0
)
`).run();

// Таблица товаров
db.prepare(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT,
  name TEXT,
  price REAL,
  photo TEXT,
  size TEXT,
  link TEXT
)
`).run();

// Таблица заказов
db.prepare(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  product_id INTEGER,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`).run();

module.exports = db;
