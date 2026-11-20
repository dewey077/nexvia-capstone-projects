// Redis wrapper: uses Redis when reachable, otherwise an in-memory Map (dev fallback)
const Redis = require('ioredis');
const mem = new Map();
let client = null;

if (process.env.REDIS_URL) {
  const c = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null });
  c.on('error', () => {});
  c.connect().then(() => { client = c; console.log('Redis connected'); })
    .catch(() => console.log('Redis unavailable, using in-memory cache'));
}

exports.get = async (k) => {
  if (client) { try { return await client.get(k); } catch {} }
  return mem.get(k) || null;
};
exports.set = async (k, v, ttl = 60 * 60 * 24 * 7) => {
  if (client) { try { return await client.set(k, v, 'EX', ttl); } catch {} }
  mem.set(k, v);
};
exports.del = async (k) => {
  if (client) { try { await client.del(k); } catch {} }
  mem.delete(k);
};
exports.engine = () => (client ? 'redis' : 'memory');
