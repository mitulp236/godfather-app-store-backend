import { Router } from 'express';
import { listCategories, getCategory } from '../controllers/categoryController.js';
import { validate } from '../middleware/validate.js';
import { idOrSlugParamSchema } from '../validators/schemas.js';

export const categoryRoutes = Router();

categoryRoutes.get('/', listCategories);
categoryRoutes.get('/:id', validate({ params: idOrSlugParamSchema }), getCategory);
