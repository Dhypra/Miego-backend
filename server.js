require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const app     = express()

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5500',
    ]
    if (!origin || allowed.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`)
  next()
})

const paymentRoutes = require('./routes/payment')
const authRoutes    = require('./routes/auth')

app.use('/api/payment', paymentRoutes)
app.use('/api/auth', authRoutes)

app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'MieGo Backend', version: '2.1.0' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🍜 MieGo Backend berjalan!`)
  console.log(`   URL : http://localhost:${PORT}\n`)
})