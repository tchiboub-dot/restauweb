BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  diet TEXT NOT NULL,
  price REAL NOT NULL,
  rating REAL NOT NULL DEFAULT 4.5,
  popular INTEGER NOT NULL DEFAULT 0,
  desc TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  allergen TEXT NOT NULL DEFAULT '—',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal REAL NOT NULL,
  shipping REAL NOT NULL,
  discount REAL NOT NULL,
  promo_code TEXT,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER NOT NULL,
  name_snapshot TEXT NOT NULL,
  unit_price REAL NOT NULL,
  qty INTEGER NOT NULL,
  line_total REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  people INTEGER NOT NULL,
  preference TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

COMMIT;