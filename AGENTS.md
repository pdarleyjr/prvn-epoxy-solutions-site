# PRVN Epoxy Solutions Agent Instructions

## Project Overview

Standalone PRVN Epoxy Solutions marketing site built with Astro v6, Tailwind CSS v4, TypeScript, Astro content collections, and Cloudflare Pages Functions.

The visual direction is premium, mobile-first, dark metallic, glossy, and clean: black/deep charcoal, metallic silver, and electric cobalt blue.

## Commands

| Command           | Purpose                                |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Start dev server                       |
| `npm run build`   | Production build to `dist/`            |
| `npm run preview` | Preview production build locally       |
| `npm run check`   | Run Astro, ESLint, and Prettier checks |
| `npm run fix`     | Auto-fix lint and formatting issues    |

Node.js requirement: >= 22.12.0

## Architecture

- `src/pages/` contains public routes.
- `src/data/site.ts` contains core PRVN content, finish families, services, process steps, gallery items, and FAQs.
- `src/data/services/` contains service content collection entries.
- `src/data/projects/` contains launch gallery/project content entries.
- `src/data/service-areas/` contains service-area placeholders that must not publish unconfirmed cities as factual.
- `functions/api/quote.ts` handles quote form submission on Cloudflare Pages.
- `public/assets/` contains optimized PRVN images and logo assets.

## Launch Constraints

Do not connect this site to unrelated MBFD/Peter Darley projects, Cloudflare resources, Workers, tunnels, DNS zones, Pages apps, or environment variables.

Quote email delivery must not be faked. The Pages Function returns a configuration error until `RESEND_API_KEY` and a verified `QUOTE_FROM_EMAIL` are set in Cloudflare Pages.

City/service-area pages require confirmed business address/service radius/cities before publication.
