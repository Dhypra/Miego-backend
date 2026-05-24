const express = require('express');
const router  = express.Router();
const { snap, core } = require('../config/midtrans');
const prisma  = require('../config/prisma');
const crypto  = require('crypto');

// =============================================
// POST /api/payment/create-transaction
// =============================================
router.post('/create-transaction', async (req, res) => {
  try {
    const { orderId, customer, table, items, subtotal, fee, total } = req.body;
    if (!orderId || !customer || !table || !items || !total)
      return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (existing) return res.json({ success: true, snapToken: existing.snapToken, orderId });

    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: Math.round(total) },
      customer_details: { first_name: customer, notes: `Meja: ${table}` },
      item_details: [
        ...items.map(i => ({ id: i.name.toLowerCase().replace(/\s+/g,'-'), price: Math.round(i.price), quantity: i.qty, name: i.name })),
        { id: 'service-fee', price: Math.round(fee), quantity: 1, name: 'Biaya Layanan' },
      ],
      enabled_payments: ['gopay','shopeepay','dana','ovo','bca_va','bni_va','bri_va','mandiri_bill','qris'],
      callbacks: {
        finish: `${process.env.APP_URL}/payment/finish`,
        error:  `${process.env.APP_URL}/payment/error`,
        pending:`${process.env.APP_URL}/payment/pending`,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    await prisma.order.create({
      data: {
        id: orderId, customerName: customer, tableNumber: table,
        subtotal: Math.round(subtotal), fee: Math.round(fee), total: Math.round(total),
        snapToken: transaction.token, payStatus: 'pending', orderStatus: 'new',
        items: { create: items.map(i => ({ name: i.name, emoji: i.emoji||'🍜', qty: i.qty, price: Math.round(i.price) })) },
      },
    });

    console.log(`✅ Order ${orderId} disimpan ke Supabase`);
    res.json({ success: true, snapToken: transaction.token, redirectUrl: transaction.redirect_url, orderId });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat transaksi', error: error.message });
  }
});

// =============================================
// GET /api/payment/status/:orderId
// =============================================
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const statusResponse = await core.transaction.status(orderId);
    const payStatus = mapStatus(statusResponse.transaction_status);
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { payStatus, paymentType: statusResponse.payment_type, ...(payStatus==='paid' && { orderStatus:'process' }) },
    });
    res.json({ success: true, orderId, transactionStatus: statusResponse.transaction_status, paymentType: statusResponse.payment_type, grossAmount: statusResponse.gross_amount, payStatus: order.payStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal cek status', error: error.message });
  }
});

// =============================================
// POST /api/payment/notification (webhook Midtrans)
// =============================================
router.post('/notification', async (req, res) => {
  try {
    const n = req.body;
    const sig = crypto.createHash('sha512').update(n.order_id + n.status_code + n.gross_amount + process.env.MIDTRANS_SERVER_KEY).digest('hex');
    if (sig !== n.signature_key) return res.status(403).json({ message: 'Invalid signature' });

    const s = await core.transaction.notification(n);
    const ts = s.transaction_status, fs = s.fraud_status;
    let payStatus = 'pending', orderStatus;
    if ((ts==='capture' && fs==='accept') || ts==='settlement') { payStatus='paid'; orderStatus='process'; }
    else if (['cancel','deny','expire'].includes(ts)) { payStatus='failed'; orderStatus='cancel'; }

    await prisma.order.update({ where: { id: n.order_id }, data: { payStatus, paymentType: s.payment_type, ...(orderStatus && { orderStatus }) } });
    await prisma.payment.upsert({
      where: { orderId: n.order_id },
      create: { orderId: n.order_id, midtransOrderId: s.order_id, transactionStatus: s.transaction_status, paymentType: s.payment_type, grossAmount: s.gross_amount, fraudStatus: s.fraud_status, paidAt: payStatus==='paid' ? new Date() : null },
      update: { transactionStatus: s.transaction_status, paymentType: s.payment_type, paidAt: payStatus==='paid' ? new Date() : null },
    });

    console.log(`✅ Webhook: ${n.order_id} → ${payStatus}`);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ message: 'Notification processing failed' });
  }
});

// =============================================
// GET /api/payment/orders
// =============================================
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ include: { items: true, payment: true }, orderBy: { createdAt: 'desc' } });
    const formatted = orders.map(o => ({
      id: o.id, orderId: o.id, customer: o.customerName, table: o.tableNumber,
      items: o.items.map(i => ({ name: i.name, emoji: i.emoji, qty: i.qty, price: i.price })),
      subtotal: o.subtotal, fee: o.fee, total: o.total,
      payStatus: o.payStatus, orderStatus: o.orderStatus, status: o.orderStatus,
      paymentType: o.paymentType,
      time: o.createdAt.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }),
      createdAt: o.createdAt.toISOString(),
    }));
    res.json({ success: true, orders: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data', error: error.message });
  }
});

// =============================================
// PATCH /api/payment/orders/:orderId/status
// =============================================
router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;
    if (!['new','process','done','cancel'].includes(orderStatus))
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    const order = await prisma.order.update({ where: { id: orderId }, data: { orderStatus }, include: { items: true } });
    console.log(`✅ Order ${orderId} → ${orderStatus}`);
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal update status', error: error.message });
  }
});

// =============================================
// GET /api/payment/menu
// =============================================
router.get('/menu', async (req, res) => {
  try {
    const menu = await prisma.menuItem.findMany({ where: { active: true }, orderBy: { category: 'asc' } });
    res.json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil menu' });
  }
});

// =============================================
// GET /api/payment/stats
// =============================================
router.get('/stats', async (req, res) => {
  try {
    const [totalOrders, paidOrders, queueOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ where: { payStatus: 'paid' }, _sum: { total: true } }),
      prisma.order.count({ where: { orderStatus: { in: ['new','process'] } } }),
    ]);
    res.json({ success: true, totalOrders, totalRevenue: paidOrders._sum.total||0, queueCount: queueOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik' });
  }
});

function mapStatus(s) {
  return { capture:'paid', settlement:'paid', pending:'pending', cancel:'failed', deny:'failed', expire:'failed' }[s] || 'pending';
}

module.exports = router;
