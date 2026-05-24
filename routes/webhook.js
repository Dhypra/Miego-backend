const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { orders, payments } = require('../config/db');

// POST /webhook/midtrans — terima notifikasi dari Midtrans
router.post('/midtrans', (req, res) => {
  try {
    const notification = JSON.parse(req.body.toString());
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
    } = notification;

    // ─── Verifikasi Signature ────────────────────────────────────────────────
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const expectedSig = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex');

    if (signature_key !== expectedSig) {
      console.warn('Invalid signature for order:', order_id);
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }

    // ─── Update Status Pesanan ───────────────────────────────────────────────
    const order = orders.get(order_id);
    if (!order) {
      console.warn('Order not found:', order_id);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isPaid =
      transaction_status === 'capture' && fraud_status === 'accept' ||
      transaction_status === 'settlement';

    const isFailed =
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire';

    if (isPaid) {
      order.payStatus = 'paid';
      order.paymentMethod = payment_type;
      order.status = order.status === 'new' ? 'process' : order.status;
      order.paidAt = new Date().toISOString();
    } else if (isFailed) {
      order.payStatus = 'failed';
    }

    order.updatedAt = new Date().toISOString();
    orders.set(order_id, order);

    // Update payment record juga
    const payment = payments.get(order_id);
    if (payment) {
      payment.status = isPaid ? 'paid' : isFailed ? 'failed' : 'pending';
      payment.updatedAt = new Date().toISOString();
      payments.set(order_id, payment);
    }

    console.log(`Webhook: Order ${order_id} — ${transaction_status} (${payment_type})`);
    res.json({ success: true });

  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
