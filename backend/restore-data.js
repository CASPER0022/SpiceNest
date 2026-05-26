import pkg from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const { PrismaClient } = pkg;

// Validate that both database connection strings exist in .env
if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL is missing in your .env file!");
  process.exit(1);
}

if (!process.env.BACKUP_DATABASE_URL || process.env.BACKUP_DATABASE_URL.includes("your_copied_connection_string")) {
  console.error("❌ Error: BACKUP_DATABASE_URL is missing or contains placeholder values inside your .env file!");
  console.log("👉 Please make sure you paste the connection string you copied from the Neon Console.");
  process.exit(1);
}

console.log("🔌 Connecting to both databases...");
const backupPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.BACKUP_DATABASE_URL,
    },
  },
});

const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  try {
    console.log("📥 Step 1: Downloading all data from your stable backup database branch...");
    
    const backupUsers = await backupPrisma.user.findMany();
    const backupProducts = await backupPrisma.product.findMany();
    const backupOrders = await backupPrisma.order.findMany({
      include: {
        items: true,
      },
    });

    console.log(`✨ Downloaded: ${backupUsers.length} Users, ${backupProducts.length} Products, ${backupOrders.length} Orders.`);

    console.log("🧹 Step 2: Clearing current active database data...");
    
    // Clear in correct relational order to prevent foreign key errors
    await devPrisma.orderItem.deleteMany();
    await devPrisma.order.deleteMany();
    await devPrisma.product.deleteMany();
    await devPrisma.user.deleteMany();
    
    console.log("✅ Current active database is now clean.");

    console.log("📤 Step 3: Restoring stable data into your active database...");

    // Insert Users
    if (backupUsers.length > 0) {
      console.log(`👤 Restoring ${backupUsers.length} users...`);
      await devPrisma.user.createMany({
        data: backupUsers,
      });
    }

    // Insert Products
    if (backupProducts.length > 0) {
      console.log(`🛒 Restoring ${backupProducts.length} products...`);
      await devPrisma.product.createMany({
        data: backupProducts,
      });
    }

    // Insert Orders and their Items
    if (backupOrders.length > 0) {
      console.log(`📦 Restoring ${backupOrders.length} orders and their items...`);
      for (const order of backupOrders) {
        const { items, ...orderData } = order;
        
        await devPrisma.order.create({
          data: {
            ...orderData,
            items: {
              create: items.map(item => {
                const { id, orderId, ...itemData } = item;
                return itemData;
              }),
            },
          },
        });
      }
    }

    console.log("\n🎉 SUCCESS! Your stable backup data has been completely restored into your active development database!");
  } catch (error) {
    console.error("\n❌ Restore failed with error:", error);
  } finally {
    await backupPrisma.$disconnect();
    await devPrisma.$disconnect();
  }
}

main();
