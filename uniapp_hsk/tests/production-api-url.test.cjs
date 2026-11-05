'use strict';
// Guards against publishing the mini-program with a LAN/dev backend address.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const source = fs.readFileSync(path.join(__dirname, '../utils/request.js'), 'utf8');
const urls = [...source.matchAll(/this\.baseURL\s*=\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
assert(urls.length > 0, 'baseURL assignments missing');
for (const url of urls) assert.strictEqual(url, 'https://api.goomooplay.com/api', 'non-production baseURL: ' + url);
console.log('PASS: every baseURL points at https://api.goomooplay.com/api');
