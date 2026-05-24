const express = require('express');
const router = express.Router();
const { snap, core } = require('../config/midtrans');
const { orders, payments } = require('../config/db');

// Map metode ke payment_type Midtrans
const METHOD_MAP = {
  qris:      { payment_type: 'qris', source_of_funds: 'qris' },
  transfer:  null, // handled via bank_transfer
  gopay:     { payment_type: 'gopay' },
  ovo:       { payment_type: 'qris' }, // OVO via QRIS
  dana:      { payment_type: 'qris' }, // DANA via QRIS
  shopeepay: { payment_type: 'shopeepay' },
};

// POST /api/payments/create — buat transaksi Midtrans
router.post('/create', async (req, res) => {
  try {
    const { orderId, method, bank } = req.body;

    const order = orders.get(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    if (order.payStatus === 'paid') return res.status(400).json({ success: false, message: 'Pesanan sudah dibayar' });

    // Parameter dasar Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: order.total,
      },
      customer_details: {
        first_name: order.customer,
      },
      item_details: [
        ...order.items.map(item => ({
          id: String(item.id),
          price: item.price,
          quantity: item.qty,
          name: item.name.substring(0, 50),
        })),
        {
          id: 'SERVICE_FEE',
          price: order.fee,
          quantity: 1,
          name: 'Biaya Layanan',
        },
      ],
    };

    let result;

    if (method === 'transfer') {
      // Bank Transfer — pakai Core API
      const bankCode = bank || 'bca';
      parameter.payment_type = 'bank_transfer';
      parameter.bank_transfer = { bank: bankCode };
      result = await core.charge(parameter);

      const vaNumber = result.va_numbers?.[0]?.va_number
        || result.permata_va_number
        || result.bill_key;

      payments.set(orderId, {
        orderId,
        method: 'transfer',
        bank: bankCode,
        vaNumber,
        amount: order.total,
        status: 'pending',
        midtransData: result,
        createdAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        data: {
          method: 'transfer',
          bank: bankCode,
          vaNumber,
          amount: order.total,
          expiresAt: result.expiry_time,
        },
      });
    }

    if (method === 'qris' || method === 'ovo' || method === 'dana') {
      parameter.payment_type = 'qris';
      result = await core.charge(parameter);

      payments.set(orderId, {
        orderId, method, amount: order.total,
        status: 'pending', midtransData: result,
        createdAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        data: {
          method: 'qris',
          qrCodeUrl: result.qr_string || result.actions?.find(a => a.name === 'generate-qr-code')?.url,
          amount: order.total,
          expiresAt: result.expiry_time,
        },
      });
    }

    if (method === 'gopay' || method === 'shopeepay') {
      parameter.payment_type = method;
      result = await core.charge(parameter);

      const deeplink = result.actions?.find(a => a.name === 'deeplink-redirect')?.url
        || result.actions?.find(a => a.name === 'get-status')?.url;

      payments.set(orderId, {
        orderId, method, amount: order.total,
        status: 'pending', midtransData: result,
        createdAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        data: { method, deeplinkUrl: deeplink, amount: order.total },
      });
    }

    // Fallback — Snap Token (untuk semua metode via popup)
    const snapResult = await snap.createTransaction(parameter);
    return res.json({ success: true, data: { snapToken: snapResult.token, snapUrl: snapResult.redirect_url } });

  } catch (err) {
    console.error('Payment create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payments/:orderId/status — cek status pembayaran
router.get('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await core.transaction.status(orderId);

    const order = orders.get(orderId);
    if (order && result.transaction_status === 'settlement') {
      order.payStatus = 'paid';
      order.paymentMethod = result.payment_type;
      order.status = order.status === 'new' ? 'process' : order.status;
      orders.set(orderId, order);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
