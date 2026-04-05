import User from '../models/User.js';
import CompletedCourse from '../models/CompletedCourse.js';

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/bookmarks/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const bookmarkCompletion = async (req, res) => {
  const { id } = req.params;

  // 1. Validate ID exists in database
  const completion = await CompletedCourse.findById(id);
  if (!completion) {
    return res.status(404).json({
      success: false,
      message: 'Course completion log not found',
    });
  }

  // 2. Add to bookmarks if not already present
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { bookmarks: id },
  });

  return res.status(200).json({
    success: true,
    message: 'Bookmark added successfully',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/bookmarks/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const removeBookmark = async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { bookmarks: id },
  });

  return res.status(200).json({
    success: true,
    message: 'Bookmark removed successfully',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/bookmarks
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getBookmarks = async (req, res) => {
  // Deeply populate: course (on CompletedCourse) and user (author of completion)
  const user = await User.findById(req.user._id).populate({
    path: 'bookmarks',
    populate: [
      { path: 'course', select: 'title platform url tags level averageRating totalCompletions' },
      { path: 'user', select: 'name profilePicture' }
    ]
  });

  return res.status(200).json({
    success: true,
    count: user.bookmarks.length,
    data: user.bookmarks,
  });
};

export { bookmarkCompletion, removeBookmark, getBookmarks };
