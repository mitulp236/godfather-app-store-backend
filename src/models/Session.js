import mongoose from 'mongoose';

/**
 * Sessions live in MongoDB rather than in memory so a restart (or Render's free
 * tier spinning the dyno down) doesn't log you out.
 *
 * `expiresAt` carries a TTL index, so Mongo removes stale rows itself — there's
 * no cleanup job to forget about.
 */
const sessionSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema);
