import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError, sendError } from '../utils/apiResponse.js';

export function notFoundHandler(req, res) {
  return sendError(res, {
    status: 404,
    code: 'NOT_FOUND',
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return sendError(res, {
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return sendError(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'One or more fields failed validation.',
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return sendError(res, {
      status: 400,
      code: 'INVALID_ID',
      message: `"${err.value}" is not a valid ${err.kind}.`,
    });
  }

  // Duplicate key on a unique index (e.g. two categories with the same slug).
  if (err?.code === 11000) {
    return sendError(res, {
      status: 409,
      code: 'DUPLICATE_KEY',
      message: `A record with that ${Object.keys(err.keyPattern ?? {}).join(', ')} already exists.`,
    });
  }

  console.error('[error]', err);

  return sendError(res, {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: env.isProduction ? 'Something went wrong.' : err.message,
  });
}
