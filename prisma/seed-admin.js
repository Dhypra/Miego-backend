const bcrypt = require('bcryptjs')
const prisma  = require('../config/prisma')

// =============================================
// Jalankan sekali untuk buat akun admin pertama:
// node prisma/seed-admin.js
// =============================================

async function main() {
  const email    = process.env.ADMIN_EMAIL    || 'admin@miego.id'
  const password = process.env.ADMIN_PASSWORD || 'Admin123!'
  const name     = process.env.ADMIN_NAME     || 'Admin MieGo'

  console.log('👤 Membuat akun admin...')

  const existing = await prisma.admin.findUnique({ where: { email } })
  if (existing) {
    console.log(`   ⚠️  Admin ${email} sudah ada — skip`)
    return
  }

  const hashed = await bcrypt.hash(password, 12)
  const admin  = await prisma.admin.create({
    data: { email, password: hashed, name },
  })

  console.log(`   ✓ Admin dibuat: ${admin.email}`)
  console.log(`   ✓ Password   : ${password}`)
  console.log('')
  console.log('⚠️  GANTI PASSWORD setelah login pertama!')
}

main()
  .catch(e => { console.error('Seed admin error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
