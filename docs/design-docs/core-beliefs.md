# Code Design Core Beliefs

Status: Accepted initial guidance
Applies To: code design decisions, architecture decisions, implementation review
Verification: Design decisions should become easier to verify over time through tests, scripts, dependency checks, examples, or review guidance.

## Decision

idkdo code should be designed around small vertical product slices, explicit boundaries, and enforceable rules. Prefer the least architecture that protects the current behavior and leaves a clear path for the next slice.

## Details

- Prefer vertical slices over broad speculative scaffolding.
- Add abstractions when they remove real complexity or match an implemented boundary.
- Put rules where the data is trusted; do not leave server-owned behavior to browser-only enforcement.
- Keep domain code independent from framework, transport, validation, and persistence concerns.
- Keep shared packages small and intentionally owned; do not turn them into dumping grounds.
- Prefer designs whose important boundaries can be checked deterministically.
