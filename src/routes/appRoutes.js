import { Router } from 'express';
import { listApps, getApp, downloadApp, checkUpdates } from '../controllers/appController.js';
import { validate } from '../middleware/validate.js';
import { idOrSlugParamSchema, listAppsQuerySchema } from '../validators/schemas.js';

export const appRoutes = Router();

appRoutes.get('/', validate({ query: listAppsQuerySchema }), listApps);

// Must be declared before /:id so "updates" isn't swallowed as an id.
appRoutes.get('/updates', checkUpdates);

appRoutes.get('/:id', validate({ params: idOrSlugParamSchema }), getApp);
appRoutes.get('/:id/download', validate({ params: idOrSlugParamSchema }), downloadApp);
