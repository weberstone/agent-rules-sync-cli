# Changelog

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