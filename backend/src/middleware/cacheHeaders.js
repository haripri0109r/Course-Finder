/**
 * Performance middleware for high-traffic feeds.
 * Adds browser and CDN caching for 1 minute to reduce DB load.
 */
export const cacheHeaders = (req, res, next) => {
  // Only cache GET requests that are successful
  if (req.method === 'GET') {
    res.set("Cache-Control", "public, max-age=60, s-maxage=60"); // 1 min cache
  }
  next();
};
