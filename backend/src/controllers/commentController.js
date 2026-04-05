import Comment from '../models/Comment.js';
import { CompletedCourse } from '../models/index.js';
import { createNotification } from '../services/notificationService.js';

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/completed/:completedCourseId/comments
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const addComment = async (req, res) => {
  const { text } = req.body;
  const { completedCourseId } = req.params;

  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'Comment text is required',
    });
  }

  const completion = await CompletedCourse.findById(completedCourseId).populate('course', 'title');
  if (!completion) {
    return res.status(404).json({
      success: false,
      message: 'Completion log not found',
    });
  }

  const comment = await Comment.create({
    user: req.user._id,
    completedCourse: completedCourseId,
    text,
  });

  const populated = await comment.populate('user', 'name profilePicture');

  // Trigger Notification
  await createNotification({
    recipientId: completion.user,
    senderId: req.user._id,
    senderName: req.user.name,
    type: 'comment',
    relatedPostId: completedCourseId,
    postTitle: completion.course?.title,
  });

  return res.status(201).json({
    success: true,
    data: populated,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/completed/:completedCourseId/comments
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getCompletionComments = async (req, res) => {
  const { completedCourseId } = req.params;

  const comments = await Comment.find({ completedCourse: completedCourseId })
    .populate('user', 'name profilePicture')
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: comments.length,
    data: comments,
  });
};

export { addComment, getCompletionComments };
