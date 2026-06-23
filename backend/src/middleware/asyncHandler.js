// Wraps async route handlers so unhandled promise rejections return 500 instead of crashing
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
