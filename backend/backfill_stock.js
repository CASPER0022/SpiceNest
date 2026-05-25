import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

function parseWeightToKg(weightStr) {
  if (!weightStr) return 0.1;
  const lower = weightStr.toLowerCase().trim();
  if (lower.endsWith('kg')) {
    const val = parseFloat(lower.replace('kg', ''));
    return isNaN(val) ? 1.0 : val;
  }
  if (lower.endsWith('g')) {
    const val = parseFloat(lower.replace('g', ''));
    return isNaN(val) ? 0.1 : val / 1000.0;
  }
  const val = parseFloat(lower);
  return isNaN(val) ? 0.1 : val;
}

async function backfill() {
  try {
    const products = await prisma.product.findMany();
    console.log(`Loaded ${products.length} products to check.`);

    for (const product of products) {
      // Find all order items matching this product ID, sorted by order creation date chronologically
      const orderItems = await prisma.orderItem.findMany({
        where: { productId: product.id },
        include: { order: true },
        orderBy: { order: { createdAt: 'asc' } }
      });

      if (orderItems.length === 0) {
        continue;
      }

      console.log(`\nProduct: ${product.name} (Current Stock: ${product.stock.toFixed(2)} kg)`);
      console.log(`Found ${orderItems.length} past transactions to log.`);

      // Compute total past deductions
      let totalDeductions = 0;
      orderItems.forEach(item => {
        const itemWeightKg = parseWeightToKg(item.weight);
        totalDeductions += itemWeightKg * item.quantity;
      });

      // Starting stock is current stock + total historical deductions
      let runningStock = product.stock + totalDeductions;
      console.log(`Calculated historical starting stock: ${runningStock.toFixed(2)} kg`);

      for (const item of orderItems) {
        const itemWeightKg = parseWeightToKg(item.weight);
        const deduction = itemWeightKg * item.quantity;
        const initial = runningStock;
        const final = runningStock - deduction;

        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            initialStock: initial,
            finalStock: final
          }
        });

        console.log(`  Order #${item.orderId}: Reduced ${deduction.toFixed(2)} kg (Initial: ${initial.toFixed(2)} kg -> Final: ${final.toFixed(2)} kg)`);
        runningStock = final;
      }
    }

    console.log('\n✅ Database Stock backfill completed successfully!');
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfill();
