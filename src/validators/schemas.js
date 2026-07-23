import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a 24-character MongoDB id.');

const trimmed = (max) => z.string().trim().min(1).max(max);

const url = z
  .string()
  .trim()
  .url('Must be a valid URL.')
  .max(2048);

/* ---------------------------------- shared --------------------------------- */

export const idParamSchema = z.object({
  id: objectId,
});

/** Accepts either a Mongo id or a slug — used by /apps/:id and ?category=. */
export const idOrSlugParamSchema = z.object({
  id: z.string().trim().min(1).max(80),
});

/* -------------------------------- categories ------------------------------- */

export const createCategorySchema = z.object({
  name: trimmed(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase-with-dashes.')
    .max(60)
    .optional(),
  description: z.string().trim().max(300).optional(),
  icon: z.string().trim().max(8).optional(),
  order: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update.' }
);

/* ----------------------------------- apps ---------------------------------- */

export const createAppSchema = z.object({
  title: trimmed(120),
  description: trimmed(4000),
  /** Category id or slug — resolved to an ObjectId in the controller. */
  category: z.string().trim().min(1).max(80),
  imageUrl: url,
  bannerUrl: url.optional().or(z.literal('')),
  version: trimmed(40),
  versionCode: z.coerce.number().int().min(0).optional().nullable(),
  apkUrl: url,
  packageName: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i,
      'packageName must look like an Android package id (e.g. com.example.app).'
    ),
  size: z.string().trim().max(40).optional(),
  releaseNotes: z.string().trim().max(4000).optional(),
  featured: z.coerce.boolean().optional(),
  published: z.coerce.boolean().optional(),
});

export const updateAppSchema = createAppSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update.' }
);

export const listAppsQuerySchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(['title', '-title', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt']).default('title'),
});
