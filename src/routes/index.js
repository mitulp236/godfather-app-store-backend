import { Router } from 'express';
import mongoose from 'mongoose';
import { categoryRoutes } from './categoryRoutes.js';
import { appRoutes } from './appRoutes.js';
import { adminRoutes } from './adminRoutes.js';
import { authRoutes } from './authRoutes.js';

export const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: states[mongoose.connection.readyState] ?? 'unknown',
      uptime: Math.round(process.uptime()),
    },
  });
});

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/categories', categoryRoutes);
apiRoutes.use('/apps', appRoutes);
apiRoutes.use('/admin', adminRoutes);
