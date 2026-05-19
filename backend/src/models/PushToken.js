import mongoose from 'mongoose';

const pushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true, // Prevents duplicate tokens across users
    },
    deviceId: {
      type: String, // Optional: useful for invalidating specific devices later
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const PushToken = mongoose.model('PushToken', pushTokenSchema);
export default PushToken;
