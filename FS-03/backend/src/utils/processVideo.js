const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
const Course = require('../models/Course');

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args);
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-400)))));
  });
}

async function processVideo({ courseId, lessonId, inputPath }) {
  const outDir = path.join(__dirname, '../../media/hls', String(lessonId));
  fs.mkdirSync(outDir, { recursive: true });
  try {
    await runFfmpeg([
      '-y', '-i', inputPath,
      '-codec:v', 'libx264', '-codec:a', 'aac', '-preset', 'veryfast',
      '-hls_time', '6', '-hls_playlist_type', 'vod',
      '-hls_segment_filename', path.join(outDir, 'seg_%03d.ts'),
      path.join(outDir, 'index.m3u8'),
    ]);
    await Course.updateOne(
      { _id: courseId, 'lessons._id': lessonId },
      { $set: { 'lessons.$.videoUrl': `/media/hls/${lessonId}/index.m3u8`, 'lessons.$.videoStatus': 'ready' } }
    );
    console.log(`Video ready for lesson ${lessonId}`);
  } catch (e) {
    console.error('Video processing failed:', e.message);
    await Course.updateOne(
      { _id: courseId, 'lessons._id': lessonId },
      { $set: { 'lessons.$.videoStatus': 'failed' } }
    );
  } finally {
    fs.unlink(inputPath, () => {});
  }
}

module.exports = processVideo;