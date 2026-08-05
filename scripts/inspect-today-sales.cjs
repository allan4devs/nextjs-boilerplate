const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);
  const from = new Date("2026-08-04T06:00:00.000Z");
  const to = new Date("2026-08-05T06:00:00.000Z");
  const sales = await db.collection("xtreme_gym_product_sales")
    .find({ createdAt: { $gte: from, $lt: to } })
    .sort({ createdAt: 1 })
    .toArray();
  console.log(JSON.stringify(sales.map((sale) => ({
    id: sale.id,
    createdAt: sale.createdAt,
    items: sale.items,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    cashAmount: sale.cashAmount,
    sinpeAmount: sale.sinpeAmount,
    soldBy: sale.soldBy,
  })), null, 2));
  await client.close();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
