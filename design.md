# Ray Learning Design System

Clean, minimal, professional UX/UI design system.

## Genre

Minimalist Editorial: Pure white background canvas, high-contrast black typography and primary actions, accented by soft blush pink (`#fff1f5` / `#fce7f1` / `#f472b6`). No decorative AI clichés (no glowing purple blobs, no tacky glassmorphism, no fake marketing buzzwords). Designed with Swiss typography discipline, generous whitespace, and crisp data density.

## Macrostructure Family

- **App Pages (Workbench)**: Clear task headers, structured stat cards, instant filterable card grids, quiet metadata.
- **Content & Reader Pages (Long Document)**: Readable 75ch measure, generous typography, responsive table wrappers, explicit source attribution with soft pink accent borders.
- **Interactive Tools (Assessment & Chat Companion)**: Multi-step interactive quiz generator, instant grader with per-question source attribution, responsive conversational thread with markdown support and copy actions.
- **Auth Pages (Single Focus)**: Centered minimalist focus card with one-click Google OAuth and email/password fallback.

## Theme & Colors

- **Canvas**: `#ffffff` (Pure White)
- **Surface**: `#ffffff` (Pure White)
- **Border**: `#f0e2e7` (hairline border with subtle warm tone)
- **Primary / Black**: `#0a0a0c` / `#000000` (deep crisp black for primary buttons, active badges, and key headings)
- **Soft Pink (ชมพูอ่อน)**:
  - Soft Pink Canvas / Tint: `#fff1f5`
  - Soft Pink Subtle / Tag Background: `#fce7f1`
  - Soft Pink Border: `#fbcfe8`
  - Soft Pink Accent / Highlight: `#f472b6`
  - Soft Pink Text: `#be185d` / `#831843`
- **Secondary Ink**: `#4b5563`
- **Muted Text**: `#6b7280`

## Typography

- **Sans**: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif`) for lightning-fast render and crisp legibility across Thai and English.
- **Mono**: System monospace for paths, identifiers, and code blocks.

## Responsive Design & Architecture

- Mobile-first approach with container queries and fluid typography (`clamp()`).
- Touch targets: minimum 44px on mobile viewports.
- Inputs prevent iOS Safari auto-zoom (`font-size: max(16px, 1rem)`).
- Full height with dynamic viewport units (`100dvh`).
- All protected routes guarded server-side by Next.js 16 `proxy.ts`.


