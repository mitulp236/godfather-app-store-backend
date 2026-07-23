/**
 * Google Drive share links come in several shapes and none of them stream the
 * raw binary — they render an HTML preview page. These helpers pull the file id
 * out of any of the common forms and rebuild it as a direct-download URL.
 *
 * We use drive.usercontent.google.com/download?...&confirm=t because it is the
 * only endpoint that skips the "this file is too large to scan for viruses"
 * interstitial, which every APK worth installing will trigger.
 */

const FILE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]{10,})/, // /file/d/<id>/view
  /\/d\/([a-zA-Z0-9_-]{10,})/, // /d/<id>
  /[?&]id=([a-zA-Z0-9_-]{10,})/, // ?id=<id>
  /\/uc\/([a-zA-Z0-9_-]{10,})/, // /uc/<id>
];

export function isGoogleDriveUrl(url) {
  return /(?:^|\.)(?:drive|docs|drive\.usercontent)\.google\.com/i.test(safeHost(url));
}

export function extractDriveFileId(url) {
  if (typeof url !== 'string') return null;

  for (const pattern of FILE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // A bare file id was supplied instead of a URL.
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url.trim())) return url.trim();

  return null;
}

/**
 * Returns a URL that responds with the APK bytes.
 * Non-Drive URLs (S3, GitHub releases, a plain CDN) are passed through untouched.
 */
export function toDirectDownloadUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return url;
  if (!isGoogleDriveUrl(url)) return url;

  const fileId = extractDriveFileId(url);
  if (!fileId) return url;

  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
}

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
