import pkg from '@prisma/client';

const { PrismaClient } = pkg;

// Connections in the shared pool. DATABASE_URL historically used connection_limit=1 because every
// route file had its own client (six clients = six connections). With a single shared client, one
// connection would make concurrent requests queue behind each other, so the pool is sized here.
// The Supabase transaction pooler (port 6543) is built for this. Override with DB_POOL_SIZE.
const POOL_SIZE = Number.parseInt(process.env.DB_POOL_SIZE || '5', 10);

function withPoolSize(rawUrl) {
  if (!rawUrl || !Number.isInteger(POOL_SIZE) || POOL_SIZE < 1) return rawUrl;
  // Edit only the query string: the credentials may contain characters a URL parser would re-encode
  if (/[?&]connection_limit=\d+/.test(rawUrl)) {
    return rawUrl.replace(/([?&]connection_limit=)\d+/, `$1${POOL_SIZE}`);
  }
  return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}connection_limit=${POOL_SIZE}`;
}

// The ONE Prisma client for the whole server. Every route imports this instead of creating its
// own, so they share one connection pool and the database is connected only once when the server
// wakes up.
const prisma = new PrismaClient({
  datasources: { db: { url: withPoolSize(process.env.DATABASE_URL) } }
});

export default prisma;
