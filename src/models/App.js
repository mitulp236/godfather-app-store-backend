import mongoose from 'mongoose';
import { toDirectDownloadUrl } from '../utils/drive.js';

const appSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      maxlength: 4000,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required.'],
      index: true,
    },
    /** Square-ish icon / poster shown in the browse rows. */
    imageUrl: {
      type: String,
      required: [true, 'imageUrl is required.'],
      trim: true,
    },
    /** Optional 16:9 art used as the details-screen backdrop. */
    bannerUrl: {
      type: String,
      trim: true,
      default: '',
    },
    version: {
      type: String,
      required: [true, 'Version is required.'],
      trim: true,
      maxlength: 40,
    },
    /**
     * Android versionCode. Optional, but when present the TV app compares this
     * integer instead of parsing the version string — far more reliable.
     */
    versionCode: {
      type: Number,
      min: 0,
      default: null,
    },
    apkUrl: {
      type: String,
      required: [true, 'apkUrl is required.'],
      trim: true,
    },
    packageName: {
      type: String,
      required: [true, 'packageName is required.'],
      trim: true,
      lowercase: true,
      index: true,
      match: [
        /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i,
        'packageName must look like an Android package id (e.g. com.example.app).',
      ],
    },
    /** Human readable ("38.4 MB") or raw byte count — stored as given. */
    size: {
      type: String,
      trim: true,
      default: '',
    },
    releaseNotes: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    /** Pinned to the top "Featured" row on the TV home screen. */
    featured: {
      type: Boolean,
      default: false,
    },
    /** Hidden from the public /apps endpoints without deleting the record. */
    published: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: transformApp },
    toObject: { virtuals: true, transform: transformApp },
  }
);

/**
 * The URL the TV client actually streams bytes from. Derived on read so that
 * editing apkUrl never leaves a stale mirror of it in the database.
 */
appSchema.virtual('apkDirectUrl').get(function apkDirectUrl() {
  return toDirectDownloadUrl(this.apkUrl);
});

appSchema.index({ featured: -1, updatedAt: -1 });
appSchema.index({ title: 'text', description: 'text' });

function transformApp(_doc, ret) {
  ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;

  // A populated category becomes a nested object; an unpopulated one stays an id string.
  if (ret.category && typeof ret.category === 'object' && ret.category.id) {
    ret.category = {
      id: ret.category.id,
      name: ret.category.name,
      slug: ret.category.slug,
      icon: ret.category.icon ?? '',
    };
  } else if (ret.category) {
    ret.category = String(ret.category);
  }

  return ret;
}

export const App = mongoose.model('App', appSchema);
