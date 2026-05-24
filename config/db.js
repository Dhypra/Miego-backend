// In-memory store (ganti dengan MongoDB/PostgreSQL untuk production)
const orders = new Map();
const payments = new Map();

module.exports = { orders, payments };
