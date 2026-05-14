import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  console.log('Syncing database with spices... 🌿');

  // 1. Create or Update Farmer Raju John
  const raju = await prisma.farmer.upsert({
    where: { id: 1 }, // Assuming ID 1 for simplicity, or we can findFirst by name
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

  const spices = [
    { name: 'Black Pepper', price: 175.00, category: 'Whole Spices', image: '/images/black-pepper.jpg', description: 'Freshly ground premium black pepper.', farmerId: raju.id },
    { name: 'Premium Saffron', price: 15.99, category: 'Whole Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Highest quality hand-picked saffron threads.' },
    { name: 'Smoked Paprika', price: 6.50, category: 'Ground Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Sweet and smoky paprika from Spain.' },
    { name: 'Turmeric Powder', price: 5.00, category: 'Ground Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Vibrant and earthy organic turmeric.' },
    { name: 'Cardamom Pods', price: 8.99, category: 'Whole Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Aromatic green cardamom pods.' },
    { name: 'Cinnamon Sticks', price: 4.50, category: 'Whole Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Sweet and warm cinnamon from Ceylon.' },
    { name: 'Black Peppercorns', price: 7.00, category: 'Whole Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Bold and spicy Tellicherry peppercorns.' },
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
  
  console.log('✅ Sync complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect from the database when done
    await prisma.$disconnect();
  });
