## Angular Material Theme Tokens

- **STRICT RULE**: You MUST exclusively use design tokens and CSS variables defined in `src/app/shared/theme`.
- This applies to all colors, typography, spacing, and elevations.
- **NO CUSTOM HEX/RGB COLORS**: Never hardcode colors like `#ff0000` or `rgba(...)` in components. Always map to the established Material theme variables.
- **NO CUSTOM FONTS**: Use the predefined font families and sizes from the theme. Do not invent custom font sizes.
- **Material Design Principles**: When designing new UI components, strictly follow the core UX patterns and behaviors of the official Material Design guidelines. Even if the project uses specific token overrides, the component states (hover, focus, pressed), layouts, and elevations must reflect native Material Design logic. Follow these strict guidelines for UI and styling to maintain a consistent design system.
