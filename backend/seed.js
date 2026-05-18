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

  // 2. Clear existing orders, and unneeded products to prevent foreign key errors
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({
    where: {
      name: {
        notIn: ['Black Pepper', 'Cardamom', 'Coffee']
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
      name: 'Cardamom', 
      price: 350.00, 
      category: 'Whole Spices', 
      images: ['/images/cardamom/cardamom1.jpg', '/images/cardamom/cardamom2.jpg'], 
      description: 'Freshly handpicked from the high altitudes of Idukki, Kerala, our premium green cardamom pods boast a vibrant green color, full-bodied pods, and an intense, sweet-spicy aroma. Traditionally dried to lock in maximum volatile oils, these green pods are perfect for tea, traditional sweets, and exotic culinary dishes.', 
      farmerId: raju.id 
    },
    { 
      name: 'Coffee', 
      price: 250.00, 
      category: 'Beverages', 
      images: ['/images/coffee/coffee1.jpg', '/images/coffee/coffee2.jpg'], 
      description: 'Sourced from the shade-grown high elevation estates of Wayanad and Idukki, our premium single-origin Arabica-Robusta blend coffee is roasted to a perfect medium-dark level. With rich, bold earthy notes and a subtle chocolatey finish, it delivers an authentic South Indian filter coffee experience that stays true to its Western Ghats roots.', 
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
  
  console.log('✅ Sync complete! Only Black Pepper, Cardamom, and Coffee remain.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
