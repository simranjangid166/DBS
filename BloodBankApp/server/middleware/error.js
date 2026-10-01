const { fail } = require("../utils/http");

function notFound(_req, res) {
  return fail(res, "Route not found", 404);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  console.error("[error]", err);
  const status = err.status || 500;
  return fail(res, err.message || "Internal Server Error", status);
}

module.exports = { notFound, errorHandler };
