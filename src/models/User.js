import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    /**
     * Stored as given, no hashing — this was an explicit requirement ("no
     * encryption needed, keep it simple").
     *
     * Worth knowing what that trades away: anyone who can read the database can
     * read this password, and people reuse passwords. If you ever want it
     * hashed it's a small change — `npm i bcryptjs`, hash in createUser, and
     * swap the comparison in authController for `bcrypt.compare`. Nothing else
     * in the app touches this field.
     */
    password: {
      type: String,
      required: [true, 'Password is required.'],
    },
    name: {
      type: String,
      trim: true,
      default: 'Administrator',
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.password; // never leaves the server
        return ret;
      },
    },
  }
);

export const User = mongoose.model('User', userSchema);
