# AI Rules

## Tech Stack (5-10 bullet points)

- **HTML5** for all page markup, using semantic tags for accessibility and SEO.
- **CSS3** (custom styles in `assets/css/`) for styling, leveraging Tailwind CSS where appropriate for rapid UI development.
- **Vanilla JavaScript (ES6+)** for client‑side interactivity, using `assets/js/` modules (e.g., `main.js`, `search.js`, `i18n.js`).
- **Cloudflare Pages** for static site hosting and deployment via Git integration or Wrangler.
- **Cloudflare Pages Functions** (`functions/`) for serverless API routes and backend logic, written in JavaScript/TypeScript and deployed on Cloudflare Workers.
- **Python** for static site generation via `build_site.py`, keeping the build process simple and reproducible.
- **Chart.js** (`chart.umd.min.js`) for data visualizations and dashboards.
- **TypeScript** for type‑safe code in Pages Functions and any future React front‑end.
- **Shadcn/ui** components for UI primitives when moving to a component‑based architecture (import from `src/components/ui/` and style with Tailwind classes).
- **Radix UI** for accessible, unstyled UI components.

## Library Usage Rules

- **When to use Shadcn/ui**: For any UI component that needs a consistent design system (buttons, cards, forms, modals, etc.). Import from `src/components/ui/` and style with Tailwind classes.
- **When to use Radix UI**: For accessibility‑first primitives (dialog, dropdown, tooltip, tabs, etc.) that are not yet covered by Shadcn/ui.
- **When to use Chart.js**: For any chart or data visualization; include the UMD bundle from `assets/js/vendor/chart.umd.min.js`.
- **When to use TypeScript**: For all new source code in Pages Functions and React components; ensure `.ts`/`.tsx` files have proper type definitions.
- **When to use Python**: For site generation, automation, and build scripts; keep scripts in the root (`build_site.py`) and avoid mixing with client‑side code.
- **When to use i18n.js**: For internationalization and localization features; integrate with the Python build process to generate localized assets.
- **When to use search.js**: For site‑wide search functionality; ensure the search index (`search-index.js`) is updated during the build.
- **When to use partials**: For reusable HTML snippets (header, footer, newsletter forms); keep them in `partials/` and include them via server‑side includes or JavaScript injection.
- **When to use Pages Functions**: For serverless API routes, form handling, or any logic that must run on the server; place files in `functions/` and deploy with Cloudflare Pages.

## General Guidelines

- Keep source code organized: `src/` for React front‑end, `assets/` for static assets, `partials/` for reusable HTML, `functions/` for Cloudflare Pages Functions.
- Use Tailwind CSS classes extensively for layout, spacing, colors, and other design aspects.
- Prioritize accessibility (ARIA attributes, semantic HTML) and performance (lazy loading images, minified assets).
- Maintain a clean commit history; use descriptive commit messages.
- When adding new dependencies, update `package.json` and run `npm install` (or `yarn`/`pnpm` as appropriate).
- For any UI changes, first check if a suitable component exists in Shadcn/ui or Radix UI before creating a new one.
- Ensure all JavaScript code follows ES6+ standards and is compatible with modern browsers.
- Keep the build process simple; avoid over‑engineering the static site generation unless necessary.
- Use `robots.txt` for SEO control and ensure all pages are accessible to search engines unless explicitly excluded.
- When working on the React front‑end, always update `src/pages/Index.tsx` (the main page) to include new components so they are visible in the preview.
- For any future feature requests, start with the least complex solution that meets the requirement and iterate based on user feedback.
- Configure Cloudflare Pages via `wrangler.toml` at the project root; set the build command and output directory appropriately for static site generation.