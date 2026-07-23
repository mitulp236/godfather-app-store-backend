import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { listApps, createApp, updateApp, deleteApp } from '../controllers/appController.js';
import {
  createAppSchema,
  updateAppSchema,
  createCategorySchema,
  updateCategorySchema,
  idOrSlugParamSchema,
  listAppsQuerySchema,
} from '../validators/schemas.js';

export const adminRoutes = Router();

// Everything below requires a session cookie or the x-admin-key header.
adminRoutes.use(adminAuth);

/** Handy smoke test that auth is working. */
adminRoutes.get('/ping', (_req, res) =>
  res.json({ success: true, data: { authenticated: true } })
);

/** Marks the request as allowed to see unpublished records. */
const allowUnpublished = (req, _res, next) => {
  req.allowUnpublished = true;
  next();
};

/* -------------------------------- categories ------------------------------- */

adminRoutes.get('/categories', listCategories);
adminRoutes.post('/categories', validate({ body: createCategorySchema }), createCategory);
adminRoutes.put(
  '/categories/:id',
  validate({ params: idOrSlugParamSchema, body: updateCategorySchema }),
  updateCategory
);
adminRoutes.delete('/categories/:id', validate({ params: idOrSlugParamSchema }), deleteCategory);

/* ----------------------------------- apps ---------------------------------- */

// Includes unpublished apps — the panel needs to see and edit drafts.
adminRoutes.get('/apps', allowUnpublished, validate({ query: listAppsQuerySchema }), listApps);
adminRoutes.post('/apps', validate({ body: createAppSchema }), createApp);
adminRoutes.put(
  '/apps/:id',
  validate({ params: idOrSlugParamSchema, body: updateAppSchema }),
  updateApp
);
adminRoutes.delete('/apps/:id', validate({ params: idOrSlugParamSchema }), deleteApp);
