import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Course } from '../src/models/index.js';
import { DEFAULT_IMAGE } from '../src/config/constants.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const BATCH_SIZE = 100;

/**
 * PRODUCTION-GRADE MIGRATION SCRIPT
 * 1. Connects to MongoDB.
 * 2. Scans for Course documents with null/empty/undefined image fields.
 * 3. Batches updates in sets of 100 to prevent memory exhaustion on large DBs.
 * 4. Logs progress and errors.
 */
async function migrateImages() {
  try {
    console.log('🚀 Starting Image Migration...');
    console.log(`📍 Connection URI: ${process.env.MONGODB_URI}`);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find courses needing update
    const query = {
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: "" },
        { image: "undefined" }
      ]
    };

    const totalToUpdate = await Course.countDocuments(query);
    console.log(`📊 Total courses to patch: ${totalToUpdate}`);

    if (totalToUpdate === 0) {
      console.log('✨ No migration needed. All courses have images.');
      process.exit(0);
    }

    let processed = 0;

    // 2. Process in batches
    while (processed < totalToUpdate) {
      const courses = await Course.find(query).limit(BATCH_SIZE);
      
      if (courses.length === 0) break;

      const bulkOps = courses.map(doc => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { image: DEFAULT_IMAGE } }
        }
      }));

      await Course.bulkWrite(bulkOps);

      processed += courses.length;
      console.log(`⚙️ Progress: ${processed}/${totalToUpdate} courses updated...`);
    }

    console.log('🎉 Migration successful! All course images are now consistent.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateImages();
