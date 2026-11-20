const { Client } = require('@elastic/elasticsearch');
const es = new Client({ node: process.env.ES_NODE || 'http://localhost:9200' });
const INDEX = 'products';
let available = false;

async function initES() {
  try {
    await es.ping();
    const exists = await es.indices.exists({ index: INDEX });
    if (!exists) {
      await es.indices.create({ index: INDEX, mappings: { properties: {
        name: { type: 'text' }, description: { type: 'text' }, brand: { type: 'text' },
        category: { type: 'keyword' }, price: { type: 'float' },
        ratingAvg: { type: 'float' }, createdAt: { type: 'date' } } } });
    }
    available = true;
    console.log('Elasticsearch ready');
  } catch {
    console.log('Elasticsearch unavailable, using MongoDB search fallback');
  }
}
const isESAvailable = () => available;

async function indexProduct(p) {
  if (!available) return;
  await es.index({ index: INDEX, id: String(p._id), refresh: true, document: {
    name: p.name, description: p.description, brand: p.brand, category: p.category,
    price: p.price, ratingAvg: p.ratingAvg, createdAt: p.createdAt } });
}
async function removeProduct(id) {
  if (!available) return;
  await es.delete({ index: INDEX, id: String(id), refresh: true }).catch(() => {});
}
async function searchIds({ q, category, minPrice, maxPrice, sort, page, limit }) {
  const must = q ? [{ multi_match: { query: q, fields: ['name^3', 'brand^2', 'description'], fuzziness: 'AUTO' } }] : [{ match_all: {} }];
  const filter = [];
  if (category) filter.push({ term: { category } });
  if (minPrice || maxPrice) filter.push({ range: { price: {
    ...(minPrice && { gte: Number(minPrice) }), ...(maxPrice && { lte: Number(maxPrice) }) } } });
  const sortMap = { price_asc: [{ price: 'asc' }], price_desc: [{ price: 'desc' }],
    rating: [{ ratingAvg: 'desc' }], newest: [{ createdAt: 'desc' }] };
  const r = await es.search({ index: INDEX, from: (page - 1) * limit, size: limit,
    query: { bool: { must, filter } }, ...(sortMap[sort] && { sort: sortMap[sort] }) });
  return { ids: r.hits.hits.map((h) => h._id), total: r.hits.total.value };
}
module.exports = { initES, isESAvailable, indexProduct, removeProduct, searchIds };
