import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({ take: 1 });
  console.log(JSON.stringify(products, null, 2));
  await prisma.$disconnect();
}

check();
