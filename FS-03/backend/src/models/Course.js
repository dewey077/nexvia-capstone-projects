const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  videoUrl: String,
  videoStatus: { type: String, enum: ['none', 'processing', 'ready', 'failed'], default: 'none' },
  duration: { type: Number, default: 0 },
});

const courseSchema = new mongoose.Schema({
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General', index: true },
  price: { type: Number, default: 0, min: 0 },
  thumbnail: String,
  lessons: [lessonSchema],
  published: { type: Boolean, default: false },
}, { timestamps: true });

courseSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Course', courseSchema);