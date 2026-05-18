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
  
  console.log('✅ Spices and coffee seeded! Now seeding realistic historical orders to populate Admin Dashboard metrics... 📊');

  const pepper = await prisma.product.findFirst({ where: { name: 'Black Pepper' } });
  const cardamom = await prisma.product.findFirst({ where: { name: 'Cardamom' } });
  const coffee = await prisma.product.findFirst({ where: { name: 'Coffee' } });

  const albin = await prisma.user.findFirst({ where: { email: 'heyitsmealbinjohn@gmail.com' } });
  const casper = await prisma.user.findFirst({ where: { email: 'albinjohn2427@gmail.com' } });
  const anjali = await prisma.user.findFirst({ where: { email: 'anjalypthomas146@gmail.com' } });
  const testUser = await prisma.user.findFirst({ where: { email: 'testuser@spicenest.com' } });

  const ordersData = [
    {
      user: albin,
      totalAmount: 350.00,
      createdAt: new Date('2026-05-14T10:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE1',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: pepper, quantity: 2, price: 175.00, weight: '100g' }]
    },
    {
      user: casper,
      totalAmount: 350.00,
      createdAt: new Date('2026-05-14T11:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE2',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: cardamom, quantity: 1, price: 350.00, weight: '100g' }]
    },
    {
      user: casper,
      totalAmount: 175.00,
      createdAt: new Date('2026-05-14T12:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE3',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: pepper, quantity: 1, price: 175.00, weight: '100g' }]
    },
    {
      user: anjali,
      totalAmount: 525.00,
      createdAt: new Date('2026-05-14T13:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE4',
      address: '{"fullName":"Anjaly","mobileNumber":"6484614748","pincode":"685606","houseNo":"Hsh","area":"Sgajzj","landmark":"Hzjzjz","city":"Kanjikuzhy","state":"Kerala"}',
      items: [{ product: cardamom, quantity: 1, price: 350.00, weight: '100g' }, { product: pepper, quantity: 1, price: 175.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 625.00,
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE5',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: coffee, quantity: 1, price: 625.00, weight: '250g' }]
    },
    {
      user: anjali,
      totalAmount: 900.00,
      createdAt: new Date('2026-05-15T10:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE6',
      address: '{"fullName":"Anjaly","mobileNumber":"6484614748","pincode":"685606","houseNo":"Hsh","area":"Sgajzj","landmark":"Hzjzjz","city":"Kanjikuzhy","state":"Kerala"}',
      items: [{ product: coffee, quantity: 2, price: 250.00, weight: '100g' }, { product: cardamom, quantity: 1, price: 350.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 175.00,
      createdAt: new Date('2026-05-15T11:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE7',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: pepper, quantity: 1, price: 175.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 450.00,
      createdAt: new Date('2026-05-15T12:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE8',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: cardamom, quantity: 1, price: 350.00, weight: '100g' }, { product: pepper, quantity: 1, price: 100.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 450.00,
      createdAt: new Date('2026-05-15T13:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE9',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: cardamom, quantity: 1, price: 350.00, weight: '100g' }, { product: pepper, quantity: 1, price: 100.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 450.00,
      createdAt: new Date('2026-05-15T14:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE10',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: cardamom, quantity: 1, price: 350.00, weight: '100g' }, { product: pepper, quantity: 1, price: 100.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 175.00,
      createdAt: new Date('2026-05-15T15:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE11',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: pepper, quantity: 1, price: 175.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 175.00,
      createdAt: new Date('2026-05-15T16:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE12',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: pepper, quantity: 1, price: 175.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 450.00,
      createdAt: new Date('2026-05-15T17:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE13',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: cardamom, quantity: 1, price: 350.00, weight: '100g' }, { product: pepper, quantity: 1, price: 100.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 175.00,
      createdAt: new Date('2026-05-15T18:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE14',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: pepper, quantity: 1, price: 175.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 350.00,
      createdAt: new Date('2026-05-16T12:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE15',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: cardamom, quantity: 1, price: 350.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 450.00,
      createdAt: new Date('2026-05-17T12:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE16',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: cardamom, quantity: 1, price: 350.00, weight: '100g' }, { product: pepper, quantity: 1, price: 100.00, weight: '100g' }]
    },
    {
      user: albin,
      totalAmount: 175.00,
      createdAt: new Date('2026-05-17T13:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE17',
      address: '{"fullName":"ALBIN JOHN","mobileNumber":"8921663449","pincode":"685606","houseNo":"kanjikuzhy","area":"dfg","landmark":"df","city":"Kottayam","state":"Kerala"}',
      items: [{ product: pepper, quantity: 1, price: 175.00, weight: '100g' }]
    },
    {
      user: testUser,
      totalAmount: 415.63,
      createdAt: new Date('2026-05-18T10:00:00.000Z'),
      stripeSessionId: 'CS_TEST_A1BHEWKWHLJE18',
      address: '{"fullName":"Test Recipient","mobileNumber":"9876543210","pincode":"685602","houseNo":"123 Spice Farms","area":"Vazhavatta","landmark":"","city":"Idukki","state":"Kerala"}',
      items: [{ product: pepper, quantity: 1, price: 415.63, weight: '100g' }]
    }
  ];

  for (const o of ordersData) {
    if (!o.user) continue;
    const orderRecord = await prisma.order.create({
      data: {
        userId: o.user.id,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
        stripeSessionId: o.stripeSessionId,
        address: o.address,
        status: 'PAID'
      }
    });

    for (const item of o.items) {
      if (!item.product) continue;
      await prisma.orderItem.create({
        data: {
          orderId: orderRecord.id,
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.images && item.product.images.length > 0 ? item.product.images[0] : '',
          quantity: item.quantity,
          price: item.price,
          weight: item.weight
        }
      });
    }
  }

  console.log('✅ Sync complete! Product Catalog updated and 18 historical orders successfully re-seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
