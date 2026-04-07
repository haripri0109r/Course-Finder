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
export const formatCourse = (item = {}) => {
  const course = item.course || {};
  const user = item.user || {};

  return {
    version: API_VERSION,
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
    authorName: user.name || "Anonymous",
    likesCount: Array.isArray(item.likes) ? item.likes.length : 0,
  };
};
