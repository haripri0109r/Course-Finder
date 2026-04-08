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

  return {
    version: API_VERSION,
    _id: item._id, // Required for frontend FlatList keyExtractor
    id: item._id?.toString() || "",
    courseId: course._id?.toString() || "",
    title: course.title || "Untitled Course",
    // Defensive URL check:
    image: isValidUrl(course.image) ? course.image : DEFAULT_IMAGE,
    platform: course.platform || "Unknown",
    url: course.url || "",
    createdAt: item.createdAt || new Date(),

    // Enrollments/Ratings context
    rating: item.rating ?? 0,
    review: item.review ?? "",
    // User context
    authorName: user.name || "Anonymous",
    userId: user._id?.toString() || "",

    likesCount: likes.length,
    isLikedByMe: currentUserId ? likes.some(id => id.toString() === currentUserId.toString()) : false,
    duration: item.duration || course.duration || "N/A",

    // Learning Post Metadata
    description: item.description || "",
    learnings: Array.isArray(item.learnings) ? item.learnings : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    likes: likes, // Temporary inclusion to prevent frontend crashes during refactor
  };
};
