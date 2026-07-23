/** Every response on this API has the same envelope so the TV client never guesses. */

export function sendSuccess(res, data, { status = 200, meta } = {}) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function sendError(res, { status = 500, message, code = 'INTERNAL_ERROR', details }) {
  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

/** Thrown anywhere in a controller; picked up by the error middleware. */
export class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Missing or invalid admin key.') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message, details) {
    return new ApiError(409, message, 'CONFLICT', details);
  }
}
