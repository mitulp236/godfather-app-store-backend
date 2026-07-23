/**
 * Creates (or updates) an admin panel user.
 *
 *   npm run create-user -- --email you@example.com --password 'secret'
 *   npm run create-user -- --email you@example.com --password 'new' --name 'Mitul'
 *
 * Re-running with an existing email resets that user's password rather than
 * failing, which is the behaviour you actually want when you've locked yourself
 * out. There is no signup endpoint — this script is the only way to add a user.
 */
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

async function prompt(question, { silent = false } = {}) {
  const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
  if (silent) {
    // Suppress echo so a typed password doesn't linger in the scrollback.
    const onData = () => rl.output.write('[2K[200D' + question);
    rl.input.on('data', onData);
    const answer = await rl.question(question);
    rl.input.off('data', onData);
    rl.output.write('\n');
    rl.close();
    return answer;
  }
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = String(args.email ?? (await prompt('Email: ')))
    .trim()
    .toLowerCase();
  const password = String(args.password ?? (await prompt('Password: ', { silent: true })));
  const name = args.name ? String(args.name) : 'Administrator';

  if (!email || !email.includes('@')) throw new Error('A valid --email is required.');
  if (!password || password.length < 4) throw new Error('--password must be at least 4 characters.');

  await connectDatabase();

  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = password;
    if (args.name) existing.name = name;
    await existing.save();

    // Any old sessions were issued against the previous password.
    const { deletedCount } = await Session.deleteMany({ user: existing._id });
    console.log(`[users] updated password for ${email}`);
    if (deletedCount) console.log(`[users] revoked ${deletedCount} existing session(s)`);
  } else {
    await User.create({ email, password, name });
    console.log(`[users] created ${email}`);
  }

  const total = await User.countDocuments();
  console.log(`[users] database "${env.mongoDbName}" now has ${total} user(s).`);
  console.log(`[users] sign in at ${env.adminPath}`);

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error('[users] failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
