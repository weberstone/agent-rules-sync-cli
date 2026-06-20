# Changelog

## [0.3.4] — 2026-06-20

### Changed
- Refactored `PromptsService` to apply DRY principles, consolidating prompt logic.
- Extracted presentation logic from `OrchestratorService` into a dedicated `FinalePresenter` for better SRP.
- Removed top-level await from `paths.ts` and introduced explicit initialization in `index.ts`.

### Fixed
- Fixed TypeScript safety in `configToAnswers` by returning a properly typed `Promise<Answers>`.
- Added missing error checks in empty `catch` blocks across the application to prevent silent failures on non-ENOENT system errors.

## [0.3.3] — 2026-06-18

### Changed
- Optimized agent directives: enforced rule application during initialization for all generators.
- Improved skills handling: fixed file paths, restructured the skills section (now a sibling to rules), and added synchronization logic.
- Major refactoring (DRY): consolidated agent configurations, architecture constants, filenames, and markers into single sources of truth.
- Centralized generator logic: extracted duplicated code and text strings into shared constants and a single wrapper function.

### Fixed
- Orchestrator: Fixed the "Use existing config" flow to correctly skip all interactive prompts and regenerate directly from saved values.


## [0.3.2] — 2026-06-17

### Changed
- Agent manifest templates: removed redundant meta-descriptions, unified
  phrasing across all 8 agents, cleaned up duplicate sections (Working
  agreements, Usage Instructions).
- Rule file descriptions in priority tables made more generic — describe
  purpose rather than assumed content, since users write their own rules.
- Skills section now explicitly instructs agents to load skills on demand
  instead of reading all at startup.
- Core Directives reworded to reference the Rule Manifest table by name
  and emphasize opening every referenced file.
- Removed dead `nameConflict` flag from `ParsedSkill` type and simplified
  `SkillsDiscoveryService.addSkill()`.

  
## [0.3.1] — 2026-06-16

### Changed
- Multiselect prompts (skills, packages, fullstack frameworks): "⊘ Skip"
  checkbox removed. Empty selection (Enter with nothing checked) acts as
  skip. Radio selects keep the explicit "⊘ Skip" option.
- Prompt messages now show the actual context directory name (e.g.
  `context-primary/`) instead of hardcoded `context/`.

### Fixed
- `.env` parser correctly handles combined quotes and inline comments.


## [0.3.0] — 2026-06-16

### Added
- Skip option for every rule type — last item "⊘ Skip" in radio lists,
  Enter with empty selection in multiselect

## [0.2.0] — 2026-06-16

### Added
- Skip option for every rule type — last item "⊘ Skip" in radio lists,
  Enter with empty selection in multiselect