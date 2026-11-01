# Independent verification checklists — F-025, F-027, F-028

Written 2026-11-01 by the implementing session. **Nothing here is a verdict and nothing here is self-approval.** The three findings stay `fix applied, awaiting independent verification` in `docs/audit/AUDIT-LOG.md` until a reviewer who did not write the fix runs these steps and changes the status themselves.

Each checklist has three parts: the steps, the result that counts as verified, and how to bring the original bug back (so the fix is shown to be the reason the result changed, not a coincidence).

Host note: run these from a quiet host. `uptime` should show a 1-minute load below about a quarter of the core count before any timing step, and the Lighthouse steps print the load themselves.

---

## F-025 — dependency advisories (Should)

**Claim under test:** `pnpm audit` reported **10 advisories (4 low, 6 moderate)** at audit A1.3 and reports **1 (low)** now; the remaining one cannot be fixed because no patched version exists; none of the flagged packages reaches `dist`.

### Steps

1. `pnpm install --frozen-lockfile`. Expected: exit 0, lockfile unchanged (`git status --short` shows no diff).
2. `pnpm audit --json`, then read the counts. Expected: `1`, severity `low`.
3. `pnpm audit:summary`. Expected: one line, `deepmerge 4.3.1 · low · dev · GHSA-gcqx-w48m-w2h4`, with the path `apps__web>vite-plugin-pwa>workbox-build>@rollup/plugin-node-resolve>deepmerge`, and the line `no patched version published for: deepmerge`.
4. `pnpm why deepmerge`. Expected: exactly that path, ending in `@omnitool/web@0.1.0 (devDependencies)`. This is what makes "dev only" a demonstrated fact rather than a guess.
5. `pnpm why glob minimatch serialize-javascript fast-uri seroval`. Expected: the parents are now on patched versions (`glob` 14.0.3, `minimatch` 11.0.3 via overrides; `serialize-javascript` 7.1.4; `fast-uri` 3.1.9; `seroval` 1.7.6) and no advisory names them.
6. Presence in the shipped bundle: `pnpm build`, then
   `grep -rl --include='*.js' --include='*.mjs' --include='*.map' -e deepmerge -e 'serialize-javascript' -e 'fast-uri' apps/web/dist | head`.
   Expected: no output. Repeat for `glob`, `minimatch`, `seroval` — expected: no output for any of them.
   A hit is not automatically a problem, but it must then be explained; silence is the claim being tested.
7. `grep -n "overrides" -A 12 pnpm-workspace.yaml`. Expected: the five overrides with the versions above, each with a comment naming why.

### Verified when

Steps 1–7 give the expected results, and the reviewer is satisfied that `glob`/`minimatch` moving to 14.x/11.x (BlueOak-1.0.0) is acceptable — note that those two are **two major versions** ahead of what the parents declared, which is the one part of this fix that carries real risk. The mitigation is that the build, budgets and E2E were re-run afterwards, not that the risk does not exist.

### Reproduce the original bug

```
git checkout 8210288^ -- pnpm-lock.yaml pnpm-workspace.yaml
pnpm install --frozen-lockfile
pnpm audit --json | node -e '…'   # or simply: pnpm audit
```
Expected: 10 advisories, 4 low and 6 moderate. Then restore with `git checkout HEAD -- pnpm-lock.yaml pnpm-workspace.yaml && pnpm install --frozen-lockfile`.

---

## F-027 — the 1 MB paste guard (Should)

**Claim under test:** the guard's margin is about 93%, not 4%. Ten runs of the guard's own call with its own input measured **median 73 ms / max 120 ms** normally and **median 133 ms / max 148 ms** under v8 coverage, against an unchanged 2,000 ms bound.

### Steps

1. `pnpm exec vitest run packages/tool-core/src/sanitize/sanitize.test.ts` from a quiet host. Expected: pass, and the guard does not approach its bound.
2. `pnpm exec vitest run --coverage packages/tool-core/src/sanitize/sanitize.test.ts`. Expected: pass with coverage on, still far inside 2,000 ms.
3. The assertion and its bound are unchanged: `grep -n "2_000\|2000" packages/tool-core/src/sanitize/sanitize.test.ts`. Expected: the bound is still 2,000 ms and the input is still the 1 MB document. The fix was to the diagnosis and to the suite's worker bound (DEC-89, `maxWorkers: '50%'` in `vitest.config.ts`), not to the test.
4. `pnpm test:coverage` (the real gate). Expected: every threshold met, branches at least 90%.
5. To see the mechanism rather than the number: run the full suite at one worker per file — `pnpm exec vitest run --maxWorkers=100% --coverage` — on a loaded host, and watch whether the guard's own time rises. That is the contention that produced the 1,880/2,255/2,550 ms readings.

### Verified when

Steps 1–4 pass, and the reviewer records whether the margin they measure is the same order as 73–148 ms. A reviewer who measures a margin under 30% has found a real problem: record it, do not move the bound.

### Reproduce the original bug

The original readings were a measurement artefact, so they cannot be reproduced by reverting a commit — there is no commit that made the paste slow. They reproduce as **contention**: on a 16-core host, run the full coverage suite at one worker per test file (about 71 files) while the guard runs, and the same 1 MB paste reads 1,900–2,600 ms. That is the number A1.3 saw.

---

## F-028 — the feature ledger (Info)

**Claim under test:** the `features.md` rows for `text-editor` and `doc-converter` record their measured NFR-013 values (1,522 ms and 1,667 ms) instead of "NOT TESTED", P2-66 is ticked, and `pnpm lint` fails when the ledger, the loader map and the registry disagree.

### Steps

1. `grep -n "text-editor\|doc-converter" features.md | head`. Expected: both rows are ✅/🟨 as recorded, and each states its NFR-013 figure with a date.
2. `pnpm features:progress`. Expected: the counts agree with the table headings.
3. `pnpm lint`. Expected: exit 0, ending with `ledger: the loader map, the registry and features.md agree` and the counts `39 built · 37 marked done · 58 planned · 97 in the registry`.
4. The check really is a check — untick one built tool:
   `node -e` (or an editor) that flips one ✅ row to 🟨 in `features.md`, then `pnpm lint`. Expected: **fail**, naming the tool and saying its row is not done while its module exists. Restore the row and confirm `pnpm lint` passes again.
5. The reverse direction: remove one entry from `apps/web/src/lib/tool-modules.ts` while leaving its ✅ row, run `pnpm lint`. Expected: fail, naming the id. Restore.
6. The numbers the rows quote are the ones on record: compare with `reports/lighthouse/summary.md` (gitignored, produced by the sweep) or the Session 027 entry of `docs/review/REVIEW-LOG.md`. Expected: 1,522 ms and 1,667 ms, or a later measured value with a later date.

### Verified when

Steps 1–6 behave as described and the reviewer can see that the check fails in both directions, not only in the direction the fix was written against.

### Reproduce the original bug

```
git show 6311cb1^:features.md | grep -n "text-editor\|doc-converter"
```
Expected: both rows say "NFR-013 **NOT TESTED**" although the audit had measured 1,522 ms and 1,667 ms, and `pnpm lint` at that commit has no ledger check at all (`grep -n "check-features-ledger" package.json` prints nothing).

---

## What a reviewer must not accept

- A status change in `docs/audit/AUDIT-LOG.md` made by the session that wrote the fix.
- "The bundle does not contain it" without the `dist` search in step 6 of F-025.
- A F-027 verdict based on a run on a loaded host without saying so.
- A F-028 verdict that only tests the direction the check was written for.
