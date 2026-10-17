# Session and audit prompts

## A. Start of a normal session (any phase after P1)
```
Read AGENTS.md, plan.md, todo.md, and the last 3 entries of docs/review/REVIEW-LOG.md. State the current phase, then list the unticked todo.md tasks you will complete this session (max 5) and the files you expect to touch. Wait for my "go" only if a decision in todo.md is unresolved; otherwise proceed. Follow AGENTS.md session protocol exactly.
```

## B. End of session
```
Finish the session: run lint, typecheck and tests and paste the results. Update features.md statuses and todo.md ticks. Append a Session entry to docs/review/REVIEW-LOG.md using its template, including what is not done, what you are unsure about, and any problems found. If a phase gate is reached, say so and request the audit. Summarise in 10 lines.
```

## C. Add one tool
```
Implement tool <id> following docs/development/DEVELOPMENT.md section 4. Tier and approach are in its features.md row. Write tests first in packages/tool-core. Write no UI copy except placeholders marked TODO(copy); list them for me. Report library licences before installing anything.
```

## D. Run a phase-gate audit
```
Act as an independent auditor, not the implementer. Run the checklists in docs/audit/CHECKLISTS.md relevant to phase <N> against the current code. For each item give PASS, FAIL or NOT TESTED with evidence (command output, numbers). Do not fix anything. Append an Audit entry to docs/audit/AUDIT-LOG.md using its template, add new findings to the table with severities, and give a verdict. Anything you could not test must be listed as NOT TESTED, not assumed.
```

## E. Design check against Stitch output
```
Compare the implemented screens with docs/design/DESIGN.md and docs/design/stitch/. List deviations by severity (token, layout, copy, accessibility). Check the design-brief principles (omnibox is the single bold element, no identical-card grids, no decorative imagery). Do not change code; produce a fix list.
```
