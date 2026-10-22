#!/usr/bin/env node
// Checks every backend call this app makes against the backend's API contract (api-contract.json,
// exported by the backend's ApiContractExportTest). A call to a route that does not exist, or with the
// wrong HTTP method, fails the build. Config: api-contract.config.json
//   { "src": ["src"], "clients": { "<axios instance>": "<prefix>" },
//     "functions": { "<helper name>": ["<METHOD>", "<prefix>"] }, "ignore": ["<regex>"] }
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, 'api-contract.config.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(root, 'api-contract.json'), 'utf8'));
const routes = contract.routes.map(r => ({ method: r.method, segs: split(r.path) }));
const ignore = (config.ignore || []).map(s => new RegExp(s));

function split(p) {
    return p.split('?')[0].split('/').filter(Boolean);
}

function files(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const f = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...files(f));
        else if (/\.(jsx?|tsx?|mjs)$/.test(e.name)) out.push(f);
    }
    return out;
}

// Template parts become wildcards: `/kyb/${id}/assign` -> ['kyb', '*', 'assign'].
function normalise(raw) {
    let p = raw.replace(/\$\{[^}]*\}/g, '*');
    p = p.split('?')[0];
    return split(p);
}

function matches(method, segs) {
    return routes.some(r => {
        if (r.method !== 'ANY' && r.method !== method) return false;
        if (r.segs.length !== segs.length) return false;
        return r.segs.every((s, i) => s.startsWith('{') || segs[i] === '*' || s === segs[i]);
    });
}

const call = /\b([A-Za-z_$][\w$]*)\.(get|post|put|patch|delete)\(\s*([`'"])((?:(?!\3).)*)\3/g;
const problems = [];
let checked = 0;
for (const dir of config.src) {
    for (const f of files(path.join(root, dir))) {
        const text = fs.readFileSync(f, 'utf8');
        let m;
        while ((m = call.exec(text))) {
            const [, client, verb, , raw] = m;
            if (!(client in config.clients)) continue;
            const prefix = config.clients[client];
            const full = (prefix + (raw.startsWith('/') ? raw : '/' + raw)).replace(/\/+/g, '/');
            if (ignore.some(r => r.test(full))) continue;
            const line = text.slice(0, m.index).split('\n').length;
            checked++;
            if (!matches(verb.toUpperCase(), normalise(full))) problems.push(`${path.relative(root, f)}:${line}  ${verb.toUpperCase()} ${full}`);
        }
    }
}
const fnNames = Object.keys(config.functions || {});
if (fnNames.length) {
    const fn = new RegExp(`\\b(${fnNames.join('|')})\\(\\s*([\`'"])((?:(?!\\2).)*)\\2`, 'g');
    for (const dir of config.src) {
        for (const f of files(path.join(root, dir))) {
            const text = fs.readFileSync(f, 'utf8');
            let m;
            while ((m = fn.exec(text))) {
                const [verb, prefix] = config.functions[m[1]];
                const full = (prefix + m[3]).replace(/\/+/g, '/');
                if (ignore.some(r => r.test(full))) continue;
                checked++;
                const line = text.slice(0, m.index).split('\n').length;
                if (!matches(verb, normalise(full))) problems.push(`${path.relative(root, f)}:${line}  ${verb} ${full}`);
            }
        }
    }
}
console.log(`API contract: ${checked} calls checked against ${routes.length} backend routes (${contract.generatedBy || 'contract'}).`);
if (problems.length) {
    console.error(`${problems.length} call(s) do not match any backend route:\n  ` + problems.join('\n  '));
    process.exit(1);
}
console.log('All calls match a backend route.');
