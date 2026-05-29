import { DEFAULT_IMAGE, API_VERSION } from "../config/constants.js";

/**
 * Validates URLs defensively in the formatter. 
 * Even if DB has a broken string, API will now return the default image.
 */
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    return Boolean(new URL(url));
  } catch {
    return false;
  }
};

/**
 * Transforms a nested CompletedCourse document into a flat, standardized v1 JSON.
 * High-resiliency: always returns a value for required keys.
 */
export const formatCourse = (item = {}, currentUserId = null) => {
  const course = item.course || {};
  const user = item.user || {};
  const likes = Array.isArray(item.likes) ? item.likes : [];

  const title = course.title || item.courseTitle || "Untitled Course";
  const image = isValidUrl(course.image) ? course.image : (isValidUrl(item.courseImage) ? item.courseImage : DEFAULT_IMAGE);
  const platform = course.platform || item.coursePlatform || "Unknown";
  const tags = (Array.isArray(item.tags) && item.tags.length > 0) ? item.tags : 
               ((Array.isArray(item.courseTags) && item.courseTags.length > 0) ? item.courseTags : 
               (Array.isArray(course.tags) ? course.tags : []));

  return {
    version: API_VERSION,
    _id: item._id, // Required for frontend FlatList keyExtractor
    id: item._id?.toString() || "",
    courseId: course._id?.toString() || item.course?.toString() || "",
    title,
    image,
    platform,
    url: course.url || "",
    createdAt: item.createdAt || new Date(),

    // Enrollments/Ratings context
    rating: item.rating ?? 0,
    review: item.review ?? "",
    // User context
    authorName: user.name || "Anonymous",
    userId: user._id?.toString() || item.user?.toString() || "",

    // Engagement & Feed 2.0 metrics
    likesCount: item.likesCount ?? likes.length,
    commentCount: item.commentCount || 0,
    bookmarkCount: item.bookmarkCount || 0,
    shareCount: item.shareCount || 0,
    viewsCount: item.viewsCount || 0,
    engagementScore: item.engagementScore || 0,
    
    isLikedByMe: item.isLikedByMe ?? (currentUserId ? likes.some(id => id.toString() === currentUserId.toString()) : false),
    duration: item.duration || course.duration || "N/A",

    // Learning Post Metadata
    description: item.description || "",
    learnings: Array.isArray(item.learnings) ? item.learnings : [],
    tags,
    source: item.source || "unknown",
    // likes: likes, // REMOVED to slim payload

    certificateUrl: item.certificateUrl || '',
    certificatePublicId: item.certificatePublicId || '',
  };
};
