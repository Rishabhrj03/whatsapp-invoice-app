#!/usr/bin/env node
/**
 * Automated Release & Deployment Script — whatsapp-invoice-app
 * ─────────────────────────────────────────────────────────────
 * Automatically upgrades the version (stable patch by default),
 * compiles changelog notes from git history, updates in-app versioning
 * components, tags the release, and pushes to GitHub to trigger Vercel deployment.
 *
 * Usage:
 *   npm run deploy                → Bumps patch, tags, and pushes to deploy (e.g. 1.3.3 → 1.3.4)
 *   npm run release               → Same as deploy (patch + push)
 *   npm run release:patch         → Explicit patch release + push
 *   npm run release:minor         → Explicit minor release + push (e.g. 1.3.3 → 1.4.0)
 *   npm run release:major         → Explicit major release + push (e.g. 1.3.3 → 2.0.0)
 *   npm run release:local         → Bumps and tags locally without pushing
 *
 * CLI Flags:
 *   node scripts/release.mjs [patch|minor|major] [--push|--no-push] [--notes="custom notes"] [--no-tsc]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── 1. Parse Arguments & Options ─────────────────────────────────────────────
const args = process.argv.slice(2);
let bumpType = 'patch'; // Default to patch as requested
let shouldPush = true;   // Default to pushing and triggering deployment
let runTsc = true;
let customNotes = '';

for (const arg of args) {
    if (['patch', 'minor', 'major'].includes(arg)) {
        bumpType = arg;
    } else if (arg === '--push') {
        shouldPush = true;
    } else if (arg === '--no-push') {
        shouldPush = false;
    } else if (arg === '--no-tsc') {
        runTsc = false;
    } else if (arg.startsWith('--notes=')) {
        customNotes = arg.replace(/^--notes=/, '').replace(/^["']|["']$/g, '');
    }
}

console.log('\n======================================================');
console.log(`📦  AUTOMATED ${bumpType.toUpperCase()} RELEASE & DEPLOYMENT PIPELINE`);
console.log('======================================================\n');

// ── 2. Run TypeScript Pre-flight Check ───────────────────────────────────────
if (runTsc) {
    console.log('🔍  Running TypeScript pre-flight check (tsc --noEmit)...');
    try {
        execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'inherit' });
        console.log('✅  TypeScript pre-flight passed with 0 errors.\n');
    } catch (err) {
        console.error('\n❌  TypeScript check failed. Fix type errors before releasing.');
        process.exit(1);
    }
}

// ── 3. Read Current package.json & Calculate New Version ─────────────────────
const pkgPath = resolve(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let newMajor = major, newMinor = minor, newPatch = patch;
if (bumpType === 'major') {
    newMajor++;
    newMinor = 0;
    newPatch = 0;
} else if (bumpType === 'minor') {
    newMinor++;
    newPatch = 0;
} else {
    newPatch++;
}

const oldVersion = pkg.version;
const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
console.log(`📈  Version upgrade: v${oldVersion} → v${newVersion} (${bumpType} bump)`);

// ── 4. Retrieve Recent Git Commits for Release Notes ────────────────────────
let commitBullets = [];
try {
    let latestTag = '';
    try {
        latestTag = execSync('git describe --tags --abbrev=0 2>/dev/null', { cwd: ROOT }).toString().trim();
    } catch (_) {
        latestTag = '';
    }

    const logCmd = latestTag 
        ? `git log ${latestTag}..HEAD --pretty=format:"%s"` 
        : `git log -n 5 --pretty=format:"%s"`;

    const rawCommits = execSync(logCmd, { cwd: ROOT }).toString().split('\n').filter(Boolean);

    // Clean up and filter out automated release commits
    commitBullets = rawCommits
        .filter(msg => !msg.startsWith('chore(release):') && !msg.startsWith('chore: release'))
        .map(msg => msg.trim())
        .filter(Boolean);
} catch (err) {
    commitBullets = [];
}

const formattedNotes = customNotes || (commitBullets.length > 0 
    ? commitBullets.map(c => `- ${c}`).join('\n')
    : `- Automated ${bumpType} release v${newVersion} for production deployment`);

const summaryNote = customNotes || (commitBullets.length > 0
    ? commitBullets.slice(0, 3).join('; ')
    : `Stable ${bumpType} release with performance, reliability, and security improvements`);

// ── 5. Update package.json ───────────────────────────────────────────────────
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✅  Updated package.json to v${newVersion}`);

// ── 6. Update package-lock.json if present ───────────────────────────────────
const pkgLockPath = resolve(ROOT, 'package-lock.json');
if (existsSync(pkgLockPath)) {
    try {
        const pkgLock = JSON.parse(readFileSync(pkgLockPath, 'utf8'));
        pkgLock.version = newVersion;
        if (pkgLock.packages && pkgLock.packages['']) {
            pkgLock.packages[''].version = newVersion;
        }
        writeFileSync(pkgLockPath, JSON.stringify(pkgLock, null, 2) + '\n', 'utf8');
        console.log(`✅  Updated package-lock.json to v${newVersion}`);
    } catch (_) {}
}

// ── 7. Prepend CHANGELOG.md Entry ────────────────────────────────────────────
const changelogPath = resolve(ROOT, 'CHANGELOG.md');
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date());

let existingChangelog = '';
try { existingChangelog = readFileSync(changelogPath, 'utf8'); } catch (_) {}

const header = existingChangelog.startsWith('# Changelog')
    ? existingChangelog.slice(0, existingChangelog.indexOf('\n\n') + 2)
    : '# Changelog\n\nAll notable changes to this project will be documented in this file.\nFormat is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).\nThis project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n';

const body = existingChangelog.slice(header.length);

const newChangelogEntry = `## [${newVersion}] — ${today}

### 🚀 Production Release v${newVersion} (Stable ${bumpType.charAt(0).toUpperCase() + bumpType.slice(1)})

${formattedNotes}

`;

writeFileSync(changelogPath, header + newChangelogEntry + body, 'utf8');
console.log(`✅  Updated CHANGELOG.md with release v${newVersion}`);

// ── 8. Update in-app AppVersion.tsx ──────────────────────────────────────────
const appVersionPath = resolve(ROOT, 'src/components/AppVersion.tsx');
if (existsSync(appVersionPath)) {
    try {
        let appVersionContent = readFileSync(appVersionPath, 'utf8');

        // Update fallback APP_VERSION string
        appVersionContent = appVersionContent.replace(
            /const APP_VERSION = process\.env\.NEXT_PUBLIC_APP_VERSION \|\| "[^"]+";/,
            `const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "${newVersion}";`
        );

        // In CHANGELOG_SUMMARY, update previous "Current" label to "Stable"
        appVersionContent = appVersionContent.replace(/label:\s*"Current"/, 'label: "Stable"');

        // Prepend new release into CHANGELOG_SUMMARY array
        const escapedSummary = summaryNote.replace(/"/g, "'").slice(0, 180);
        const newSummaryLine = `    { version: "${newVersion}", date: "${monthYear}", label: "Current", notes: "${escapedSummary}" },\n`;
        
        appVersionContent = appVersionContent.replace(
            /const CHANGELOG_SUMMARY = \[\n/,
            `const CHANGELOG_SUMMARY = [\n${newSummaryLine}`
        );

        writeFileSync(appVersionPath, appVersionContent, 'utf8');
        console.log(`✅  Updated in-app AppVersion.tsx component to v${newVersion}`);
    } catch (err) {
        console.warn(`⚠️  Could not update AppVersion.tsx: ${err.message}`);
    }
}

// ── 9. Git Add, Commit & Tag ─────────────────────────────────────────────────
let currentBranch = 'primebake--prod';
try {
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim() || 'primebake--prod';
} catch (_) {}

try {
    execSync(`git add "${pkgPath}" "${changelogPath}"`, { cwd: ROOT, stdio: 'inherit' });
    if (existsSync(pkgLockPath)) {
        execSync(`git add "${pkgLockPath}"`, { cwd: ROOT, stdio: 'inherit' });
    }
    if (existsSync(appVersionPath)) {
        execSync(`git add "${appVersionPath}"`, { cwd: ROOT, stdio: 'inherit' });
    }

    execSync(`git commit -m "chore(release): v${newVersion} [stable release]"`, { cwd: ROOT, stdio: 'inherit' });
    execSync(`git tag -a "v${newVersion}" -m "Release v${newVersion} [stable release]"`, { cwd: ROOT, stdio: 'inherit' });
    console.log(`✅  Created git tag v${newVersion}`);
} catch (err) {
    console.error('❌  Git commit or tag failed:', err.message);
    process.exit(1);
}

// ── 10. Push to Trigger Deployment ───────────────────────────────────────────
if (shouldPush) {
    console.log(`\n🚀  Pushing release v${newVersion} to origin/${currentBranch} with tags...`);
    try {
        execSync(`git push origin ${currentBranch}`, { cwd: ROOT, stdio: 'inherit' });
        execSync(`git push origin "v${newVersion}"`, { cwd: ROOT, stdio: 'inherit' });
        console.log('\n======================================================');
        console.log(`🎉  SUCCESS: Release v${newVersion} pushed to origin/${currentBranch}!`);
        console.log(`⚡  Vercel deployment automatically triggered.`);
        console.log('======================================================\n');
    } catch (err) {
        console.error('❌  Git push failed:', err.message);
        console.log('\nYou can push manually using:');
        console.log(`    git push origin ${currentBranch} && git push origin v${newVersion}\n`);
        process.exit(1);
    }
} else {
    console.log('\n======================================================');
    console.log(`✨  Local release v${newVersion} prepared successfully (--no-push).`);
    console.log(`To trigger deployment manually, run:`);
    console.log(`    git push origin ${currentBranch} && git push origin v${newVersion}`);
    console.log('======================================================\n');
}
