import mongoose from 'mongoose';
import { Course, CompletedCourse } from '../models/index.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../services/notificationService.js';
import * as feedService from '../services/feedService.js';
import * as userService from '../services/userService.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { formatCourse } from '../utils/formatter.js';
import { PAGINATION_LIMIT, API_VERSION } from '../config/constants.js';
import { validateBody, addCompletedCourseSchema } from '../validators/schemas.js';
import { trackEvent } from '../services/activityService.js';

// ─── Helper: recalculate and persist course stats ─────────────────────────────
const syncCourseStats = async (courseId) => {
  const stats = await CompletedCourse.aggregate([
    { $match: { course: courseId } },
    {
      $group: {
        _id: '$course',
        totalCompletions: { $sum: 1 },
        totalRatings: {
          $sum: { $cond: [{ $ifNull: ['$rating', false] }, 1, 0] },
        },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    const { totalCompletions, totalRatings, averageRating } = stats[0];
    await Course.findByIdAndUpdate(courseId, {
      totalCompletions,
      totalRatings,
      averageRating: averageRating
        ? Math.round(averageRating * 10) / 10
        : 0,
    });
  } else {
    // No completions left — reset stats
    await Course.findByIdAndUpdate(courseId, {
      totalCompletions: 0,
      totalRatings: 0,
      averageRating: 0,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/completed
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const addCompletedCourse = async (req, res) => {
  // Validate request body using Zod
  const validation = validateBody(addCompletedCourseSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  // If multipart/form-data, Multer puts files in req.files and body in req.body
  const { 
    title, platform, url, level, rating, review, image, duration, 
    certificateUrl, certificatePublicId,
    description, learnings, tags, progress
  } = validation.data;

  let finalTitle = title;
  let finalImage = image; // manual image URL
  let finalPlatform = platform;
  let finalCertUrl = certificateUrl;
  let finalCertPublicId = certificatePublicId;

  // 1. Handle File Uploads (Priority 1)
  if (req.files) {
    // Handle Thumbnail Upload
    if (req.files['thumbnail'] && req.files['thumbnail'][0]) {
      try {
        const thumbResult = await uploadBufferToCloudinary(
          req.files['thumbnail'][0].buffer, 
          req.files['thumbnail'][0].mimetype,
          'course-finder/thumbnails'
        );
        finalImage = thumbResult.secure_url;
      } catch (err) {
        console.error("Thumbnail upload failed:", err.message);
      }
    }

    // Handle Certificate Upload
    if (req.files['certificate'] && req.files['certificate'][0]) {
      try {
        const certResult = await uploadBufferToCloudinary(
          req.files['certificate'][0].buffer, 
          req.files['certificate'][0].mimetype,
          'course-finder/certificates'
        );
        finalCertUrl = certResult.secure_url;
        finalCertPublicId = certResult.public_id;
      } catch (err) {
        console.error("Certificate upload failed:", err.message);
      }
    }
  }

  // 2. Metadata Safety Fallback (Priority 2 & 3)
  if (!finalTitle || !finalImage || !finalPlatform) {
    try {
      const metadataModule = await import('../services/metadataService.js');
      const fetched = await metadataModule.getMetadata(url);
      const metadata = fetched?.data || fetched || {};

      finalTitle = finalTitle || metadata.title;
      // finalImage is already set if uploaded or manual URL provided
      finalImage = finalImage || metadata.image || metadata.thumbnail;
      finalPlatform = finalPlatform || metadata.provider || metadata.platform;
    } catch (err) {
      console.warn("Metadata safety valve failed:", err.message);
    }
  }

  // 3. Validate required fields
  if (!finalTitle || !finalPlatform || !url) {
    return res.status(400).json({
      success: false,
      message: 'title, platform, and url are required',
    });
  }

  // 4. Find or create the Course document
  let course = await Course.findOne({ url: url.trim() });

  if (!course) {
    course = await Course.create({
      title: finalTitle.trim(),
      platform: finalPlatform,
      url: url.trim(),
      image: finalImage ? finalImage.trim() : '',
      tags: tags || [],
      level: level || 'beginner',
    });
    console.log("New Course Created:", course);
  } else if (finalImage && !course.image) {
    course.image = finalImage.trim();
    await course.save();
    console.log("Existing Course Image Updated:", course);
  } else {
    console.log("Existing Course Found:", course);
  }

  // 5. Check for duplicate (unique index on user + course will throw 11000)
  const alreadyAdded = await CompletedCourse.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (alreadyAdded) {
    let updated = false;
    if (finalCertUrl && finalCertUrl.trim() !== alreadyAdded.certificateUrl) {
      // If there's an old certificate, we should safely delete it
      if (alreadyAdded.certificatePublicId) {
        const oldIsPdf = alreadyAdded.certificateUrl.endsWith('.pdf') || alreadyAdded.certificateUrl.includes('/raw/');
        deleteFromCloudinary(alreadyAdded.certificatePublicId, oldIsPdf ? 'raw' : 'image');
      }
      alreadyAdded.certificateUrl = finalCertUrl.trim();
      alreadyAdded.certificatePublicId = finalCertPublicId ? finalCertPublicId.trim() : null;
      updated = true;
    }
    if (rating && rating !== alreadyAdded.rating) {
      alreadyAdded.rating = rating;
      updated = true;
    }
    if (review && review !== alreadyAdded.review) {
      alreadyAdded.review = review;
      updated = true;
    }

    if (updated) {
      await alreadyAdded.save();
      return res.status(200).json({
        success: true,
        message: 'Course profile updated successfully',
        data: alreadyAdded,
      });
    }

    return res.status(409).json({
      success: false,
      message: 'You have already added this course to your profile without new changes.',
    });
  }

  // 6. Normalize and handle Learning Post metadata
  const TECH_KEYWORDS = ["react", "javascript", "python", "ai", "node", "mongodb", "frontend", "backend", "fullstack", "ui", "ux"];
  
  let finalTags = Array.isArray(tags) ? tags : [];
  if (finalTags.length === 0) {
    // Auto-tagging fallback
    const corpus = (finalTitle + " " + (description || "")).toLowerCase();
    finalTags = TECH_KEYWORDS.filter(word => corpus.includes(word));
  }
  // Sanitize tags
  finalTags = finalTags.map(t => t.trim().toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean);

  const finalDescription = description || "Completed this course and gained valuable insights 🚀";
  const finalLearnings = Array.isArray(learnings) ? learnings.slice(0, 5) : [];

  const progressNum =
    progress !== undefined && progress !== ''
      ? Math.min(100, Math.max(0, Number(progress)))
      : 100;

  // 7. Create the CompletedCourse entry
  const completed = await CompletedCourse.create({
    user: req.user._id,
    course: course._id,
    rating: rating || undefined,
    review: review || '',
    duration: duration || '',
    progress: Number.isFinite(progressNum) ? progressNum : 100,
    certificateUrl: finalCertUrl ? finalCertUrl.trim() : '',
    certificatePublicId: finalCertPublicId ? finalCertPublicId.trim() : null,
    description: finalDescription,
    learnings: finalLearnings,
    tags: finalTags,
    // Denormalized snapshots for retrieval performance
    courseTags: course.tags || [],
    coursePlatform: course.platform,
    courseRating: course.averageRating || 0,
    courseCompletions: course.totalCompletions || 0,
    courseTitle: course.title,
    courseImage: course.image
  });

  // 8. Sync aggregated stats on the Course document
  await syncCourseStats(course._id);

  // 9. Instrumentation (Save/Add Event)
  trackEvent({
    userId: req.user._id,
    eventType: 'bookmark_save',
    targetId: course._id,
    targetType: 'course',
    metadata: { platform: course.platform }
  });

  trackEvent({
    userId: req.user._id,
    eventType: 'course_completion',
    targetId: completed._id,
    targetType: 'post'
  });

  // 10. Return populated response
  const populated = await completed.populate({
    path: 'course',
    select: 'title platform url tags level averageRating totalCompletions image',
  });

  if (populated.course && !populated.course.image) {
    populated.course.image = 'https://via.placeholder.com/300';
  }

  return res.status(201).json({
    success: true,
    message: 'Course added to your profile',
    data: populated,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/completed/upload-certificate
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const uploadCertificate = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file provided. Please upload an image or PDF file.',
    });
  }

  const { oldPublicId, oldResourceType } = req.body;

  try {
    // If user is overriding a staged certificate, clean the old one
    if (oldPublicId) {
      deleteFromCloudinary(oldPublicId, oldResourceType || 'image');
    }

    // Upload buffer to Cloudinary
    const result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);

    console.log(JSON.stringify({ 
      event: "UPLOAD_SUCCESS", 
      userId: req.user._id, 
      bytes: req.file.size,
      mimetype: req.file.mimetype,
      publicId: result.public_id
    }));

    return res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully',
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (error) {
    console.error(JSON.stringify({ 
      event: "UPLOAD_FAILURE", 
      userId: req.user._id, 
      error: error.message,
      stack: error.stack
    }));
    return res.status(500).json({
      success: false,
      message: 'Failed to upload certificate to cloud storage. ' + error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/me
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getMyCompletedCourses = async (req, res) => {
  // Use paginated logic internally to ensure consistency and limit fetch size
  return getMyCompletedCoursesPaginated(req, res);
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/completed/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const deleteCompletedCourse = async (req, res) => {
  const entry = await CompletedCourse.findById(req.params.id);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Completed course entry not found',
    });
  }

  // Ensure the logged-in user owns this entry
  if (entry.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this entry',
    });
  }

  const courseId = entry.course;

  await entry.deleteOne();

  // Re-sync stats after deletion
  await syncCourseStats(courseId);

  return res.status(200).json({
    success: true,
    message: 'Course removed from your profile',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/completed/:id/like
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const likeCompletion = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  const completion = await CompletedCourse.findById(req.params.id);

  if (!completion) {
    return res.status(404).json({
      success: false,
      message: 'Completion log not found',
    });
  }

  // Prevent duplicate likes
  if (completion.likes.includes(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: 'Already liked',
    });
  }

  // Atomic update: add user to likes and increment count
  const updated = await CompletedCourse.findByIdAndUpdate(
    req.params.id,
    { 
      $addToSet: { likes: req.user._id },
      $inc: { likesCount: 1 } 
    },
    { new: true }
  ).populate('course', 'title image tags').lean();

  // 🔔 Trigger Notification (only if liker ≠ post owner)
  const likeRecipient = completion.user.toString();
  const likeActor = req.user._id.toString();
  console.log("🔔 LIKE NOTIFICATION DEBUG:");
  console.log("  ACTOR:", likeActor);
  console.log("  RECIPIENT:", likeRecipient);
  console.log("  TYPE: post_like");

  if (likeRecipient !== likeActor) {
    console.log("🔥 NOTIFICATION TRIGGERED: post_like");
    await createNotification({
      userId: likeRecipient,
      actorId: likeActor,
      type: 'post_like',
      postId: completion._id
    });
  } else {
    console.log("⏭️ Skipped: self-like notification");
  }

  // Track Interest (Async)
  if (updated.course?.tags) {
    userService.trackUserInterests(req.user._id, updated.course.tags, 'like');
  }

  // Activity Log
  trackEvent({
    userId: req.user._id,
    eventType: 'bookmark_save', // Liking is a form of saving/interest
    targetId: completion._id,
    targetType: 'post'
  });

  return res.status(200).json({
    success: true,
    data: updated,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/completed/:id/unlike
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const unlikeCompletion = async (req, res) => {
  const completion = await CompletedCourse.findById(req.params.id);
  if (!completion) return res.status(404).json({ message: 'Post not found' });

  const updated = await CompletedCourse.findByIdAndUpdate(
    req.params.id,
    { 
      $pull: { likes: req.user._id },
      $inc: { likesCount: -1 }
    },
    { new: true }
  ).lean();

  // 🗑️ Soft-dismiss notification
  try {
    const rmFilter = {
      userId: completion.user.toString(),
      actorId: req.user._id.toString(),
      postId: req.params.id,
      type: "post_like"
    };

    const removedNotif = await Notification.findOneAndUpdate(
      rmFilter,
      { $set: { isRead: true } }
    );

    if (removedNotif && global.io) {
      global.io.to(rmFilter.userId.toString()).emit("notification_removed", removedNotif._id);

      const count = await Notification.countDocuments({
        userId: rmFilter.userId,
        isRead: false
      });
      global.io.to(rmFilter.userId.toString()).emit("unread_count", count);
    }
  } catch (err) {
    console.log("Notification cleanup failed:", err.message);
  }

  return res.status(200).json({
    success: true,
    data: updated,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/recent
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getRecentActivity = async (req, res) => {
  const { cursor, limit } = req.query;
  const limitNum = limit ? parseInt(limit) : PAGINATION_LIMIT;

  const { posts, nextCursor } = await feedService.getSmartFeed(
    req.user._id, 
    cursor, 
    limitNum
  );

  // 1. Instrumentation (Feed Impression)
  if (posts.length > 0) {
    const postIds = posts.map(p => p._id || p.id);
    trackEvent({
      userId: req.user._id,
      eventType: 'feed_impression',
      metadata: { postIds, count: posts.length }
    });
  }

  return res.status(200).json({ posts, nextCursor });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/user/:userId
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getUserCompletions = async (req, res) => {
  // Use paginated logic to prevent overfetching
  return getUserCompletionsPaginated(req, res);
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getCompletedCourseById = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  const post = await CompletedCourse.findById(req.params.id)
    .populate('user', 'name profilePicture')
    .populate('course', 'title platform url tags level averageRating totalCompletions totalRatings image')
    .lean();

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  const data = formatCourse(post, req.user?._id);

  // 1. Instrumentation (View Event)
  trackEvent({
    userId: req.user?._id || req.user?.id,
    eventType: 'course_open',
    targetId: post._id,
    targetType: 'post'
  });

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    data,
  });
};

/**
 * 🔒 RAW Post Access for PostDetail (No wrappers)
 */
const getPostById = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  const post = await CompletedCourse.findById(req.params.id)
    .populate('user', 'name profilePicture')
    .populate('course', 'title platform url tags level averageRating totalCompletions totalRatings image')
    .lean();

  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  const data = formatCourse(post, req.user?._id);

  // 1. Instrumentation (View Event)
  trackEvent({
    userId: req.user?._id || req.user?.id,
    eventType: 'course_open',
    targetId: post._id,
    targetType: 'post'
  });

  return res.json(data); // RAW RESPONSE
};

// ─────────────────────────────────────────────────────────────────────────────
const trackCertView = async (req, res) => {
  const { url } = req.body;
  if (url) {
    console.log(JSON.stringify({ event: 'CERTIFICATE_VIEWED', userId: req.user._id, url }));
  }
  return res.status(200).json({ success: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/completed/:id/view
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const incrementViewCount = async (req, res) => {
  try {
    const result = await feedService.trackUniqueView(req.user._id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/trending
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getTrendingCompletions = async (req, res) => {
  const result = await feedService.getTrendingCompletions(req.user._id);
  return res.status(200).json(result);
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completions/me/paginated
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getMyCompletedCoursesPaginated = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const cursor = req.query.cursor;

  const query = { user: req.user._id };
  if (cursor) query._id = { $lt: cursor };

  const completedCourses = await CompletedCourse.find(query)
    .populate({
      path: 'course',
      select: 'title platform url tags level averageRating totalCompletions totalRatings image',
    })
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  const data = completedCourses.map(item => formatCourse(item, req.user._id));
  const nextCursor = data.length === limit ? data[data.length - 1]._id : null;

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    data,
    nextCursor,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/users/:id/completions/paginated
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getUserCompletionsPaginated = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const cursor = req.query.cursor;

  const query = { user: req.params.userId, isPublic: true };
  if (cursor) query._id = { $lt: cursor };

  const activity = await CompletedCourse.find(query)
    .populate('course', 'title platform url tags level averageRating totalCompletions image')
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  const data = activity.map(item => formatCourse(item, req.user?._id));
  const nextCursor = data.length === limit ? data[data.length - 1]._id : null;

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    data,
    nextCursor,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/completed/:id/share
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const shareCompletion = async (req, res) => {
  try {
    const updated = await CompletedCourse.findByIdAndUpdate(
      req.params.id,
      { $inc: { shareCount: 1 } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: 'Post not found' });

    trackEvent({
      userId: req.user._id,
      eventType: 'post_share',
      targetId: req.params.id,
      targetType: 'post'
    });

    return res.status(200).json({ success: true, shareCount: updated.shareCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to share' });
  }
};

export { 
  addCompletedCourse,
  uploadCertificate,
  getMyCompletedCourses,
  getMyCompletedCoursesPaginated,
  deleteCompletedCourse,
  likeCompletion,
  unlikeCompletion,
  shareCompletion, // Added
  getRecentActivity,
  getUserCompletions,
  getUserCompletionsPaginated,
  getCompletedCourseById,
  getPostById,
  trackCertView,
  incrementViewCount,
  getTrendingCompletions,
};
