# Planning prompt (use to refresh or extend `plan.md`)

Use this when scope changes, a phase finishes, or you want a second AI to challenge the plan. Paste into any capable assistant with the repository attached.

```
<objective>
Review and improve the Omnitool plan in plan.md so the next phase can start with no open questions. Do not write application code.
</objective>

<context>
Omnitool is a local-only, no-account browser toolkit (~97 tools plus two editors) re-implementing the scope of delphi.tools with original code, design and copy. Stack: pnpm monorepo, Vite, React 19, TypeScript strict, Tailwind v4, shadcn/ui. Source of truth files: plan.md, todo.md, features.md, docs/srs/SRS.md, docs/design/DESIGN.md, docs/legal/ATTRIBUTION.md, docs/review/REVIEW-LOG.md, docs/audit/AUDIT-LOG.md.
</context>

<instructions>
1. Read every file listed in <context>, then the last 3 entries of the review and audit logs.
2. Verify any tool/library/version claim you intend to rely on against current official sources (web search or docs). Mark anything you could not verify as UNVERIFIED.
3. Identify: (a) contradictions between plan.md, SRS.md and features.md, (b) tasks in todo.md that are vague or not independently testable, (c) risks missing from the register, (d) phases whose exit gate is not measurable.
4. Propose edits as a concise change list. For each: file, section, old -> new, reason. Prefer deleting scope or splitting phases over adding process.
5. List the human decisions still required, each with your recommendation and the trade-off.
</instructions>

<constraints>
- Plan only the next phase in detail; keep later phases coarse.
- No new dependency without naming its licence.
- Do not copy artwork, copy or code from delphitools; ideas and behaviour only.
- Do not invent versions, prices or features. Say "unknown" instead.
- Keep the change list under 40 lines.
</constraints>

<output_format>
## Findings (max 10, ordered by impact)
## Change list (file | section | old -> new | reason)
## Decisions needed (decision | recommendation | trade-off)
## Unverified claims
</output_format>

<success_criteria>
A reader can execute the next phase from plan.md and todo.md alone, every exit gate is measurable, and nothing unverified is presented as fact.
</success_criteria>
```
