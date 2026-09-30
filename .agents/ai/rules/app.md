---
paths:
  - 'app/**'
---

# App

## Laravel first, clear code, and actionable failures
Use Laravel's standard structure, naming, and built-in features. Prefer explicit, easy-to-read code over clever shortcuts. Fail fast on invalid state, handle errors at the appropriate boundary, and log actionable failures with useful context without exposing secrets or duplicating framework reports.

## Request independent services
Put reusable business operations in focused services that accept explicit inputs and work from commands, jobs, and tests without an HTTP request or session. Keep controllers thin; do not inject Request into services or use request() inside them.

## Explicit Eloquent builders and no raw SQL
Start model queries with Model::query() and continue with Eloquent or query builder methods; relationship builders are fine. Do not use raw SQL, DB::raw(), or statement() without confirming with the user first.

## Authorize domain actions
Use Laravel policies and gates for protected domain actions, and define roles with Laravel-native application code when role distinctions are needed. Enforce authorization at the boundary and cover allowed and denied cases in tests; do not add a role package without approval.
