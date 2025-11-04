/**
 * Automatski ažurira CACHE_VERSION u service-worker.js
 * Pokreće se prije build-a
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SW_PATH = path.join(__dirname, '../public/service-worker.js');
const VERSION_JSON_PATH = path.join(__dirname, '../public/version.json');

// Generiraj verziju (možeš koristiti package.json verziju ili datum)
const today = new Date();
const version = `v${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

// Pročitaj service worker
let swContent = fs.readFileSync(SW_PATH, 'utf8');

// Zamijeni CACHE_VERSION
swContent = swContent.replace(
  /const CACHE_VERSION = ['"]v[\w-]+['"]/,
  `const CACHE_VERSION = '${version}'`
);

// Spremi nazad
fs.writeFileSync(SW_PATH, swContent, 'utf8');

console.log(`✅ Service Worker cache version updated to: ${version}`);

const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.COMMIT_SHA || '';
const iso = new Date().toISOString();
const versionJson = { version: sha ? `${iso}-${String(sha).slice(0, 7)}` : iso };
fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(versionJson, null, 2) + '\n', 'utf8');
console.log(`✅ version.json updated to: ${versionJson.version}`);
