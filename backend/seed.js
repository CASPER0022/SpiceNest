import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

const spices = [
  { name: 'Premium Saffron', price: 15.99, category: 'Whole Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Highest quality hand-picked saffron threads.' },
  { name: 'Smoked Paprika', price: 6.50, category: 'Ground Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Sweet and smoky paprika from Spain.' },
  { name: 'Turmeric Powder', price: 5.00, category: 'Ground Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Vibrant and earthy organic turmeric.' },
  { name: 'Cardamom Pods', price: 8.99, category: 'Whole Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Aromatic green cardamom pods.' },
  { name: 'Cinnamon Sticks', price: 4.50, category: 'Whole Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Sweet and warm cinnamon from Ceylon.' },
  { name: 'Black Peppercorns', price: 7.00, category: 'Whole Spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', description: 'Bold and spicy Tellicherry peppercorns.' },
];

async function main() {
  console.log('Seeding database with spices... 🌱');
  
  // Clear existing products to avoid duplicates
  await prisma.product.deleteMany();
  
  for (const spice of spices) {
    const createdSpice = await prisma.product.create({
      data: spice
    });
    console.log(`Added: ${createdSpice.name}`);
  }
  
  console.log('✅ Seeding complete!');
}

// Run the main function
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect from the database when done
    await prisma.$disconnect();
  });
