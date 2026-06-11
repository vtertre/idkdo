# Code Organization

Status: Accepted initial guidance
Applies To: all TypeScript source packages and apps
Verification: No automated verification yet. Reviewers should check this guidance during code review.

## Decision

Use one primary exported concept per source file.

A concept means a class, interface, domain error, command, query, handler, repository contract, service, policy, component, or similarly named architectural unit.

Name the file after the concept.

## Details

Supporting private helpers may stay in the same file when they only serve the primary concept.

Avoid broad catch-all files such as `cqrs.ts`, `errors.ts`, `domain.ts`, `cqrs.test.ts`, `errors.test.ts`, or `domain.test.ts`.

Tests should mirror the concept under test: `thing.ts` gets `thing.test.ts`.

Within a package, source files should import sibling package code directly from the owning file, not through the package barrel.

The package barrel is for external consumers and public re-exports.

Unit tests should follow the same rule and import the file under test directly.
