import { Bookmark, CompletedCourse, ActivityEvent } from '../models/index.js';
import { formatCourse } from '../utils/formatter.js';
import { API_VERSION } from '../config/constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/bookmarks/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const bookmarkCompletion = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user._id || req.user.id;

    // 1. Validate ID exists in database
    const completion = await CompletedCourse.findById(courseId).select('_id').lean();
    if (!completion) {
      return res.status(404).json({ success: false, message: 'Course completion log not found' });
    }

    // 2. Atomic bookmark creation
    try {
      await Bookmark.create({ userId, courseId });
    } catch (err) {
      if (err.code === 11000) { // Duplicate key
        return res.status(400).json({ success: false, message: 'Already bookmarked.' });
      }
      throw err;
    }

    // 3. Log Activity
    await ActivityEvent.create({ userId, eventType: 'save', targetId: courseId });

    return res.status(200).json({ success: true, message: 'Bookmark added successfully' });
  } catch (error) {
    console.error("Bookmark error:", error);
    res.status(500).json({ success: false, message: 'Failed to add bookmark' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/bookmarks/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const removeBookmark = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user._id || req.user.id;

    const bookmark = await Bookmark.findOneAndDelete({ userId, courseId });
    
    if (bookmark) {
      await ActivityEvent.findOneAndDelete({ userId, eventType: 'save', targetId: courseId });
    }

    return res.status(200).json({ success: true, message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    res.status(500).json({ success: false, message: 'Failed to remove bookmark' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/bookmarks
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const getBookmarks = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;
    const userId = req.user._id || req.user.id;

    const query = { userId };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const bookmarksList = await Bookmark.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate({
        path: 'courseId',
        populate: [
          { path: 'course', select: 'title platform url tags level averageRating totalCompletions image' },
          { path: 'user', select: 'name profilePicture headline' }
        ]
      })
      .lean();

    const data = bookmarksList
      .filter(item => item.courseId) // filter out deleted courses
      .map(item => formatCourse(item.courseId, userId));

    const nextCursor = bookmarksList.length === limit ? bookmarksList[bookmarksList.length - 1]._id : null;

    return res.status(200).json({
      success: true,
      version: API_VERSION,
      count: data.length,
      data,
      nextCursor
    });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({ success: false, message: 'Failed to get bookmarks' });
  }
};
