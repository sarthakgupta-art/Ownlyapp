#!/usr/bin/env node
/**
 * Minimal Expo push server for the Ownly Club app.
 *
 * Two jobs, and deliberately nothing more:
 *   1. Accept device registrations from the app (POST /register).
 *   2. Send a campaign to the devices that opted into a topic (CLI `send`).
 *
 * Storage is a JSON file. That is genuinely sufficient at Ownly's scale — a few
 * thousand devices — and it means the whole thing runs with zero dependencies
 * and zero infrastructure. Swap `readStore`/`writeStore` for a database when
 * that stops being true.
 *
 *   Run the server:  node server/push-server.mjs serve
 *   Send a campaign: node server/push-server.mjs send --topic drops \
 *                      --title "Just landed" --body "Tom Ford Oud Wood is back" \
 *                      --type product --handle tom-ford-oud-wood
 *   Show stats:      node server/push-server.mjs stats
 */

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = process.env.PUSH_STORE_PATH ?? resolve(HERE, 'data', 'devices.json');
const PORT = Number(process.env.PORT ?? 8787);
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/**
 * Expo rejects a batch larger than 100, and rate-limits well below the size a
 * naive `Promise.all` over every device would produce.
 */
const BATCH_SIZE = 100;

const VALID_TOPICS = new Set(['drops', 'priceDrops', 'orders', 'offers']);

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

async function readStore() {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.devices) ? parsed : { devices: [] };
  } catch (error) {
    if (error.code === 'ENOENT') return { devices: [] };
    throw error;
  }
}

async function writeStore(store) {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function isExpoToken(value) {
  return typeof value === 'string' && /^ExponentPushToken\[[^\]]+\]$/.test(value);
}

/* -------------------------------------------------------------------------- */
/* Registration endpoint                                                       */
/* -------------------------------------------------------------------------- */

async function upsertDevice(payload) {
  if (!isExpoToken(payload.token)) {
    throw Object.assign(new Error('A valid ExponentPushToken is required.'), { status: 400 });
  }

  const store = await readStore();
  const preferences = {
    drops: payload.preferences?.drops !== false,
    priceDrops: payload.preferences?.priceDrops !== false,
    orders: payload.preferences?.orders !== false,
    offers: payload.preferences?.offers === true,
  };

  const record = {
    token: payload.token,
    platform: typeof payload.platform === 'string' ? payload.platform : 'unknown',
    appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : null,
    preferences,
    updatedAt: new Date().toISOString(),
  };

  const index = store.devices.findIndex((device) => device.token === record.token);
  if (index >= 0) {
    // Keep the original registration date so churn stays measurable.
    record.createdAt = store.devices[index].createdAt ?? record.updatedAt;
    store.devices[index] = record;
  } else {
    record.createdAt = record.updatedAt;
    store.devices.push(record);
  }

  await writeStore(store);
  return { ok: true, total: store.devices.length };
}

function readBody(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      // A registration payload is a few hundred bytes; anything larger is abuse.
      if (size > 16_384) {
        rejectPromise(Object.assign(new Error('Payload too large.'), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')));
    request.on('error', rejectPromise);
  });
}

function serve() {
  const server = createServer(async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(body));
    };

    if (request.method === 'GET' && request.url === '/health') {
      const store = await readStore();
      send(200, { ok: true, devices: store.devices.length });
      return;
    }

    if (request.method !== 'POST' || request.url !== '/register') {
      send(404, { error: 'Not found' });
      return;
    }

    try {
      const raw = await readBody(request);
      const payload = JSON.parse(raw);
      const result = await upsertDevice(payload);
      send(200, result);
    } catch (error) {
      send(error.status ?? 400, { error: error.message });
    }
  });

  server.listen(PORT, () => {
    console.log(`Push registration server listening on http://localhost:${PORT}`);
    console.log(`Point EXPO_PUBLIC_PUSH_REGISTRATION_URL at http://<host>:${PORT}/register`);
    console.log(`Devices stored in ${STORE_PATH}`);
  });
}

/* -------------------------------------------------------------------------- */
/* Sending                                                                     */
/* -------------------------------------------------------------------------- */

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Expo replies per-message. A `DeviceNotRegistered` error is permanent — the app
 * was uninstalled — so those tokens are pruned rather than retried forever.
 */
async function sendBatch(messages) {
  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'accept-encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push failed with status ${response.status}`);
  }
  const body = await response.json();
  return Array.isArray(body.data) ? body.data : [];
}

async function sendCampaign(options) {
  const { topic, title, body, type, handle, query, channelId } = options;

  if (!VALID_TOPICS.has(topic)) {
    throw new Error(`--topic must be one of: ${[...VALID_TOPICS].join(', ')}`);
  }
  if (!title || !body) throw new Error('--title and --body are required.');

  const store = await readStore();
  const recipients = store.devices.filter((device) => device.preferences?.[topic] === true);

  if (recipients.length === 0) {
    console.log(`No devices opted into "${topic}".`);
    return;
  }

  // The app maps {type, handle} to a route itself, so campaigns never need to
  // know the app's routing table.
  const data = {};
  if (type) data.type = type;
  if (handle) data.handle = handle;
  if (query) data.query = query;

  const messages = recipients.map((device) => ({
    to: device.token,
    title,
    body,
    data,
    sound: 'default',
    channelId: channelId ?? (topic === 'orders' ? 'orders' : topic === 'offers' ? 'offers' : 'drops'),
  }));

  let sent = 0;
  const stale = new Set();

  for (const batch of chunk(messages, BATCH_SIZE)) {
    const tickets = await sendBatch(batch);
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sent += 1;
        return;
      }
      const token = batch[index]?.to;
      console.warn(`  ! ${token}: ${ticket.message ?? 'unknown error'}`);
      if (ticket.details?.error === 'DeviceNotRegistered' && token) stale.add(token);
    });
  }

  if (stale.size > 0) {
    store.devices = store.devices.filter((device) => !stale.has(device.token));
    await writeStore(store);
  }

  console.log(`Sent ${sent}/${recipients.length} for topic "${topic}".`);
  if (stale.size > 0) console.log(`Pruned ${stale.size} uninstalled device(s).`);
}

async function stats() {
  const store = await readStore();
  const counts = { drops: 0, priceDrops: 0, orders: 0, offers: 0 };
  const platforms = {};
  for (const device of store.devices) {
    for (const topic of VALID_TOPICS) {
      if (device.preferences?.[topic]) counts[topic] += 1;
    }
    platforms[device.platform] = (platforms[device.platform] ?? 0) + 1;
  }
  console.log(`Devices: ${store.devices.length}`);
  console.log('By platform:', platforms);
  console.log('Opted in by topic:', counts);
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                         */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case 'serve':
    serve();
    break;
  case 'send':
    sendCampaign(parseArgs(rest)).catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
    break;
  case 'stats':
    stats().catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
    break;
  default:
    console.log('Usage: node server/push-server.mjs <serve|send|stats>');
    console.log('  serve                        Start the registration endpoint');
    console.log('  send --topic <t> --title <s> --body <s> [--type product --handle <h>]');
    console.log('  stats                        Show device and opt-in counts');
    process.exit(command ? 1 : 0);
}
