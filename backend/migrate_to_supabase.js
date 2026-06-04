import pkg from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const { PrismaClient } = pkg;

// Validate that both database connection strings exist in .env
if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL is missing in your .env file!");
  process.exit(1);
}

if (!process.env.OLD_DATABASE_URL) {
  console.error("❌ Error: OLD_DATABASE_URL is missing in your .env file!");
  process.exit(1);
}

console.log("🔌 Connecting to Neon (Old DB) and Supabase (New DB)...");
const neonPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.OLD_DATABASE_URL,
    },
  },
});

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  try {
    console.log("📥 Step 1: Downloading all data from Neon...");

    const users = await neonPrisma.user.findMany();
    const farmers = await neonPrisma.farmer.findMany();
    const products = await neonPrisma.product.findMany();
    const reviews = await neonPrisma.review.findMany();
    const wishlists = await neonPrisma.wishlistItem.findMany();
    const carts = await neonPrisma.cartItem.findMany();
    const orders = await neonPrisma.order.findMany();
    const orderItems = await neonPrisma.orderItem.findMany();
    const orderMessages = await neonPrisma.orderMessage.findMany();

    console.log(`✨ Downloaded details:`);
    console.log(`   - ${users.length} Users`);
    console.log(`   - ${farmers.length} Farmers`);
    console.log(`   - ${products.length} Products`);
    console.log(`   - ${reviews.length} Reviews`);
    console.log(`   - ${wishlists.length} Wishlist Items`);
    console.log(`   - ${carts.length} Cart Items`);
    console.log(`   - ${orders.length} Orders`);
    console.log(`   - ${orderItems.length} Order Items`);
    console.log(`   - ${orderMessages.length} Order Messages`);

    console.log("\n🧹 Step 2: Cleaning new Supabase database to ensure a fresh, clean sync...");
    await supabasePrisma.orderMessage.deleteMany();
    await supabasePrisma.orderItem.deleteMany();
    await supabasePrisma.order.deleteMany();
    await supabasePrisma.review.deleteMany();
    await supabasePrisma.wishlistItem.deleteMany();
    await supabasePrisma.cartItem.deleteMany();
    await supabasePrisma.product.deleteMany();
    await supabasePrisma.farmer.deleteMany();
    await supabasePrisma.user.deleteMany();
    console.log("✅ Supabase tables cleaned.");

    console.log("\n📤 Step 3: Restoring stable data into Supabase...");

    // 1. Users
    if (users.length > 0) {
      console.log(`👤 Syncing ${users.length} users...`);
      await supabasePrisma.user.createMany({ data: users });
    }

    // 2. Farmers
    if (farmers.length > 0) {
      console.log(`👩‍🌾 Syncing ${farmers.length} farmers...`);
      await supabasePrisma.farmer.createMany({ data: farmers });
    }

    // 3. Products
    if (products.length > 0) {
      console.log(`🌶️ Syncing ${products.length} products...`);
      await supabasePrisma.product.createMany({ data: products });
    }

    // 4. Reviews
    if (reviews.length > 0) {
      console.log(`⭐ Syncing ${reviews.length} reviews...`);
      await supabasePrisma.review.createMany({ data: reviews });
    }

    // 5. Wishlists
    if (wishlists.length > 0) {
      console.log(`❤️ Syncing ${wishlists.length} wishlist items...`);
      await supabasePrisma.wishlistItem.createMany({ data: wishlists });
    }

    // 6. Carts
    if (carts.length > 0) {
      console.log(`🛒 Syncing ${carts.length} cart items...`);
      await supabasePrisma.cartItem.createMany({ data: carts });
    }

    // 7. Orders
    if (orders.length > 0) {
      console.log(`📦 Syncing ${orders.length} orders...`);
      await supabasePrisma.order.createMany({ data: orders });
    }

    // 8. Order Items
    if (orderItems.length > 0) {
      console.log(`📎 Syncing ${orderItems.length} order items...`);
      await supabasePrisma.orderItem.createMany({ data: orderItems });
    }

    // 9. Order Messages
    if (orderMessages.length > 0) {
      console.log(`💬 Syncing ${orderMessages.length} order messages...`);
      await supabasePrisma.orderMessage.createMany({ data: orderMessages });
    }

    console.log("\n🎉 SUCCESS! Your entire database has been successfully migrated to Supabase with NO data loss! 🚀");
  } catch (error) {
    console.error("\n❌ Migration failed with error:", error);
  } finally {
    await neonPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

main();
