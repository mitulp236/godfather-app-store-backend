import { ApiError } from '../utils/apiResponse.js';

/**
 * Validates req.body / req.query / req.params against zod schemas and replaces
 * each with the parsed (coerced, defaulted, stripped) result.
 *
 *   router.post('/apps', validate({ body: createAppSchema }), controller)
 */
export const validate = (schemas) => (req, _res, next) => {
  for (const source of ['body', 'query', 'params']) {
    const schema = schemas[source];
    if (!schema) continue;

    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        ApiError.badRequest(
          `Invalid request ${source}.`,
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || source,
            message: issue.message,
          }))
        )
      );
    }

    // req.query is a getter-only property on Express 5+; assign defensively.
    try {
      req[source] = result.data;
    } catch {
      Object.defineProperty(req, source, { value: result.data, writable: true });
    }
  }

  return next();
};
