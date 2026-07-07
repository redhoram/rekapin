---
description: Runs the Planner → Designer → Coder → Tester → Reviewer pipeline for one feature end-to-end.
---

User's feature request: $ARGUMENTS

Run this sequence IN ORDER, don't skip:

0. **Clean the workspace**: delete old files in `.pipeline/` (`spec.md`, `design.md`, `changelog.md`, `test-report.md`, `verdict.md`) if present, so a previous run isn't read by mistake. Do NOT delete `.gitkeep`.
1. Call the **planner** subagent with the feature request above. Wait until `.pipeline/spec.md` is written.
2. Call the **designer** subagent to produce a design spec from the spec. Wait until `.pipeline/design.md` is written. (If the feature has no UI surface, the designer will mark design as skipped — continue to the next step anyway.)
3. Call the **coder** subagent to read spec + design and write the code. Wait until `.pipeline/changelog.md` is written.
4. Call the **tester** subagent to check the result. Wait until `.pipeline/test-report.md` is written.
5. Call the **reviewer** subagent for the final verdict.
6. Show the final verdict (SHIP / NEEDS WORK / BLOCK) to the user with a summary of what happened at each stage.
   - If **NEEDS WORK**: offer to re-run from **coder** (using `.pipeline/verdict.md` as the fix list) → tester → reviewer. Don't loop automatically without user confirmation.
   - If **BLOCK**: stop completely, explain the problem to the user, don't proceed.

If any subagent reports a fatal problem mid-way, stop the pipeline and report to the user — don't force the next stage.
