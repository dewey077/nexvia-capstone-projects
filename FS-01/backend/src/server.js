require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initES } = require('./config/es');

connectDB().then(async () => {
  await initES();
  app.listen(process.env.PORT || 5000, () => console.log(`API running on :${process.env.PORT || 5000}`));
}).catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
