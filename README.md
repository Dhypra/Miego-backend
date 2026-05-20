# 🍜 MieGo Backend v2.0 — Prisma + Supabase + Midtrans

---

## 🚀 LANGKAH 1 — Daftar & Setup Supabase (gratis)

1. Buka https://supabase.com → klik **"Start your project"**
2. Login dengan GitHub atau Google
3. Klik **"New project"**
   - Name: `miego`
   - Database Password: buat password kuat (simpan!)
   - Region: **Southeast Asia (Singapore)**
4. Tunggu ~2 menit sampai project siap
5. Pergi ke **Settings → Database**
6. Scroll ke **"Connection string"** → pilih tab **"URI"**
7. Salin dua URL:
   - **Transaction pooler** → untuk `DATABASE_URL`
   - **Session pooler** → untuk `DIRECT_URL`

---

## 🚀 LANGKAH 2 — Setup Project

```bash
# 1. Masuk folder
cd miego-backend

# 2. Salin file env
cp .env.example .env

# 3. Buka .env dan isi:
#    - DATABASE_URL (dari Supabase)
#    - DIRECT_URL (dari Supabase)
#    - MIDTRANS_SERVER_KEY
#    - MIDTRANS_CLIENT_KEY
```

---

## 🚀 LANGKAH 3 — Setup Database (1 perintah)

```bash
npm run setup
```

Perintah ini otomatis:
- Install semua package
- Generate Prisma client
- Buat semua tabel di Supabase
- Isi data menu awal (12 menu)

---

## 🚀 LANGKAH 4 — Jalankan Server

```bash
npm run dev
```

---

## 🔍 Prisma Studio — Lihat Database Visual

```bash
npm run db:studio
```

Buka browser di http://localhost:5555 — kamu bisa lihat, edit, dan hapus data langsung!

---

## 📁 Struktur Project

```
miego-backend/
├── server.js
├── package.json
├── .env
├── prisma/
│   ├── schema.prisma     ← Struktur database
│   └── seed.js           ← Data menu awal
├── config/
│   ├── prisma.js         ← Prisma client
│   └── midtrans.js       ← Midtrans client
└── routes/
    └── payment.js        ← Semua endpoint (Prisma + Midtrans)
```

---

## 🔌 API Endpoints

| Method | URL | Fungsi |
|--------|-----|--------|
| POST | /api/payment/create-transaction | Buat order + Midtrans token |
| GET | /api/payment/status/:orderId | Cek status bayar |
| POST | /api/payment/notification | Webhook Midtrans |
| GET | /api/payment/orders | Semua order (admin) |
| PATCH | /api/payment/orders/:id/status | Update status dapur |
| GET | /api/payment/menu | Daftar menu dari DB |
| GET | /api/payment/stats | Statistik dashboard |

---

## 🗄️ Melihat Data di Supabase Dashboard

1. Buka https://supabase.com/dashboard
2. Pilih project `miego`
3. Klik **"Table Editor"** di sidebar
4. Kamu bisa lihat tabel: `orders`, `order_items`, `payments`, `menu_items`

# Miego-backend
