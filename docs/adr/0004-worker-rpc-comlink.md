# 0004. Worker RPC with Comlink

Date: 2026-10-17 · Status: proposed (awaiting DEC-01)

## Context
T2/T3 tools run in Web Workers and need typed calls, progress, and reliable cancel.

## Decision
Comlink for RPC. Progress is reported through a `Comlink.proxy` callback argument. Cancellation terminates the worker (one worker per job, created on demand), because a worker busy in a synchronous loop cannot receive a cancel message and `AbortSignal` cannot be transferred. Large buffers use transferables.

## Consequences
Good: typed interfaces, less message boilerplate, cancel that always works. Bad: re-initialisation cost after a cancel (WASM reload mitigated by the cache); one more dependency (licence MIT, to be confirmed at ignition).

## Alternatives considered
Raw `postMessage` with a hand-written protocol (more code, same limits), a worker pool (added complexity; revisit if start-up cost matters).
