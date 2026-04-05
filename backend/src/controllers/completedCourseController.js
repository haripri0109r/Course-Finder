import { Course, CompletedCourse } from '../models/index.js';
import { createNotification } from '../services/notificationService.js';

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
  const { title, platform, url, tags, level, rating, review } = req.body;

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
      tags: tags || [],
      level: level || 'beginner',
    });
  }

  // 3. Check for duplicate (unique index on user + course will throw 11000)
  const alreadyAdded = await CompletedCourse.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (alreadyAdded) {
    return res.status(409).json({
      success: false,
      message: 'You have already added this course to your profile',
    });
  }

  // 4. Create the CompletedCourse entry
  const completed = await CompletedCourse.create({
    user: req.user._id,
    course: course._id,
    rating: rating || undefined,
    review: review || '',
  });

  // 5. Sync aggregated stats on the Course document
  await syncCourseStats(course._id);

  // 6. Return populated response
  const populated = await completed.populate({
    path: 'course',
    select: 'title platform url tags level averageRating totalCompletions',
  });

  return res.status(201).json({
    success: true,
    message: 'Course added to your profile',
    data: populated,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/me
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getMyCompletedCourses = async (req, res) => {
  const completedCourses = await CompletedCourse.find({ user: req.user._id })
    .populate({
      path: 'course',
      select: 'title platform url tags level averageRating totalCompletions totalRatings',
    })
    .sort({ createdAt: -1 }); // latest first

  return res.status(200).json({
    success: true,
    count: completedCourses.length,
    data: completedCourses,
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
  ).populate('course', 'title');

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
  const activity = await CompletedCourse.find({ isPublic: true })
    .populate('user', 'name profilePicture')
    .populate('course', 'title platform url tags level averageRating totalCompletions')
    .sort({ createdAt: -1 })
    .limit(30);

  return res.status(200).json({
    success: true,
    count: activity.length,
    data: activity,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/user/:userId
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getUserCompletions = async (req, res) => {
  const activity = await CompletedCourse.find({ user: req.params.userId, isPublic: true })
    .populate('course', 'title platform url tags level averageRating totalCompletions')
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: activity.length,
    data: activity,
  });
};

export { 
  addCompletedCourse, 
  getMyCompletedCourses, 
  deleteCompletedCourse,
  likeCompletion,
  unlikeCompletion,
  getRecentActivity,
  getUserCompletions
};
