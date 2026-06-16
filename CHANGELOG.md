# Changelog

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