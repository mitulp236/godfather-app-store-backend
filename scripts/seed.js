/**
 * Seeds the Godfather App Store database with sample categories and apps.
 *
 *   npm run seed          # upsert — safe to re-run, keeps anything you added
 *   npm run seed:fresh    # wipe the two collections first, then insert
 *
 * Only touches the `godfather_app_store` database (MONGODB_DB_NAME); nothing
 * else on the Atlas cluster is read or written.
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { Category } from '../src/models/Category.js';
import { App } from '../src/models/App.js';

const FRESH = process.argv.includes('--fresh');

const CATEGORIES = [
  {
    name: 'Streaming',
    slug: 'streaming',
    icon: '▶',
    order: 10,
    description: 'Players, IPTV clients and media front-ends.',
  },
  {
    name: 'Utilities',
    slug: 'utilities',
    icon: '⚙',
    order: 20,
    description: 'File managers, remotes, launchers and system tools.',
  },
  {
    name: 'Games',
    slug: 'games',
    icon: '🎮',
    order: 30,
    description: 'Controller-friendly games and emulators.',
  },
];

const APPS = [
  {
    title: 'Godfather Player',
    slug: 'streaming',
    description:
      'A hardware-accelerated media player tuned for the living room. Handles HDR10, Dolby Vision profile 8, DTS passthrough and external subtitle tracks without transcoding. Remote-first UI with a resume bar, chapter jumps and per-file audio delay memory.',
    imageUrl: 'https://picsum.photos/seed/godfather-player/440/620',
    bannerUrl: 'https://picsum.photos/seed/godfather-player-b/1280/720',
    version: '4.2.1',
    versionCode: 421,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.player',
    size: '38.4 MB',
    featured: true,
    releaseNotes:
      '• Dolby Vision profile 8.1 on Fire TV Cube (3rd gen)\n• Fixed audio drift on long MKV files\n• 40% faster library scan\n• New: hold OK to cycle subtitle tracks',
  },
  {
    title: 'Corleone IPTV',
    slug: 'streaming',
    description:
      'Xtream Codes and M3U playlist client with an EPG that actually loads fast. Multi-playlist support, catch-up TV, series auto-grouping and a picture-in-picture channel surfer bound to the left D-pad.',
    imageUrl: 'https://picsum.photos/seed/corleone-iptv/440/620',
    bannerUrl: 'https://picsum.photos/seed/corleone-iptv-b/1280/720',
    version: '2.9.0',
    versionCode: 290,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.iptv',
    size: '24.1 MB',
    featured: true,
    releaseNotes: '• Catch-up TV for providers that expose it\n• EPG now caches for 6 hours\n• Fixed logo loading on slow connections',
  },
  {
    title: 'Sicilia Cast',
    slug: 'streaming',
    description:
      'Turns the TV into a DLNA and Chromecast-compatible receiver. Push video from any phone on the network and it starts in under a second — no account, no cloud round trip.',
    imageUrl: 'https://picsum.photos/seed/sicilia-cast/440/620',
    version: '1.4.3',
    versionCode: 143,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.cast',
    size: '12.8 MB',
    releaseNotes: '• Subtitle sideloading from the sender device\n• Lower latency on 5 GHz networks',
  },
  {
    title: 'Consigliere File Manager',
    slug: 'utilities',
    description:
      'Full-featured file browser for Android TV. SMB, FTP, SFTP and WebDAV mounts, a built-in APK installer, bulk operations and a dual-pane mode designed entirely around the D-pad.',
    imageUrl: 'https://picsum.photos/seed/consigliere-fm/440/620',
    bannerUrl: 'https://picsum.photos/seed/consigliere-fm-b/1280/720',
    version: '3.1.0',
    versionCode: 310,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.files',
    size: '9.2 MB',
    featured: true,
    releaseNotes: '• SFTP key-based auth\n• Dual-pane copy is ~3× faster over SMB\n• Fixed a crash when unmounting a busy share',
  },
  {
    title: 'Omerta Launcher',
    slug: 'utilities',
    description:
      'Replaces the stock home screen with a clean, ad-free grid. Pin the apps you actually use, hide the sponsored rows, and set a custom wallpaper. Survives Fire OS updates.',
    imageUrl: 'https://picsum.photos/seed/omerta-launcher/440/620',
    version: '5.0.2',
    versionCode: 502,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.launcher',
    size: '6.7 MB',
    releaseNotes: '• Fire OS 8 compatibility\n• Per-row custom ordering\n• Optional clock and weather header',
  },
  {
    title: 'Wiretap Network Tools',
    slug: 'utilities',
    description:
      'Speed test, ping, traceroute, port scanner and a live Wi-Fi signal graph — all readable from ten feet away. Useful for working out whether the buffering is the app or the router.',
    imageUrl: 'https://picsum.photos/seed/wiretap-tools/440/620',
    version: '1.8.0',
    versionCode: 180,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.nettools',
    size: '4.3 MB',
    releaseNotes: '• IPv6 support across every tool\n• Export results to a text file',
  },
  {
    title: 'Family Business',
    slug: 'games',
    description:
      'A turn-based strategy game about running a 1950s import business. Gamepad or D-pad, four-player hotseat, and a campaign that runs about twelve hours.',
    imageUrl: 'https://picsum.photos/seed/family-business/440/620',
    bannerUrl: 'https://picsum.photos/seed/family-business-b/1280/720',
    version: '1.2.0',
    versionCode: 120,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.familybusiness',
    size: '184.6 MB',
    featured: true,
    releaseNotes: '• New campaign chapter: The Docks\n• Rebalanced negotiation difficulty\n• Cloud saves',
  },
  {
    title: 'Retro Cabinet',
    slug: 'games',
    description:
      'Multi-system emulator front-end with a shader-accurate CRT filter, per-game control profiles and automatic box-art scraping. Bring your own ROMs.',
    imageUrl: 'https://picsum.photos/seed/retro-cabinet/440/620',
    version: '2.4.5',
    versionCode: 245,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.retrocabinet',
    size: '96.0 MB',
    releaseNotes: '• Vulkan renderer on Android 10+\n• Save-state thumbnails\n• Fixed controller mapping on 8BitDo pads',
  },
  {
    title: 'Vendetta Arcade',
    slug: 'games',
    description:
      'Twelve fast arcade games in one package — all playable with nothing but the TV remote. Local high score board and a nightly challenge.',
    imageUrl: 'https://picsum.photos/seed/vendetta-arcade/440/620',
    version: '0.9.7',
    versionCode: 97,
    apkUrl: 'https://drive.google.com/file/d/1jf3crAGQ3w_MiXLM-Uk8EOlUlXFgTuYt/view?usp=sharing',
    packageName: 'com.godfather.arcade',
    size: '41.2 MB',
    releaseNotes: '• Two new games: Split and Cascade\n• Remote input latency cut by 30 ms',
  },
];

async function seed() {
  await connectDatabase();

  if (FRESH) {
    console.log('[seed] --fresh: dropping apps + categories in this database only');
    await Promise.all([App.deleteMany({}), Category.deleteMany({})]);
  }

  const categoryBySlug = new Map();
  for (const category of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { slug: category.slug },
      { $set: category },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    categoryBySlug.set(category.slug, doc._id);
    console.log(`[seed] category  ${category.icon} ${category.name}`);
  }

  for (const { slug, ...app } of APPS) {
    const categoryId = categoryBySlug.get(slug);
    if (!categoryId) throw new Error(`Unknown category slug "${slug}" for app "${app.title}"`);

    await App.findOneAndUpdate(
      { packageName: app.packageName },
      { $set: { ...app, category: categoryId, published: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`[seed] app       ${app.title} v${app.version}  (${app.packageName})`);
  }

  const [categoryCount, appCount] = await Promise.all([
    Category.countDocuments(),
    App.countDocuments(),
  ]);

  console.log(
    `\n[seed] done — database "${env.mongoDbName}" now holds ` +
      `${categoryCount} categories and ${appCount} apps.`
  );

  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error('[seed] failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
