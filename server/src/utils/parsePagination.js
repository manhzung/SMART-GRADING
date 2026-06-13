/**
 * Parse pagination query params from Express req.query.
 * Express returns all query params as strings, but Mongoose requires numbers.
 */
function parsePagination(query, defaults = {}) {
  const page = parseInt(query.page, 10) || defaults.page || 1;
  const limit = parseInt(query.limit, 10) || defaults.limit || 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = { parsePagination };
