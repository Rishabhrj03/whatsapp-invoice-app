#!/usr/bin/env node
/**
 * Release Script — whatsapp-invoice-app
 * ─────────────────────────────────────
 * Usage:
 *   node scripts/release.mjs patch   → 1.0.0 → 1.0.1
 *   node scripts/release.mjs minor   → 1.0.0 → 1.1.0
 *   node scripts/release.mjs major   → 1.0.0 → 2.0.0
 *
 * What it does:
 *  1. Reads current version from package.json
 *  2. Bumps the version (patch / minor / major)
 *  3. Writes CHANGELOG.md entry with today's date
 *  4. Stages package.json + CHANGELOG.md
 *  5. Creates a git commit: "chore(release): v{newVersion}"
 *  6. Creates an annotated git tag: "v{newVersion}"
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── 1. Read package.json ─────────────────────────────────────────────────────
const pkgPath = resolve(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

// ── 2. Determine bump type ───────────────────────────────────────────────────
const bumpType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('❌  Usage: node scripts/release.mjs <patch|minor|major>');
    process.exit(1);
}

let newMajor = major, newMinor = minor, newPatch = patch;
if (bumpType === 'major') { newMajor++; newMinor = 0; newPatch = 0; }
if (bumpType === 'minor') { newMinor++; newPatch = 0; }
if (bumpType === 'patch') { newPatch++; }

const oldVersion = pkg.version;
const newVersion = `${newMajor}.${newMinor}.${newPatch}`;

console.log(`\n🚀  Releasing: v${oldVersion} → v${newVersion}  (${bumpType} bump)\n`);

// ── 3. Update package.json ───────────────────────────────────────────────────
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✅  package.json updated to v${newVersion}`);

// ── 4. Prepend CHANGELOG.md entry ────────────────────────────────────────────
const changelogPath = resolve(ROOT, 'CHANGELOG.md');
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

let existingChangelog = '';
try { existingChangelog = readFileSync(changelogPath, 'utf8'); } catch (_) {}

// Extract everything after the header block (lines starting with "# Changelog")
const header = existingChangelog.startsWith('# Changelog')
    ? existingChangelog.slice(0, existingChangelog.indexOf('\n\n') + 2)
    : '# Changelog\n\nAll notable changes to this project will be documented in this file.\nFormat is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).\nThis project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n';

const body = existingChangelog.slice(header.length);

const newEntry = `## [${newVersion}] — ${today}\n\n### Changed\n- ${bumpType} release v${newVersion} — see git log for detailed change list\n\n`;

writeFileSync(changelogPath, header + newEntry + body, 'utf8');
console.log(`✅  CHANGELOG.md prepended with [${newVersion}] entry`);

// ── 5. Git commit + tag ──────────────────────────────────────────────────────
try {
    execSync(`git add "${pkgPath}" "${changelogPath}"`, { cwd: ROOT, stdio: 'inherit' });
    execSync(`git commit -m "chore(release): v${newVersion}"`, { cwd: ROOT, stdio: 'inherit' });
    execSync(`git tag -a "v${newVersion}" -m "Release v${newVersion}"`, { cwd: ROOT, stdio: 'inherit' });
    console.log(`\n🏷️   Git tag v${newVersion} created.`);
    console.log(`\n✨  Release v${newVersion} complete! To push:\n`);
    console.log(`    git push && git push origin v${newVersion}\n`);
} catch (err) {
    console.error('❌  Git operations failed:', err.message);
    process.exit(1);
}
