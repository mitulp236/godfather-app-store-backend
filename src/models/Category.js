import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required.'],
      trim: true,
      maxlength: 60,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    /** Emoji or short glyph rendered next to the row title on TV. */
    icon: {
      type: String,
      trim: true,
      maxlength: 8,
      default: '',
    },
    /** Lower numbers surface first on the home screen. */
    order: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: transformCategory },
    toObject: { virtuals: true, transform: transformCategory },
  }
);

categorySchema.pre('validate', function generateSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

categorySchema.index({ order: 1, name: 1 });

function transformCategory(_doc, ret) {
  ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;
  return ret;
}

export const Category = mongoose.model('Category', categorySchema);
