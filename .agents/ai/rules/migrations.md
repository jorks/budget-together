---
paths:
  - 'database/migrations/**'
---

# Migrations

## Greenfield schema and no rollback drops
Until the user says the project is no longer greenfield, edit the original migrations to express the current schema instead of adding incremental migrations. Do not include drop/dropColumn calls in application migrations. Make down() fail explicitly rather than silently mark an unchanged schema as rolled back; use migrate:fresh for local rebuilds. Revisit this rule before a shared or production deployment.
