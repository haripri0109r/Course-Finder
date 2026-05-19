import 'dotenv/config';
import mongoose from 'mongoose';
import { User, Follow, Bookmark, PushToken } from '../src/models/index.js';

const migrate = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected.');

    console.log('\n🚀 Starting Phase B Migration: Arrays -> Collections (Batch B1)\n');

    const users = await User.find({}).lean();
    console.log(`Found ${users.length} users to migrate.`);

    let followOps = [];
    let bookmarkOps = [];
    let pushTokenOps = [];
    let userUpdates = [];

    for (const user of users) {
      // 1. Migrate followers (Other people following this user)
      if (user.followers && user.followers.length > 0) {
        for (const followerId of user.followers) {
          followOps.push({
            updateOne: {
              filter: { followerId: followerId, followingId: user._id },
              update: { $setOnInsert: { followerId: followerId, followingId: user._id, createdAt: user.createdAt || new Date() } },
              upsert: true
            }
          });
        }
      }

      // 2. Migrate following (This user following other people)
      if (user.following && user.following.length > 0) {
        for (const followingId of user.following) {
          followOps.push({
            updateOne: {
              filter: { followerId: user._id, followingId: followingId },
              update: { $setOnInsert: { followerId: user._id, followingId: followingId, createdAt: user.createdAt || new Date() } },
              upsert: true
            }
          });
        }
      }

      // 3. Migrate bookmarks
      if (user.bookmarks && user.bookmarks.length > 0) {
        for (const courseId of user.bookmarks) {
          bookmarkOps.push({
            updateOne: {
              filter: { userId: user._id, courseId: courseId },
              update: { $setOnInsert: { userId: user._id, courseId: courseId, createdAt: user.createdAt || new Date() } },
              upsert: true
            }
          });
        }
      }

      // 4. Migrate push tokens
      if (user.expoPushTokens && user.expoPushTokens.length > 0) {
        for (const token of user.expoPushTokens) {
          if (!token || typeof token !== 'string') continue;
          pushTokenOps.push({
            updateOne: {
              filter: { token },
              update: { $setOnInsert: { userId: user._id, token, isActive: true, lastUsedAt: new Date() } },
              upsert: true
            }
          });
        }
      }

      // 5. Update cache counts on User
      userUpdates.push({
        updateOne: {
          filter: { _id: user._id },
          update: { 
            $set: { 
              followersCount: user.followers?.length || 0,
              followingCount: user.following?.length || 0
            } 
          }
        }
      });
    }

    // Execute Bulk Ops
    console.log(`📦 Executing Bulk Operations:`);
    console.log(`   - ${followOps.length} Follow relations`);
    console.log(`   - ${bookmarkOps.length} Bookmarks`);
    console.log(`   - ${pushTokenOps.length} Push Tokens`);
    console.log(`   - ${userUpdates.length} User count updates`);

    if (followOps.length > 0) await Follow.bulkWrite(followOps);
    if (bookmarkOps.length > 0) await Bookmark.bulkWrite(bookmarkOps);
    if (pushTokenOps.length > 0) await PushToken.bulkWrite(pushTokenOps);
    if (userUpdates.length > 0) await User.bulkWrite(userUpdates);

    console.log('\n✅ Phase B Migration Completed Successfully!');

    // Notice: Arrays are NOT $unset yet. This guarantees zero-downtime and safe rollback.
    console.log('⚠️ Legacy arrays are preserved. Cleanup script will be run after Batch B3 verification.\n');

    process.exit(0);
  } catch (error) {
    console.error('💥 Migration Failed:', error);
    process.exit(1);
  }
};

migrate();
