// SEO-friendly product URLs: /product/black-pepper instead of /product/1.

// "Black Pepper (Malabar) 100g" -> "black-pepper-malabar-100g"
export function slugify(text) {
  const slug = String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/['’]/g, '') // "reji's" -> "rejis"
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  if (!slug) return 'product';
  // A purely numeric slug would be read as a product ID
  return /^\d+$/.test(slug) ? `product-${slug}` : slug;
}

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Returns a slug for `name` that no other product uses ("black-pepper", "black-pepper-2", ...).
export async function uniqueProductSlug(db, name, excludeId = null) {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; ; n++) {
    const taken = await db.product.findFirst({
      where: { slug, ...(excludeId !== null && { id: { not: excludeId } }) },
      select: { id: true }
    });
    if (!taken) return slug;
    slug = `${base}-${n}`;
  }
}

// Gives every product that has no slug yet (e.g. created before slugs existed) one, oldest first.
export async function backfillProductSlugs(db) {
  const missing = await db.product.findMany({
    where: { slug: null },
    select: { id: true, name: true },
    orderBy: { id: 'asc' }
  });
  for (const { id, name } of missing) {
    const slug = await uniqueProductSlug(db, name, id);
    await db.product.update({ where: { id }, data: { slug } });
    console.log(`Product ${id} slug set to "${slug}"`);
  }
  return missing.length;
}
