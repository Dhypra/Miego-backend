const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const prisma   = require('../config/prisma')

const JWT_SECRET  = process.env.JWT_SECRET || 'miego-secret-ganti-ini'
const JWT_EXPIRES = '24h'

// =============================================
// POST /api/auth/login
// Login admin dengan email + password
// =============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' })

    // Cari admin di database
    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } })
    if (!admin)
      return res.status(401).json({ success: false, message: 'Email atau password salah' })

    // Verifikasi password
    const valid = await bcrypt.compare(password, admin.password)
    if (!valid)
      return res.status(401).json({ success: false, message: 'Email atau password salah' })

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )

    console.log(`✅ Admin login: ${admin.email}`)

    res.json({
      success: true,
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// =============================================
// GET /api/auth/me
// Cek token & ambil data admin yang login
// =============================================
router.get('/me', require('../middleware/authGuard'), async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    if (!admin)
      return res.status(404).json({ success: false, message: 'Admin tidak ditemukan' })

    res.json({ success: true, admin })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// =============================================
// POST /api/auth/logout
// Logout (client hapus token)
// =============================================
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logout berhasil' })
})

module.exports = router
