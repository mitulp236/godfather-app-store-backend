import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { env } from '../config/env.js';
import { ApiError, sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const SESSION_COOKIE = 'gf_session';

function sessionCookieOptions() {
  return {
    httpOnly: true, // not readable from JavaScript
    sameSite: 'lax',
    secure: env.isProduction, // HTTPS-only once deployed
    path: env.adminCookiePath,
    maxAge: env.sessionTtlDays * 24 * 60 * 60 * 1000,
  };
}

/** POST /auth/login */
export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');

  if (!email || !password) {
    throw ApiError.badRequest('Email and password are both required.');
  }

  const user = await User.findOne({ email });

  // Same message either way — saying "no such user" tells an attacker which
  // half of the guess was right.
  if (!user || !constantTimeEquals(user.password, password)) {
    throw new ApiError(401, 'That email and password combination is not correct.', 'INVALID_LOGIN');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.sessionTtlDays * 24 * 60 * 60 * 1000);

  await Session.create({
    token,
    user: user._id,
    userAgent: req.get('user-agent') ?? '',
    expiresAt,
  });

  user.lastLoginAt = new Date();
  await user.save();

  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());

  return sendSuccess(res, { user: user.toJSON() });
});

/** POST /auth/logout */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await Session.deleteOne({ token });

  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
  return sendSuccess(res, { loggedOut: true });
});

/** GET /auth/me — the admin panel calls this on load to decide where to send you. */
export const me = asyncHandler(async (req, res) => {
  const user = await resolveSessionUser(req);
  if (!user) throw ApiError.unauthorized('Not signed in.');

  return sendSuccess(res, { user: user.toJSON() });
});

/** Returns the signed-in User document, or null. Shared with adminAuth. */
export async function resolveSessionUser(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const session = await Session.findOne({ token }).populate('user');
  if (!session || !session.user) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  return session.user;
}

function constantTimeEquals(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
