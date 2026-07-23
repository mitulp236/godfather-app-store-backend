import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { App } from '../models/App.js';
import { ApiError, sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';

/** Resolves a "category" path/query value that may be either an id or a slug. */
export async function resolveCategory(idOrSlug) {
  const query = mongoose.isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: slugify(idOrSlug) };

  return Category.findOne(query);
}

/* ---------------------------------- public --------------------------------- */

/** GET /api/categories — every category, with a live app count for each. */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ order: 1, name: 1 }).lean();

  const counts = await App.aggregate([
    { $match: { published: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countByCategory = new Map(counts.map((c) => [String(c._id), c.count]));

  const data = categories.map((category) => ({
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    icon: category.icon ?? '',
    order: category.order,
    appCount: countByCategory.get(String(category._id)) ?? 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }));

  return sendSuccess(res, data, { meta: { count: data.length } });
});

/** GET /api/categories/:id — one category by id or slug. */
export const getCategory = asyncHandler(async (req, res) => {
  const category = await resolveCategory(req.params.id);
  if (!category) throw ApiError.notFound(`No category matches "${req.params.id}".`);

  return sendSuccess(res, category.toJSON());
});

/* ---------------------------------- admin ---------------------------------- */

/** POST /api/admin/categories */
export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  return sendSuccess(res, category.toJSON(), { status: 201 });
});

/** PUT /api/admin/categories/:id */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await resolveCategory(req.params.id);
  if (!category) throw ApiError.notFound(`No category matches "${req.params.id}".`);

  Object.assign(category, req.body);
  await category.save();

  return sendSuccess(res, category.toJSON());
});

/** DELETE /api/admin/categories/:id — refuses while apps still reference it. */
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await resolveCategory(req.params.id);
  if (!category) throw ApiError.notFound(`No category matches "${req.params.id}".`);

  const inUse = await App.countDocuments({ category: category._id });
  if (inUse > 0) {
    throw ApiError.conflict(
      `"${category.name}" still has ${inUse} app(s). Move or delete them first.`
    );
  }

  await category.deleteOne();
  return sendSuccess(res, { id: String(category._id), deleted: true });
});
