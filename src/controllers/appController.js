import mongoose from 'mongoose';
import { App } from '../models/App.js';
import { ApiError, sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toDirectDownloadUrl } from '../utils/drive.js';
import { resolveCategory } from './categoryController.js';

/* ---------------------------------- public --------------------------------- */

/**
 * GET /api/apps
 * Optional: ?category=<id|slug> &search= &featured=true &limit= &page= &sort=
 */
export const listApps = asyncHandler(async (req, res) => {
  const { category, search, featured, limit, page, sort } = req.query;

  const filter = {};
  // Unpublished records are only visible on the admin listing, which sets this
  // flag after adminAuth. A public query parameter would have let anyone read
  // drafts just by asking.
  if (!req.allowUnpublished) filter.published = true;

  if (category) {
    const resolved = await resolveCategory(category);
    if (!resolved) throw ApiError.notFound(`No category matches "${category}".`);
    filter.category = resolved._id;
  }

  if (typeof featured === 'boolean') filter.featured = featured;

  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { packageName: { $regex: safe, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [apps, total] = await Promise.all([
    App.find(filter)
      .populate('category', 'name slug icon')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    App.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    apps.map((app) => app.toJSON()),
    { meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } }
  );
});

/** GET /api/apps/:id — full detail by Mongo id or package name. */
export const getApp = asyncHandler(async (req, res) => {
  const app = await findAppByIdOrPackage(req.params.id);
  if (!app) throw ApiError.notFound(`No app matches "${req.params.id}".`);

  return sendSuccess(res, app.toJSON());
});

/**
 * GET /api/apps/:id/download
 * 302s to the resolved binary URL. The TV client uses this so the Drive-link
 * rewriting logic lives in exactly one place and can change without an app update.
 */
export const downloadApp = asyncHandler(async (req, res) => {
  const app = await findAppByIdOrPackage(req.params.id);
  if (!app) throw ApiError.notFound(`No app matches "${req.params.id}".`);

  return res.redirect(302, toDirectDownloadUrl(app.apkUrl));
});

/**
 * GET /api/apps/updates?packages=com.a.b,com.c.d
 * One round trip for the TV app's "what needs updating?" check on launch.
 */
export const checkUpdates = asyncHandler(async (req, res) => {
  const raw = String(req.query.packages ?? '').trim();
  if (!raw) throw ApiError.badRequest('Provide a comma-separated ?packages= list.');

  const packages = raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 200);

  const apps = await App.find({ packageName: { $in: packages }, published: true })
    .select('title packageName version versionCode apkUrl imageUrl')
    .populate('category', 'name slug');

  return sendSuccess(
    res,
    apps.map((app) => ({
      id: String(app._id),
      title: app.title,
      packageName: app.packageName,
      version: app.version,
      versionCode: app.versionCode,
      imageUrl: app.imageUrl,
      apkDirectUrl: app.apkDirectUrl,
    }))
  );
});

/* ---------------------------------- admin ---------------------------------- */

/** POST /api/admin/apps */
export const createApp = asyncHandler(async (req, res) => {
  const payload = await withResolvedCategory(req.body);

  const existing = await App.findOne({ packageName: payload.packageName });
  if (existing) {
    throw ApiError.conflict(
      `"${payload.packageName}" already exists (${existing.title}, v${existing.version}). ` +
        `Update it instead: PUT /api/admin/apps/${existing._id}`
    );
  }

  const app = await App.create(payload);
  await app.populate('category', 'name slug icon');

  return sendSuccess(res, app.toJSON(), { status: 201 });
});

/** PUT /api/admin/apps/:id — the normal path when a new APK lands on Drive. */
export const updateApp = asyncHandler(async (req, res) => {
  const app = await findAppByIdOrPackage(req.params.id);
  if (!app) throw ApiError.notFound(`No app matches "${req.params.id}".`);

  Object.assign(app, await withResolvedCategory(req.body));
  await app.save();
  await app.populate('category', 'name slug icon');

  return sendSuccess(res, app.toJSON());
});

/** DELETE /api/admin/apps/:id */
export const deleteApp = asyncHandler(async (req, res) => {
  const app = await findAppByIdOrPackage(req.params.id);
  if (!app) throw ApiError.notFound(`No app matches "${req.params.id}".`);

  await app.deleteOne();
  return sendSuccess(res, { id: String(app._id), deleted: true });
});

/* --------------------------------- helpers --------------------------------- */

function findAppByIdOrPackage(idOrPackage) {
  const query = mongoose.isValidObjectId(idOrPackage)
    ? { _id: idOrPackage }
    : { packageName: String(idOrPackage).toLowerCase() };

  return App.findOne(query).populate('category', 'name slug icon');
}

/** Turns an incoming `category` (id or slug) into the ObjectId the schema wants. */
async function withResolvedCategory(body) {
  if (!body.category) return body;

  const category = await resolveCategory(body.category);
  if (!category) {
    throw ApiError.badRequest(
      `No category matches "${body.category}". Create it first: POST /api/admin/categories`
    );
  }

  return { ...body, category: category._id };
}
