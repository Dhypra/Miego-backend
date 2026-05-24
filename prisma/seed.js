const prisma = require('../config/prisma');

const menuItems = [
  // MIE
  { name: 'Mie Goreng  Original', desc: 'Mie goreng telur + sayur segar',      price: 50, category: 'mie',     emoji: '🍜', spicy: false },
  { name: 'Mie Goreng Pedas',    desc: 'Level 1-5 bisa request',              price: 50, category: 'mie',     emoji: '🌶️', spicy: true  },
  { name: 'Mie Rebus Seafood',   desc: 'Kuah kaldu gurih + udang cumi',       price: 50, category: 'mie',     emoji: '🍲', spicy: false },
  { name: 'Mie Goreng Seafood',  desc: 'Mix udang, cumi, kerang pilihan',     price: 50, category: 'mie',     emoji: '🍝', spicy: false },
  // SEAFOOD
  { name: 'Udang Bakar',         desc: 'Udang segar bumbu bakar spesial',     price: 50, category: 'seafood', emoji: '🦐', spicy: false },
  { name: 'Cumi Goreng Tepung',  desc: 'Cumi crispy saus mayo homemade',      price: 50, category: 'seafood', emoji: '🦑', spicy: false },
  { name: 'Kerang Saus Padang',  desc: 'Kerang segar bumbu padang pedas',     price: 50, category: 'seafood', emoji: '🐚', spicy: true  },
  { name: 'Ikan Bakar Kecap',    desc: 'Ikan segar bumbu kecap manis',        price: 50, category: 'seafood', emoji: '🐟', spicy: false },
  // MINUMAN
  { name: 'Es Teh Manis',        desc: 'Teh segar dengan gula aren pilihan',  price:  8000, category: 'minuman', emoji: '🧋', spicy: false },
  { name: 'Jus Jeruk',           desc: 'Jeruk segar peras langsung',          price: 12000, category: 'minuman', emoji: '🍊', spicy: false },
  { name: 'Es Kelapa Muda',      desc: 'Kelapa muda asli segar',              price: 15000, category: 'minuman', emoji: '🥥', spicy: false },
  // EXTRA
  { name: 'Nasi Putih',          desc: 'Nasi pulen hangat',                   price:  5000, category: 'extra',   emoji: '🍚', spicy: false },
];

async function main() {
  console.log('🌱 Seeding database MieGo...');

  // Hapus data lama kalau ada
  await prisma.menuItem.deleteMany();
  console.log('   ✓ Data menu lama dihapus');

  // Insert menu baru
  const result = await prisma.menuItem.createMany({ data: menuItems });
  console.log(`   ✓ ${result.count} menu berhasil ditambahkan`);

  console.log('');
  console.log('🎉 Seeding selesai! Database siap dipakai.');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
