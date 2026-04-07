import { DEFAULT_IMAGE } from "../config/constants.js";

/**
 * Validates if the given string is a correctly formatted URL.
 * Prevents broken strings or "placeholder" from crashing frontend.
 */
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitizes req.body.image before storage.
 * Ensures we never store a broken URI in our primary Database.
 */
export const sanitizeImage = (req, _res, next) => {
  const image = req.body.image;

  // If no image provided or invalid URL string, use the safe default
  if (!image || !isValidUrl(image.trim())) {
    req.body.image = DEFAULT_IMAGE;
  } else {
    req.body.image = image.trim();
  }

  next();
};
