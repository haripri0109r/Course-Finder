import 'dotenv/config';
import connectDB from '../../config/db.js';
import { MetadataCache } from '../models/index.js';

const isGenericUdemyThumbnail = (image = "") => {
  const img = String(image || "").toLowerCase();
  if (!img) return true;
  return (
    img.includes("udemy.com/staticx") ||
    img.includes("udemy-logo") ||
    img.includes("logo-udemy") ||
    img.includes("default-meta-image") ||
    img.includes("brand-logo")
  );
};

const cleanup = async () => {
  try {
    // Ensure we are running from the backend directory or have correct paths
    await connectDB();

    console.log("🚀 Starting Udemy Cache Cleanup...");

    // Find all Udemy entries
    const udemyEntries = await MetadataCache.find({
      $or: [
        { url: /udemy\.com/i },
        { platform: 'udemy' },
        { provider: /udemy/i }
      ]
    });

    console.log(`🔍 Found ${udemyEntries.length} total Udemy entries in cache.`);

    let deletedCount = 0;

    for (const entry of udemyEntries) {
      const title = (entry.title || "").toLowerCase();
      const author = (entry.author || "").toLowerCase();
      const thumbnail = (entry.thumbnail || entry.image || "");

      // Polluted if title is generic homepage text
      const isGenericTitle = title.includes("online courses - learn anything") || title === "udemy";
      
      // Polluted if author is just "Udemy" (missing instructor)
      const isGenericAuthor = author === "udemy";
      
      // Polluted if thumbnail is a generic brand asset
      const isGenericThumb = isGenericUdemyThumbnail(thumbnail);

      if (isGenericTitle || isGenericAuthor || isGenericThumb) {
        await MetadataCache.deleteOne({ _id: entry._id });
        deletedCount++;
        console.log(`🗑️ Deleted polluted entry: ${entry.url}`);
      }
    }

    console.log("--------------------------------------------------");
    console.log(`✅ Cleanup complete!`);
    console.log(`📊 Total Udemy entries checked: ${udemyEntries.length}`);
    console.log(`📊 Polluted entries deleted: ${deletedCount}`);
    console.log("--------------------------------------------------");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    process.exit(1);
  }
};

cleanup();
