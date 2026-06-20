## Tailwind v4 & Styling
* **No Custom CSS:** BANNED. Raw CSS/SCSS is allowed *only* for deep Material components overrides.
* **Tailwind v4 Token Syntax:** For design tokens and gradients, use native v4 syntax exclusively: `bg-(image:--app-bg-radial-center-top)` or `bg-(image:--app-bg-radial-center)`.
* **Standard Scales First:** Maximize native design system scales for spacing, sizing, and typography (e.g., `p-4`, `m-2`). Strictly avoid ad-hoc custom arbitrary values (like `w-[312px]` or `mt-[13px]`) unless explicitly requested.