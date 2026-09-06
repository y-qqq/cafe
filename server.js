const express = require('express');
const path = require('path');
const { getMenu } = require('./menu');
const { priceOrder, OrderValidationError } = require('./pricing');
const { generatePaymentQrDataUrl } = require('./payment');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'admin123';
const CAFE_NAME = process.env.CAFE_NAME || 'The Corner Cafe';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAdmin(req, res, next) {
  const passcode = req.get('x-admin-passcode') || req.query.passcode;
  if (passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'Invalid passcode.' });
  }
  next();
}

app.get('/api/menu', (req, res) => {
  res.json({ cafeName: CAFE_NAME, menu: getMenu() });
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, customerPhone, note, items } = req.body || {};

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!customerPhone || !customerPhone.trim()) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const { lines, total } = priceOrder(items);

    const order = db.insertOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      note: (note || '').trim(),
      items: lines,
      total,
    });

    const { dataUrl } = await generatePaymentQrDataUrl({
      orderNumber: order.orderNumber,
      total: order.total,
      payeeName: CAFE_NAME,
    });

    res.status(201).json({ order, paymentQr: dataUrl });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong placing your order.' });
  }
});

app.get('/api/orders/:orderNumber', async (req, res) => {
  const order = db.getOrderByNumber(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const { dataUrl } = await generatePaymentQrDataUrl({
    orderNumber: order.orderNumber,
    total: order.total,
    payeeName: CAFE_NAME,
  });
  res.json({ order, paymentQr: dataUrl });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const { status, since } = req.query;
  res.json({ orders: db.listOrders({ status, since }) });
});

app.patch('/api/admin/orders/:orderNumber', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  try {
    const order = db.updateStatus(req.params.orderNumber, status);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/orders-export.csv', requireAdmin, (req, res) => {
  const orders = db.listOrders({ status: req.query.status });
  const header = ['Order #', 'Date/Time', 'Customer', 'Phone', 'Items', 'Total', 'Status', 'Note'];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.createdAt,
    o.customerName,
    o.customerPhone,
    o.items
      .map((l) => `${l.qty}x ${l.name}${l.syrups.length ? ' (' + l.syrups.map((s) => s.name).join(', ') + ')' : ''}`)
      .join('; '),
    o.total.toFixed(2),
    o.status,
    o.note || '',
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
  res.send(csv);
});

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

app.listen(PORT, () => {
  console.log(`${CAFE_NAME} preorder server running at http://localhost:${PORT}`);
});
