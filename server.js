require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();
const authRoutes = require('./routes/auth')

app.use(cors({
  origin: function(origin, callback) {
    // Izinkan semua subdomain vercel.app dan localhost
    const allowed = [
      'https://miego-fe.vercel.app',
      'https://miego-4b17bp5sw-dhypras-projects.vercel.app',
      'https://miego-hmeeh3fxo-dhypras-projects.vercel.app',
      'http://localhost:5173',
      'http://localhost:5500',
    ];
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use('/api/auth', authRoutes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

const paymentRoutes = require('./routes/payment')
const authRoutes    = require('./routes/auth')    

app.use('/api/payment', paymentRoutes)
app.use('/api/auth', authRoutes)    

const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MieGo Backend',
    version: '2.1.0',
    endpoints: {
      auth: {
        login  : 'POST /api/auth/login',
        me     : 'GET  /api/auth/me',
        logout : 'POST /api/auth/logout',
      },
      payment: {
        createTransaction : 'POST /api/payment/create-transaction',
        checkStatus       : 'GET  /api/payment/status/:orderId',
        notification      : 'POST /api/payment/notification',
        orders            : 'GET  /api/payment/orders  [AUTH]',
        updateStatus      : 'PATCH /api/payment/orders/:id/status  [AUTH]',
        stats             : 'GET  /api/payment/stats  [AUTH]',
        menu              : 'GET  /api/payment/menu',
      },
    },
  })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🍜 MieGo Backend berjalan!`);
  console.log(`   URL  : http://localhost:${PORT}`);
  console.log(`   Mode : ${process.env.NODE_ENV || 'development'}\n`);
});