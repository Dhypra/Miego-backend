require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PATCH','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'MieGo Backend' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍜 MieGo Backend jalan di http://localhost:${PORT}`);
});