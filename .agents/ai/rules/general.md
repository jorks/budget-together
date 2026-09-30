---
paths:
  - '**/*'
---

# General

## Keep agent configuration in .agents and AGENTS.md
Use AGENTS.md as the canonical project instruction file and .agents/ for shared skills, rules, and agent configuration. Keep .ai as a relative symlink to .agents/ai so Boost's record-rule and guideline discovery use the same files. Tool-specific entry points (such as CLAUDE.md, .claude/skills, .codex/config.toml, .mcp.json, and boost.json) must be relative symlinks to these canonical sources, not independent copies. Add future agent assets under .agents/, preserve these links during generator updates, and commit the shared sources and compatibility links.

## Tests for every change
Add or update meaningful automated tests for every behavior or logic change, including happy paths, validation, authorization, and important failure modes. Run affected tests before completion. For pure documentation or configuration edits, verify the resulting behavior directly; do not write tests that only restate file contents.

## Dependencies require approval
Do not add or upgrade Composer or npm packages without the user's approval. Before proposing one, evaluate its value, direct and transitive dependency count, maintenance, adoption, and whether Laravel or installed packages already provide the capability.

## Conventional commits
Use Conventional Commits for every commit, with a type and concise imperative description.
