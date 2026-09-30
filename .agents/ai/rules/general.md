---
paths:
  - '**/*'
---

# General

## Keep agent configuration in .agents and AGENTS.md
Use AGENTS.md as the canonical project instruction file and .agents/ for shared skills, rules, and agent configuration. Keep .ai as a relative symlink to .agents/ai so Boost's record-rule and guideline discovery use the same files. Tool-specific entry points (such as CLAUDE.md, .claude/skills, .codex/config.toml, .mcp.json, and boost.json) must be relative symlinks to these canonical sources, not independent copies. Add future agent assets under .agents/, preserve these links during generator updates, and commit the shared sources and compatibility links.
