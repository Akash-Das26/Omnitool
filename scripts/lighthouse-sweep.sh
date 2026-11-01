#!/usr/bin/env bash
# Runs a Lighthouse sweep and keeps the two things a detached run loses: the log
# and the exit status. `node scripts/lighthouse.mjs` on its own still prints
# everything, but when it is started in the background its status goes nowhere,
# and "0" from a shell that never saw the process is not evidence of a pass.
#
# Usage: bash scripts/lighthouse-sweep.sh [--resume] [--routes ...] [--throttle applied]
#
# Exit codes are the sweep's own: 0 every route met its budget, 1 an error-level
# budget failed (a FAIL line was printed), 3 at least one route was not measured
# validly. The status is also written to reports/lighthouse/exit-code.txt so a
# reviewer can read it after the fact.
set -u -o pipefail

OUT_DIR="reports/lighthouse"
mkdir -p "$OUT_DIR"

node scripts/lighthouse.mjs "$@" 2>&1 | tee "$OUT_DIR/sweep.log"
status=${PIPESTATUS[0]}

printf '%s\n' "$status" > "$OUT_DIR/exit-code.txt"
echo "sweep exit code: $status (written to $OUT_DIR/exit-code.txt)"
exit "$status"
