import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiResponse.js';
import { resolveSessionUser } from '../controllers/authController.js';

/**
 * Guards every admin route. Two ways in, because they serve different callers:
 *
 *  • a session cookie — how the admin panel in the browser authenticates
 *  • `x-admin-key`     — how scripts and curl authenticate, with no login step
 */
export async function adminAuth(req, _res, next) {
  const header = req.get('x-admin-key');
  const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = header || bearer;

  if (provided && timingSafeEqual(provided, env.adminApiKey)) {
    req.authVia = 'api-key';
    return next();
  }

  try {
    const user = await resolveSessionUser(req);
    if (user) {
      req.user = user;
      req.authVia = 'session';
      return next();
    }
  } catch (error) {
    return next(error);
  }

  return next(ApiError.unauthorized('Sign in, or send a valid x-admin-key header.'));
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
