import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
      console.error("❌ No MongoDB URI found in environment variables");
      process.exit(1);
    }

    console.log("🔍 MONGO_URI:", uri ? "Loaded ✅" : "Missing ❌");

    await mongoose.connect(uri);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;