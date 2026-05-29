import mongoose from 'mongoose';

const syncJobSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  status: { type: String, enum: ['pending', 'failed'], default: 'pending', index: true },
}, { timestamps: true });

export default mongoose.model('SyncJob', syncJobSchema);
