import mongoose from 'mongoose';
import { Course, CompletedCourse } from '../models/index.js';
import { createNotification } from '../services/notificationService.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { formatCourse } from '../utils/formatter.js';
import { PAGINATION_LIMIT, API_VERSION } from '../config/constants.js';

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
  const { title, platform, url, tags, level, rating, review, image, duration, certificateUrl, certificatePublicId } = req.body;

  // 1. Validate required fields
  if (!title || !platform || !url) {
    return res.status(400).json({
      success: false,
      message: 'title, platform, and url are required',
    });
  }

  // 2. Find or create the Course document
  let course = await Course.findOne({ url: url.trim() });

  if (!course) {
    course = await Course.create({
      title: title.trim(),
      platform,
      url: url.trim(),
      image: image ? image.trim() : '',
      tags: tags || [],
      level: level || 'beginner',
    });
    console.log("New Course Created:", course);
  } else if (image && !course.image) {
    course.image = image.trim();
    await course.save();
    console.log("Existing Course Image Updated:", course);
  } else {
    console.log("Existing Course Found:", course);
  }

  // 3. Check for duplicate (unique index on user + course will throw 11000)
  const alreadyAdded = await CompletedCourse.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (alreadyAdded) {
    let updated = false;
    if (certificateUrl && certificateUrl.trim() !== alreadyAdded.certificateUrl) {
      // If there's an old certificate, we should safely delete it
      if (alreadyAdded.certificatePublicId) {
        const oldIsPdf = alreadyAdded.certificateUrl.endsWith('.pdf') || alreadyAdded.certificateUrl.includes('/raw/');
        deleteFromCloudinary(alreadyAdded.certificatePublicId, oldIsPdf ? 'raw' : 'image');
      }
      alreadyAdded.certificateUrl = certificateUrl.trim();
      alreadyAdded.certificatePublicId = certificatePublicId ? certificatePublicId.trim() : null;
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

  // 4. Create the CompletedCourse entry
  const completed = await CompletedCourse.create({
    user: req.user._id,
    course: course._id,
    rating: rating || undefined,
    review: review || '',
    duration: duration || '',
    certificateUrl: certificateUrl ? certificateUrl.trim() : '',
    certificatePublicId: certificatePublicId ? certificatePublicId.trim() : null,
  });

  // 5. Sync aggregated stats on the Course document
  await syncCourseStats(course._id);

  // 6. Return populated response
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
  const completedCourses = await CompletedCourse.find({ user: req.user._id })
    .populate({
      path: 'course',
      select: 'title platform url tags level averageRating totalCompletions totalRatings image',
    })
    .sort({ createdAt: -1 });

  const data = completedCourses.map(item => formatCourse(item, req.user._id));

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    count: data.length,
    data,
  });
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

  const updated = await CompletedCourse.findByIdAndUpdate(
    req.params.id,
    { $push: { likes: req.user._id } },
    { new: true }
  ).populate('course', 'title image');

  // Trigger Notification
  await createNotification({
    recipientId: completion.user,
    senderId: req.user._id,
    senderName: req.user.name,
    type: 'like',
    relatedPostId: completion._id,
    postTitle: updated.course?.title,
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
  const updated = await CompletedCourse.findByIdAndUpdate(
    req.params.id,
    { $pull: { likes: req.user._id } },
    { new: true }
  );

  return res.status(200).json({
    success: true,
    data: updated,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/recent
// @access  Private (or Public, but we have protect on the router)
// ─────────────────────────────────────────────────────────────────────────────
const getRecentActivity = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;

  const total = await CompletedCourse.countDocuments({ isPublic: true });

  const items = await CompletedCourse.find({ isPublic: true })
    .populate('user', 'name profilePicture')
    .populate('course', 'title platform url tags level averageRating totalCompletions image')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(PAGINATION_LIMIT);

  const data = items.map(item => formatCourse(item, req.user._id));

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    data,
    page,
    totalPages: Math.ceil(total / PAGINATION_LIMIT),
    hasMore: page * PAGINATION_LIMIT < total,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/user/:userId
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getUserCompletions = async (req, res) => {
  const activity = await CompletedCourse.find({ user: req.params.userId, isPublic: true })
    .populate('course', 'title platform url tags level averageRating totalCompletions image')
    .sort({ createdAt: -1 });

  const data = activity.map(item => formatCourse(item, req.user?._id));

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    count: data.length,
    data,
  });
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
    .populate('course', 'title platform url tags level averageRating totalCompletions totalRatings image');

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  const data = formatCourse(post, req.user?._id);

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    data,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
const trackCertView = async (req, res) => {
  const { url } = req.body;
  if (url) {
    console.log(JSON.stringify({ event: 'CERTIFICATE_VIEWED', userId: req.user._id, url }));
  }
  return res.status(200).json({ success: true });
};

export { 
  addCompletedCourse, 
  uploadCertificate,
  getMyCompletedCourses, 
  deleteCompletedCourse,
  likeCompletion,
  unlikeCompletion,
  getRecentActivity,
  getUserCompletions,
  getCompletedCourseById,
  trackCertView
};
