import { User } from '../models/index.js';

/**
 * Tracks user interests by updating tag arrays on Like/View events.
 * Maintain the last 50 unique tags for each context.
 * 
 * @param {string} userId
 * @param {string[]} tags
 * @param {string} context - 'like' or 'view'
 */
export const trackUserInterests = async (userId, tags = [], context = 'view') => {
  if (!tags || tags.length === 0) return;

  const field = context === 'like' ? 'likedTags' : 'viewedTags';
  const normalizedTags = tags.map(t => t.toLowerCase().trim());

  try {
    // 1. Fetch current tags to handle deduplication and "freshness" in JS
    const user = await User.findById(userId).select(field);
    if (!user) return;

    let currentTags = user[field] || [];

    // Filter out these tags if they already exist (so we can move them to the end/most-recent)
    currentTags = currentTags.filter(tag => !normalizedTags.includes(tag));

    // Append new tags to the end
    const updatedTags = [...currentTags, ...normalizedTags].slice(-50);

    // Update the database
    await User.findByIdAndUpdate(userId, {
      $set: { [field]: updatedTags }
    });

  } catch (error) {
    console.error('Error tracking user interests:', error);
  }
};
