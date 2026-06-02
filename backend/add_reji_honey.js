import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Farmer Reji and Product Honey to the database... 🍯');

  // 1. Create or Update Farmer Reji
  const reji = await prisma.farmer.upsert({
    where: { id: 4 },
    update: {
      name: 'Reji',
      rating: 4.9,
      about: 'Reji is a passionate and experienced beekeeper from the high altitudes of Idukki, Kerala. He specializes in harvesting pure, raw, and organic forest honey using traditional, sustainable apiculture methods that preserve all the natural enzymes, antioxidants, and medicinal benefits.',
      image: '/images/farmers/reji/reji.jpeg',
    },
    create: {
      id: 4,
      name: 'Reji',
      rating: 4.9,
      about: 'Reji is a passionate and experienced beekeeper from the high altitudes of Idukki, Kerala. He specializes in harvesting pure, raw, and organic forest honey using traditional, sustainable apiculture methods that preserve all the natural enzymes, antioxidants, and medicinal benefits.',
      image: '/images/farmers/reji/reji.jpeg',
    }
  });

  console.log(`Synced Farmer: ${reji.name}`);

  // 2. Create or Update Product Honey
  const honey = await prisma.product.upsert({
    // We can query by name or find a product with name 'Honey'
    // Since there's no unique constraint on name, we will first search for it or use an ID if we want
    where: { id: 9 }, // Since there are 8 spices already (IDs 1 to 8), we can use ID 9 or just find by name first
    update: {
      name: 'Honey',
      price: 280.00,
      category: 'Sweeteners',
      images: ['/images/honey/honey.jpg'],
      description: 'Sourced directly from the wild bee hives in the dense forests of Idukki by Reji, our premium raw forest honey is 100% natural, unprocessed, and unpasteurized. It retains all the natural pollen, propolis, and beneficial enzymes, offering a rich, multi-floral sweet taste with deep woody undertones. A perfect natural sweetener and immunity booster.',
      farmerId: reji.id,
      stock: 15.0
    },
    create: {
      id: 9,
      name: 'Honey',
      price: 280.00,
      category: 'Sweeteners',
      images: ['/images/honey/honey.jpg'],
      description: 'Sourced directly from the wild bee hives in the dense forests of Idukki by Reji, our premium raw forest honey is 100% natural, unprocessed, and unpasteurized. It retains all the natural pollen, propolis, and beneficial enzymes, offering a rich, multi-floral sweet taste with deep woody undertones. A perfect natural sweetener and immunity booster.',
      farmerId: reji.id,
      stock: 15.0
    }
  });

  console.log(`Synced Product: ${honey.name}`);
  console.log('✅ Successfully added Reji and Honey without deleting any existing database data! 🍯🐝');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
