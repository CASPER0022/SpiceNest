import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  console.log('Syncing database with spices... 🌿');

  // 1. Create or Update Farmer Raju John
  const raju = await prisma.farmer.upsert({
    where: { id: 1 }, 
    update: {
      name: 'Raju John',
      rating: 4.9,
      about: 'A passionate 3rd-generation spice farmer from the lush hills of Kerala, Raju John is dedicated to sustainable and organic farming practices. His black pepper vines are cultivated under the natural canopy of the rainforest, ensuring the boldest flavors and highest quality.',
      image: 'https://images.unsplash.com/photo-1595858801948-4e1b8b8ba868?w=800&q=80',
    },
    create: {
      name: 'Raju John',
      rating: 4.9,
      about: 'A passionate 3rd-generation spice farmer from the lush hills of Kerala, Raju John is dedicated to sustainable and organic farming practices. His black pepper vines are cultivated under the natural canopy of the rainforest, ensuring the boldest flavors and highest quality.',
      image: 'https://images.unsplash.com/photo-1595858801948-4e1b8b8ba868?w=800&q=80',
    }
  });

  console.log(`Synced Farmer: ${raju.name}`);

  // 2. Clear existing products to ensure only the requested ones remain
  // We handle potential relation issues by deleting order items if necessary, 
  // but for a clean seed, we'll just focus on the product list.
  await prisma.product.deleteMany({
    where: {
      name: {
        notIn: ['Black Pepper', 'Cashew']
      }
    }
  });

  const spices = [
    { 
      name: 'Black Pepper', 
      price: 175.00, 
      category: 'Whole Spices', 
      images: ['/images/pepper/pepper-1.jpg', '/images/pepper/pepper-2.jpg', '/images/pepper/pepper-3.jpg'], 
      description: 'Freshly sourced from the spice farms of Idukki, our black pepper is packed with bold aroma and natural flavour. Carefully harvested and traditionally processed by local farmers, each batch brings the authentic taste of Kerala straight to your kitchen. Pure, fresh, and full of richness — made for everyday cooking with real farm-grown quality.', 
      farmerId: raju.id 
    },
    { 
      name: 'Cashew', 
      price: 450.00, 
      category: 'Dry Fruits', 
      images: ['/images/cashew/Cashew1.jpg', '/images/cashew/Cashew2.jpg'], 
      description: 'Straight from the farms of Idukki to your home, we bring spices and dry fruits grown with care by local farmers. No long storage, no unnecessary processing — just fresh, authentic products packed with natural aroma and flavour. Every order helps support farming families and keeps the tradition of Kerala’s spice heritage alive.', 
      farmerId: raju.id 
    }
  ];

  for (const spice of spices) {
    const existing = await prisma.product.findFirst({
      where: { name: spice.name }
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: spice
      });
      console.log(`Updated: ${spice.name}`);
    } else {
      await prisma.product.create({
        data: spice
      });
      console.log(`Added: ${spice.name}`);
    }
  }
  
  console.log('✅ Sync complete! Only Black Pepper and Cashew remain.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
