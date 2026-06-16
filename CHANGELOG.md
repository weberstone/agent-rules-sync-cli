# Changelog

## [Unreleased]

### Added
- `.env` file support: `AGENT_CONTEXT_DIR` variable to override the context
  directory location. Supports quoted values, inline comments, and graceful
  fallback to default `context/` when the specified directory is invalid.

### Changed
- Path resolution now validates the custom context directory at startup.
  Invalid paths log a warning instead of crashing — falls back to the
  default context discovery.
- Color utilities deduplicated: `PromptService` and `OrchestratorService`
  now use `picocolors` instead of raw ANSI escape codes.
- Config validation refactored to schema-driven (`CONFIG_SCHEMA`), reducing
  ~100 lines of manual type checks to a declarative field map.

### Fixed
- `.env` parser correctly handles combined quotes and inline comments
  (e.g. `KEY="./path" # note` and `KEY="path #1"`).
- Phantom `path.join(x, '..', 'projects')` references removed from
  `DiscoveryService` and `SkillsDiscoveryService` — both now receive
  explicit `projectsDir` via constructor injection.

## [0.2.0] — 2026-06-16

### Added
- Skip option for every rule type — last item "⊘ Skip" in radio lists,
  Enter with empty selection in multiselect