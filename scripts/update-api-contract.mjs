#!/usr/bin/env node
// Refreshes api-contract.json from the backend's export (the "api-contract" artifact of the backend CI,
// written by ApiContractExportTest to target/api-contract.json).
//   node scripts/update-api-contract.mjs /path/to/api-contract.json
import fs from 'node:fs';
const src = process.argv[2];
if (!src) { console.error('usage: update-api-contract.mjs <path to backend api-contract.json>'); process.exit(2); }
const c = JSON.parse(fs.readFileSync(src, 'utf8'));
if (!Array.isArray(c.routes) || c.routes.length < 50) { console.error('not an API contract export'); process.exit(1); }
const slim = { generatedBy: c.generatedBy, routes: c.routes.map(r => ({ method: r.method, path: r.path, access: r.access ?? null })) };
fs.writeFileSync('api-contract.json', JSON.stringify(slim, null, 1) + '\n');
console.log(`api-contract.json updated: ${slim.routes.length} routes`);
