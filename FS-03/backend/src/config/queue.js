const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const processVideo = require('../utils/processVideo');

let queue = null;

function initQueue() {
  if (!process.env.REDIS_URL) {
    console.log('No REDIS_URL set: videos are converted without a queue');
    return;
  }
  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on('error', (e) => console.log('Redis error:', e.message));
  queue = new Queue('video', { connection });
  new Worker('video', (job) => processVideo(job.data), { connection, concurrency: 1 });
  console.log('BullMQ video queue ready');
}

async function addVideoJob(data) {
  if (queue) return queue.add('convert', data, { attempts: 2, removeOnComplete: true });
  processVideo(data).catch(console.error);
}

module.exports = { initQueue, addVideoJob };