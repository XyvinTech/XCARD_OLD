/** Error Handler Middleware
 * @return Promise
 */

import ErrorResponse from "../utils/error.response.js";

const errorHandler = (err, req, res, next) => {
  // console.log("IM HERE");
  let error = { ...err };
  error.message = err.message;
  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = `Duplicate field value entered ${Object.keys(
      err?.keyValue
    )}`;
    error = new ErrorResponse(message, 400);
  }
  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    const message = "Reduce file size";
    error = new ErrorResponse(message, 400);
  }
  res.status(error.statusCode || 500).json({
    success: false,
    message: { error: error.message || "Server Error" },
  });
};

export default errorHandler;
