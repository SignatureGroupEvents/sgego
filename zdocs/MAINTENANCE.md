# Dependency & security maintenance

Practical guide for a small team. Frontend and backend each have their own `package.json` — run commands from the folder that contains the file you are maintaining (`frontend/` or `backend/`).

---

## Check for vulnerabilities (`npm audit`)

From `frontend/` or `backend/`:

```bash
npm audit
```

**What you are looking for**

- **Severity:** `critical` and `high` deserve attention first; `moderate` and `low` are triaged when you have time.
- **Path:** Which dependency chain leads to the vulnerable package (direct vs transitive).
- **Fix available:** If npm suggests `npm audit fix`, read the advisory first — “fix” can still be a breaking semver jump for a dependency.

```bash
npm audit --json
```

Useful for CI or pasting into a ticket; same data, machine-readable.

**`npm audit fix` vs `npm audit fix --force`**

- Prefer **`npm audit fix`** (respects semver ranges in `package.json`).
- Avoid **`--force`** unless you understand the major upgrades it may apply; it can break the app.

If there is no fix yet, note the advisory ID, check the package’s issue tracker or GitHub advisory, and plan an upgrade or replacement when a patched version exists.

---

## Pinned dependencies (e.g. axios `1.9.0` without `^`)

**Why pin**

- No automatic minor/patch pulls on `npm install` — you choose when to upgrade after review.

**How to evaluate an upgrade safely**

1. Open the package’s **changelog** or GitHub **releases** for the target version.
2. Confirm the **npm package name** matches the real package (typosquatting is rare but real).
3. In `package.json`, bump the version string (still pinned, e.g. `1.10.0`).
4. Run **`npm install`** in that app folder so **`package-lock.json`** updates and integrity hashes refresh.
5. Run **tests** and a **quick manual smoke test** (build, login, critical flows).

**After updating**

- Commit **`package.json`** and **`package-lock.json`** together.
- Scan release notes for breaking changes, Node version requirements, and security bulletins.

---

## How often to run checks

| Cadence | Action |
|--------|--------|
| **Weekly** (15–30 min) | `npm audit` in `frontend/` and `backend/`; note or fix low-risk items. |
| **Monthly** | Review pinned deps (axios, etc.), skim changelists, apply patches you have time to test. |
| **Before each release / PR to main** | Full audit + install from clean lockfile + test pass (see checklist below). |

Adjust if you ship rarely (monthly audit may be enough) or often (tie audit to each release branch).

---

## Checklist before any dependency update

- [ ] **Changelog / release notes** read for the new version (breaking changes, deprecations).
- [ ] **Advisory check:** `npm audit` after the change; confirm you did not introduce a known issue.
- [ ] **`package-lock.json`** updated via `npm install` (not hand-edited) and committed with `package.json`.
- [ ] **Diff review:** skim `package-lock.json` for unexpected packages or name changes.
- [ ] **Tests:** `npm test` (and any e2e you rely on) in the affected workspace.
- [ ] **Smoke test:** app starts, build succeeds (`npm run build` where applicable), critical user paths work.

---

## npm config to reduce supply chain risk

These are **recommendations**; add them in **`frontend/.npmrc`** and/or **`backend/.npmrc`** (same folder as `package.json`) so they apply when anyone runs `npm install` there.

```ini
# Pin exact versions when someone runs: npm install some-package
save-exact=true

# Stricter audit gate in CI (optional; npm v9+)
# audit-level=moderate
```

**Other settings (use with care)**

- **`ignore-scripts=true`** — Skips lifecycle scripts (`postinstall`, etc.). Reduces script-based supply-chain risk but **can break** packages that rely on install scripts. Only enable if you know your tree does not need them, or use selectively after auditing.
- **`fund=false`** — Hides funding messages only; no security impact.
- **Lockfile:** Always commit **`package-lock.json`**; use `npm ci` in CI for reproducible installs.

**Org / registry hygiene**

- Prefer the **default npm registry** for public packages unless you have a private mirror.
- Periodically verify lockfile **`resolved`** URLs point at `registry.npmjs.org` (or your approved registry) for critical packages.

---

## Quick reference

| Goal | Command |
|------|---------|
| Audit frontend | `cd frontend && npm audit` |
| Audit backend | `cd backend && npm audit` |
| Reproducible CI install | `npm ci` (requires lockfile committed) |
| See outdated packages | `npm outdated` |

---

*Last updated: maintenance practices for this repo. Adjust schedules to match your release cadence.*
