const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => (file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only images allowed'))),
});
const useS3 = () => !!(process.env.AWS_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

async function saveFile(file) {
  const name = `products/${crypto.randomUUID()}${path.extname(file.originalname)}`;
  if (useS3()) {
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: name, Body: file.buffer, ContentType: file.mimetype }));
    return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${name}`;
  }
  const local = path.join(__dirname, '../../uploads', name);
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, file.buffer);
  return `${process.env.API_URL || 'http://localhost:5000'}/uploads/${name}`;
}
module.exports = { upload, saveFile };
