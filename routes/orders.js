const express = require('express');
const router = express.Router();
const { orders } = require('../config/db');

// GET /api/orders — ambil semua pesanan
router.get('/', (req, res) => {
  const allOrders = Array.from(orders.values()).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ success: true, data: allOrders });
});

// GET /api/orders/:id — detail pesanan
router.get('/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
  res.json({ success: true, data: order });
});

// POST /api/orders — buat pesanan baru
router.post('/', (req, res) => {
  const { customer, table, items } = req.body;

  if (!customer || !table || !items || !items.length) {
    return res.status(400).json({ success: false, message: 'Data pesanan tidak lengkap' });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const fee = Math.round(subtotal * 0.02);
  const total = subtotal + fee;

  const orderId = 'MGO-' + Date.now();
  const order = {
    id: orderId,
    customer,
    table,
    items,
    subtotal,
    fee,
    total,
    status: 'new',        // new | process | done | cancel
    payStatus: 'pending', // pending | paid | failed
    paymentMethod: null,
    createdAt: new Date().toISOString(),
  };

  orders.set(orderId, order);
  res.status(201).json({ success: true, data: order });
});

// PATCH /api/orders/:id/status — update status dapur
router.patch('/:id/status', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

  const { status } = req.body;
  const valid = ['new', 'process', 'done', 'cancel'];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: 'Status tidak valid' });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  orders.set(order.id, order);

  res.json({ success: true, data: order });
});

module.exports = router;
