/**
 * Wraps async route handlers to automatically forward errors to Express
 * global error handler — eliminates the need for try/catch in every route.
 *
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
