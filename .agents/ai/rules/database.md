---
paths:
  - 'database/**'
---

# Database

## No raw SQL in database code
Use Laravel's schema builder, Eloquent, and query builder. Do not use raw SQL, DB::raw(), or statement() without confirming with the user first.
