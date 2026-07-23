# Godfather App Store — Backend API + Admin Panel

Node.js + Express + MongoDB Atlas. Serves the curated app catalogue that the Android TV / Fire TV
client browses, and resolves Google Drive share links into direct APK downloads.

---

## Quick start

```bash
cd backend
npm install
cp .env.example .env        # then fill in MONGODB_URI + ADMIN_API_KEY
npm run seed                # creates 3 categories + 9 sample apps
npm run dev                 # http://localhost:4100
```

Verify:

```bash
curl localhost:4100/api/health
curl localhost:4100/api/categories
```

> The default port is **4100** (4000 is commonly taken). Change `PORT` in `.env` freely — just keep
> the TV app's `VITE_API_BASE_URL` pointing at the same place.

---

## Environment

| Variable          | Required | Description                                                               |
| ----------------- | -------- | ------------------------------------------------------------------------- |
| `PORT`            | no       | Listen port. Default `4100`.                                              |
| `NODE_ENV`        | no       | `development` / `production`. Affects log format and error verbosity.     |
| `MONGODB_URI`     | **yes**  | Atlas connection string, without a trailing database name.                |
| `MONGODB_DB_NAME` | no       | Database to use on that cluster. Default `godfather_app_store`.           |
| `ADMIN_API_KEY`   | **yes**  | Shared secret for every `/api/admin/*` route.                             |
| `CORS_ORIGIN`     | no       | `*` or a comma-separated origin list. Default `*`.                        |

`MONGODB_DB_NAME` is passed to Mongoose separately from the URI, so this service only ever reads or
writes its own database on the cluster — nothing else on it is touched.

Generate an admin key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Admin panel

A browser UI for managing categories and apps — no curl required.

**http://localhost:4100/godfather-app-store/admin**

Plain HTML + vanilla JavaScript, no framework. The only generated file is `public/admin/styles.css`
(Tailwind), which is committed so a deploy never has to build CSS. Rebuild it after editing
`src/admin/admin.css`:

```bash
npm run build:css     # one-off
npm run watch:css     # while editing
```

What it does: create / edit / delete apps and categories, live image preview from a pasted URL,
search and category filter, featured and published toggles, and a delete guard that refuses to
remove a category still holding apps.

### Users

There is **no signup**. Users are created from the command line:

```bash
npm run create-user -- --email you@example.com --password 'your-password'
npm run create-user -- --email you@example.com --password 'new-one'   # resets an existing user
```

Re-running for an existing email resets that password and revokes their sessions, which is what you
want when you've locked yourself out. Omit the flags and it prompts instead.

Sign-in issues an `httpOnly` session cookie stored in MongoDB with a TTL index, so a restart doesn't
sign you out and Mongo expires old rows by itself.

> **On password storage:** passwords are saved as plain text, which was an explicit requirement for
> this project. Anyone with database access can read them, so don't reuse a password here. Switching
> to hashes is a small, contained change — see the comment in `src/models/User.js`.

---

## Endpoints

Every route is mounted under `BASE_PATH` (default `/godfather-app-store`), so the paths in the
tables below are relative to:

```
http://localhost:4100/godfather-app-store/api
```

Every response uses the same envelope:

```jsonc
// success
{ "success": true, "data": … , "meta": { … } }

// failure
{ "success": false, "error": { "code": "NOT_FOUND", "message": "…", "details": [ … ] } }
```

### Public

| Method | Path                        | Notes                                                              |
| ------ | --------------------------- | ------------------------------------------------------------------ |
| `GET`  | `/api/health`               | Liveness + database state.                                          |
| `GET`  | `/api/categories`           | All categories, sorted by `order`, each with a live `appCount`.     |
| `GET`  | `/api/categories/:idOrSlug` | One category.                                                       |
| `GET`  | `/api/apps`                 | All published apps. Filters below.                                  |
| `GET`  | `/api/apps/:idOrPackage`    | One app, by Mongo id **or** `packageName`.                          |
| `GET`  | `/api/apps/:idOrPackage/download` | `302` to the resolved binary URL.                            |
| `GET`  | `/api/apps/updates?packages=a.b,c.d` | Bulk version lookup for the TV app's launch check.      |

`GET /api/apps` query parameters:

| Param      | Example              | Description                                        |
| ---------- | -------------------- | -------------------------------------------------- |
| `category` | `?category=games`    | Category id **or** slug.                           |
| `search`   | `?search=player`     | Case-insensitive title / description / package.    |
| `featured` | `?featured=true`     | Only the home-screen hero row.                     |
| `sort`     | `?sort=-updatedAt`   | `title`, `createdAt`, `updatedAt` (± prefix).      |
| `page`     | `?page=2`            | Default `1`.                                       |
| `limit`    | `?limit=50`          | Default `100`, max `200`.                          |

### Auth

| Method | Path            | Notes                                             |
| ------ | --------------- | ------------------------------------------------- |
| `POST` | `/api/auth/login`  | `{ email, password }` → sets the session cookie. |
| `POST` | `/api/auth/logout` | Clears the cookie and deletes the session.       |
| `GET`  | `/api/auth/me`     | Current user, or `401`.                          |

### Admin — session cookie **or** `x-admin-key: <ADMIN_API_KEY>`

The panel uses the cookie; scripts and curl use the key. Either is accepted.

| Method   | Path                              |
| -------- | --------------------------------- |
| `GET`    | `/api/admin/ping`                 |
| `GET`    | `/api/admin/apps`                 |
| `GET`    | `/api/admin/categories`           |
| `POST`   | `/api/admin/categories`           |
| `PUT`    | `/api/admin/categories/:idOrSlug` |
| `DELETE` | `/api/admin/categories/:idOrSlug` |
| `POST`   | `/api/admin/apps`                 |
| `PUT`    | `/api/admin/apps/:idOrPackage`    |
| `DELETE` | `/api/admin/apps/:idOrPackage`    |

Deleting a category that still has apps returns `409` rather than orphaning them.

`GET /api/admin/apps` includes **unpublished** records; the public `GET /api/apps` never does.

---

## Adding a new app (the normal workflow)

1. Upload the `.apk` to Google Drive and set sharing to **Anyone with the link**.
2. Copy the share URL — any Drive form works, the API extracts the file id itself.
3. `POST` it:

```bash
curl -X POST http://localhost:4100/api/admin/apps \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H 'content-type: application/json' \
  -d '{
    "title": "My App",
    "description": "What it does.",
    "category": "utilities",
    "imageUrl": "https://…/icon.png",
    "version": "1.0.0",
    "versionCode": 100,
    "apkUrl": "https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
    "packageName": "com.example.myapp",
    "size": "12.4 MB",
    "releaseNotes": "First release."
  }'
```

Shipping a **new version** of an existing app — bump the fields, same package name:

```bash
curl -X PUT http://localhost:4100/api/admin/apps/com.example.myapp \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H 'content-type: application/json' \
  -d '{ "version": "1.1.0", "versionCode": 110,
        "apkUrl": "https://drive.google.com/file/d/NEW_FILE_ID/view",
        "releaseNotes": "• Fixed the thing" }'
```

The TV app compares `versionCode` (falling back to the `version` string) against what's installed on
the device and flips the button from **Install** to **Update** on its own.

---

## Google Drive link handling

Drive share URLs render an HTML preview page, and files over ~100 MB add a virus-scan interstitial —
either one hands the downloader HTML instead of an APK.

`src/utils/drive.js` extracts the file id from any Drive URL shape and rebuilds it as:

```
https://drive.usercontent.google.com/download?id=<FILE_ID>&export=download&confirm=t
```

which streams raw bytes regardless of size. Exposed as the `apkDirectUrl` field on every app, and as
the `/download` redirect. Non-Drive URLs (S3, GitHub releases, any CDN) pass through untouched.

**The file must be shared as "Anyone with the link".** A restricted file returns an HTML sign-in page
and the install will fail with a parse error.

---

## Project structure

```
backend/
├── src/
│   ├── config/         env.js (validated config), db.js (Atlas connection)
│   ├── models/         Category.js, App.js — Mongoose schemas + JSON transforms
│   ├── validators/     schemas.js — zod schemas for every body/query/param
│   ├── middleware/     validate.js, adminAuth.js, errorHandler.js
│   ├── controllers/    categoryController.js, appController.js
│   ├── routes/         index.js, categoryRoutes.js, appRoutes.js, adminRoutes.js
│   ├── utils/          drive.js, apiResponse.js, asyncHandler.js, slugify.js
│   ├── app.js          Express wiring (helmet, cors, compression, rate limit)
│   └── server.js       Bootstrap + graceful shutdown
├── scripts/seed.js
└── .env.example
```

---

## Deployment — Render

Render is the recommendation here: native Node runtime (no Dockerfile), a free tier that suits a
personal store, and zero-config deploys from Git.

1. Push this folder to GitHub.
2. Render → **New → Web Service** → pick the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. Add environment variables: `MONGODB_URI`, `MONGODB_DB_NAME`, `ADMIN_API_KEY`, `NODE_ENV=production`.
   Leave `PORT` unset — Render injects it.
5. In **Atlas → Network Access**, allow `0.0.0.0/0` (Render's egress IPs are not static on the free
   tier).
6. Seed once against production: `MONGODB_URI=… npm run seed` from your machine.

Then point the TV app at `https://<your-service>.onrender.com`.

> The free tier sleeps after ~15 minutes idle and takes ~30 s to wake. Fine for a personal store; the
> TV app shows a loading state. The $7/mo Starter tier removes it.

**Railway / Fly.io** work equally well — Railway is the closest alternative (also no Dockerfile
needed), Fly requires a `fly.toml` plus a Dockerfile for marginal benefit at this scale.

---

## Security notes

- `helmet`, `compression`, and a 300 req/min rate limit are on by default.
- Admin key comparison is timing-safe.
- CORS is wide open by default because the TV WebView's origin is `http://localhost` /
  `capacitor://localhost`. Restrict `CORS_ORIGIN` if you ever expose a web UI.
- The admin key is a bearer secret: anyone holding it can add apps. Keep it out of the TV app bundle
  — the client only ever calls public read endpoints.
