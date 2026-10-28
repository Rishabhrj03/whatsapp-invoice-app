# Versioning Guide — WhatsApp Invoice App

This document defines the branching strategy, commit message conventions, semantic version rules, and the automated release workflow for this project.

---

## 1. Semantic Versioning (semver)

All releases follow **[Semantic Versioning 2.0.0](https://semver.org/)**: `MAJOR.MINOR.PATCH`

| Segment | When to Bump | Example |
| :--- | :--- | :--- |
| **MAJOR** | Breaking API change, incompatible data schema migration, redesigned auth flow | `1.0.0` → `2.0.0` |
| **MINOR** | New feature added in a backwards-compatible manner | `1.0.0` → `1.1.0` |
| **PATCH** | Backwards-compatible bug fix, security patch, typo fix | `1.0.0` → `1.0.1` |

### Pre-release Labels
- `1.1.0-alpha.1` — Early internal alpha, unstable
- `1.1.0-beta.1`  — Feature-complete beta, testing in progress
- `1.1.0-rc.1`    — Release candidate, awaiting final sign-off

---

## 2. Branching Strategy

This project uses a **Trunk-Based Development with Long-Lived Store Branches** model, designed for multi-tenant SaaS where each client (store) gets their own deployment branch.

```
main                    ← Stable trunk; merge point for all features
├── bakingbros--dev     ← Active development for BakingBros tenant
├── bakingbros--prod    ← Production-deployed for BakingBros tenant
├── thecakeshop--prod   ← Production-deployed for The Cake Shop tenant
└── feature/*           ← Short-lived feature branches (1–5 days max)
    hotfix/*            ← Emergency patches branched off prod branches
```

### Branch Lifecycle Rules

| Branch Pattern | Created From | Merged Into | Lifespan |
| :--- | :--- | :--- | :--- |
| `main` | — | — | Permanent |
| `{tenant}--dev` | `main` | `{tenant}--prod` via PR | Permanent per tenant |
| `{tenant}--prod` | `{tenant}--dev` | — | Permanent per tenant |
| `feature/{name}` | `main` or `{tenant}--dev` | Back to source branch | < 5 days |
| `hotfix/{name}` | `{tenant}--prod` | `{tenant}--prod` + `main` | < 1 day |

### Naming Conventions
- `feature/rate-limit-signup`
- `feature/v2-api-routes`
- `hotfix/fix-idor-customer-query`
- `chore/bump-v1.1.0`

---

## 3. Commit Message Convention (Conventional Commits)

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Allowed Types

| Type | Use Case | Version Bump? |
| :--- | :--- | :--- |
| `feat` | New feature | `MINOR` |
| `fix` | Bug fix | `PATCH` |
| `perf` | Performance improvement | `PATCH` |
| `refactor` | Code restructure (no feature/fix) | `PATCH` |
| `style` | Formatting, whitespace | None |
| `docs` | Documentation only | None |
| `test` | Tests only | None |
| `chore` | Build scripts, dependencies, config | None |
| `ci` | CI/CD pipeline changes | None |
| `revert` | Reverts a previous commit | `PATCH` |

### Breaking Changes
Add `!` after the type or add `BREAKING CHANGE:` in the footer:
```
feat(api)!: replace /api/signup with /api/v2/signup
```
or
```
feat(api): add v2 signup endpoint

BREAKING CHANGE: /api/signup is now deprecated; use /api/v1/signup
```

### Examples

```bash
feat(billing): add coupon code search dropdown to POS form
fix(auth): resolve IDOR vulnerability in customer query
perf(db): add compound index on Invoice { userId, createdAt }
docs(readme): update environment variable setup instructions
chore(release): v1.1.0
refactor(services): extract InvoiceService from server actions
```

---

## 4. API Versioning

All public-facing REST API routes are versioned under `/api/v{N}/`:

| Version | Status | Routes |
| :--- | :--- | :--- |
| **v1** | ✅ Current (stable) | `POST /api/v1/signup`, `GET /api/v1/export-csv`, `GET /api/v1/health` |
| **v2** | 🔜 Planned | WhatsApp Cloud API integration, webhook verification |

### Rules
1. **Never modify a versioned endpoint's request/response shape** — create a new version instead.
2. **Deprecation Period**: A version is supported for a minimum of **6 months** after the next version is released.
3. **Sunset Header**: Deprecated endpoints return `Deprecation: true` and `Sunset: {date}` headers.
4. **Original paths** (`/api/signup`, `/api/export-csv`) re-export from the latest stable version for backwards compatibility.

---

## 5. Release Runbook

### Automated Release (Recommended)

```bash
# From your feature branch — after merge and code review:
git checkout bakingbros--dev
git pull

# Choose bump type:
npm run release patch   # Bug fix release: 1.0.0 → 1.0.1
npm run release minor   # Feature release: 1.0.0 → 1.1.0
npm run release major   # Breaking change: 1.0.0 → 2.0.0

# Push the release commit and tag:
git push && git push origin v{new-version}
```

The `npm run release` script (`scripts/release.mjs`) automatically:
1. Bumps `version` in `package.json`
2. Prepends a dated entry to `CHANGELOG.md`
3. Creates a git commit: `chore(release): v{new-version}`
4. Creates an annotated git tag: `v{new-version}`

### Manual NPM Scripts (No Git Commit)

```bash
npm run version:patch   # only bumps package.json, no git operations
npm run version:minor
npm run version:major
```

### Hotfix Release

```bash
# 1. Branch from production
git checkout bakingbros--prod
git checkout -b hotfix/fix-payment-rounding

# 2. Make the fix, commit
git commit -m "fix(billing): correct grand total rounding for UPI payments"

# 3. Release as a patch
npm run release patch

# 4. Merge back to prod and dev/main
git checkout bakingbros--prod
git merge hotfix/fix-payment-rounding
git checkout bakingbros--dev
git merge hotfix/fix-payment-rounding
git branch -d hotfix/fix-payment-rounding

# 5. Push
git push origin bakingbros--prod bakingbros--dev v{version}
```

---

## 6. Checking the Current Version

```bash
# From package.json
node -e "console.log(require('./package.json').version)"

# From the health API endpoint (runtime)
curl http://localhost:3000/api/v1/health

# Git tags
git tag -l | sort -V
```

---

## 7. Version History

| Version | Release Date | Key Highlights |
| :--- | :--- | :--- |
| `0.1.0` | 2026-05-01 | Initial development build: auth, invoicing, WhatsApp sharing |
| `1.0.0` | 2026-10-29 | Production-ready: SOLID architecture, RBAC, rate limiting, security headers, API v1, responsive UI |
