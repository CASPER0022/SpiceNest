// Makes the Idukki Origins pouch photo the first (main) image of each product.
// Safe to run more than once: an image already in the list is moved to the front, not duplicated.
// Usage (from backend/): node add_pouch_images.js
import prisma from './db.js';

const POUCH_IMAGES = {
  'Black Pepper': '/images/pepper/pepper-pouch.jpg',
  'Cardamom': '/images/cardamom/cardamom-pouch.jpg',
  'Cloves': '/images/cloves/cloves-pouch.jpg',
  'Nutmeg': '/images/nutmeg/nutmeg-pouch.jpg',
  'Nutmeg Flower': '/images/nutmegflower/nutmegflower-pouch.jpg'
};

async function main() {
  for (const [name, image] of Object.entries(POUCH_IMAGES)) {
    const product = await prisma.product.findFirst({ where: { name }, select: { id: true, images: true } });
    if (!product) {
      console.warn(`Not found: ${name}`);
      continue;
    }
    const images = [image, ...(product.images || []).filter((img) => img !== image)];
    await prisma.product.update({ where: { id: product.id }, data: { images } });
    console.log(`${name}: ${images.join(', ')}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
