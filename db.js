const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'orders.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    note TEXT,
    items_json TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

function insertOrder({ customerName, customerPhone, note, items, total }) {
  const insert = db.prepare(`
    INSERT INTO orders (order_number, customer_name, customer_phone, note, items_json, total)
    VALUES (@order_number, @customer_name, @customer_phone, @note, @items_json, @total)
  `);

  const tx = db.transaction(() => {
    // Reserve the row first so the human-friendly order number can be derived from its id.
    const placeholderNumber = `TMP-${Date.now()}`;
    const info = insert.run({
      order_number: placeholderNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      note: note || '',
      items_json: JSON.stringify(items),
      total,
    });
    const orderNumber = `C-${String(info.lastInsertRowid).padStart(4, '0')}`;
    db.prepare('UPDATE orders SET order_number = ? WHERE id = ?').run(orderNumber, info.lastInsertRowid);
    return getOrderById(info.lastInsertRowid);
  });

  return tx();
}

function getOrderById(id) {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  return row ? deserialize(row) : null;
}

function getOrderByNumber(orderNumber) {
  const row = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
  return row ? deserialize(row) : null;
}

function listOrders({ status, since } = {}) {
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (since) {
    query += ' AND created_at >= ?';
    params.push(since);
  }
  query += ' ORDER BY id DESC';
  return db.prepare(query).all(...params).map(deserialize);
}

function updateStatus(orderNumber, status) {
  if (!STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const info = db.prepare('UPDATE orders SET status = ? WHERE order_number = ?').run(status, orderNumber);
  if (info.changes === 0) return null;
  return getOrderByNumber(orderNumber);
}

function deserialize(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    note: row.note,
    items: JSON.parse(row.items_json),
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
  };
}

module.exports = {
  insertOrder,
  getOrderById,
  getOrderByNumber,
  listOrders,
  updateStatus,
  STATUSES,
};
