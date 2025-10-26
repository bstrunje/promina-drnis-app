/**
 * Automatski ažurira CACHE_VERSION u service-worker.js
 * Pokreće se prije build-a
 */

const fs = require('fs');
const path = require('path');

const SW_PATH = path.join(__dirname, '../public/service-worker.js');

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
