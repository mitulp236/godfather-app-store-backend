import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me } from '../controllers/authController.js';

export const authRoutes = Router();

// Login is the one endpoint worth throttling hard — everything else behind it
// already requires a session.
const loginLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again shortly.' },
  },
});

authRoutes.post('/login', loginLimiter, login);
authRoutes.post('/logout', logout);
authRoutes.get('/me', me);
