const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'miego-secret-ganti-ini'

// =============================================
// Middleware authGuard
// Pasang di semua endpoint yang butuh login admin
// =============================================
module.exports = function authGuard(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer <token>

  if (!token)
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan — silakan login' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded // { id, email, name }
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Sesi habis — silakan login ulang' })
    return res.status(401).json({ success: false, message: 'Token tidak valid' })
  }
}
