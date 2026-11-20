require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initQueue } = require('./config/queue');
const initSocket = require('./socket');

const server = http.createServer(app);
initSocket(server);

connectDB()
  .then(() => {
    initQueue();
    server.listen(process.env.PORT || 5001, () => console.log(`LMS API running on :${process.env.PORT || 5001}`));
  })
  .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });