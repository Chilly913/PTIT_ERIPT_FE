# Design system

Source of truth: `design/tokens.json`. Generated output: `src/styles/tokens.css` (+ `src/styles/theme-color.ts`). Never edit generated files.

```
npm run tokens:build   # tokens.json -> src/styles/tokens.css
npm run tokens:check   # guard: gradients, raw colours, stale tokens.css, Tailwind mapping, WCAG AA, colour-blind palette
npm run lint           # eslint + tokens:check
```

Reference page (dev only, 404 in production): `/design-system`.

## The no-gradient rule (hard requirement)

Flat solid colours only. No gradient functions or `bg-gradient-*` / `bg-linear-*` utilities, no `from-*`/`via-*` stops, no gradient text (`bg-clip-text`), no blurred glow blobs (`blur-*`), no gradient shimmer, no gradient chart fills. Separate things with borders and spacing. Shadows only on floating layers (dialog, menu, popover, toast, tooltip, drawer). `design/check.mjs` fails the build/lint on any of these in `src/**`.

## Layers

```
primitive (--p-*)            raw scales, no meaning:  --p-indigo-600, --p-space-4, --p-radius-md
   |  referenced by
semantic (--primary, ...)    meaning, defined per theme [light | dark]: --surface, --muted, --danger
   |  referenced by
component (--btn-*, ...)     per-component decisions: --btn-primary-bg, --input-border, --table-row-hover
```

Rules: components reference semantic tokens only (the generator rejects colour primitives in the component layer). Pages/feature code use Tailwind classes backed by semantic names (`bg-surface`, `text-muted`, `border-border`, `bg-primary`, `text-danger`) and never raw hex/rgb. Components in `src/components/ui` and `admin-shell` consume component tokens via `bg-(--btn-primary-bg)`, `text-(color:--x)`, `border-(--x)`.

## Naming

- Primitive: `--p-<scale>-<step>` (`--p-neutral-50`), `--p-space-<n>`, `--p-radius-<size>`, `--p-font-size-<px>`, `--p-font-leading-<px>`, `--p-z-<name>`, `--p-motion-duration-<name>`, `--p-shadow-<size>`.
- Semantic: role names, kebab-case: `surface`, `surface-muted`, `border-control`, `primary-soft-foreground`, `danger-hover`. `-foreground` = text on that fill, `-soft` = tinted background for status, `-hover`/`-active` = states.
- Component: `--<component>-<part|variant>-<property>[-state]`: `--btn-primary-bg`, `--btn-danger-hover`, `--input-border-hover`, `--table-row-hover`.
- Charts: `--chart-1..4`, `--chart-grid`, `--chart-axis` (semantic, themed).

## Adding a token

1. Primitive needed? Add it under `primitive` in `design/tokens.json`.
2. Semantic colour: add the same key to BOTH `semantic.light` and `semantic.dark` (`{color.neutral.50}` references a primitive) and a `--color-<name>: var(--<name>)` line in the `@theme inline` block of `src/app/globals.css` (the check verifies this).
3. Component token: add to `component` referencing a semantic name, e.g. `"btn-primary-bg": "{primary}"`.
4. `npm run tokens:build`, then `npm run tokens:check`, then look at `/design-system`.

## Light only (dark is dormant)

The product ships light-only: `color-scheme: light`, light `theme-color`, no theme toggle, no `data-theme`, no `prefers-color-scheme` styling. The dark layer stays in `design/tokens.json` (`semantic.dark`, `chart.dark`) so it can return later; `node design/generate.mjs --with-dark` emits it (and `node design/contrast.mjs --with-dark` validates it). Default output and `npm run lint` are light only. Add new semantic tokens to BOTH sets to keep the dormant layer complete.

Light palette notes: app background `#f4f6fa`, white cards with a 1px `border` (`#e2e6ee`) so cards read without shadows; `surface-subtle` (`#f8f9fc`) for table headers and row hover, `primary-soft` for selected rows and the active nav item. Sidebar: light surface with an indigo-soft active item (calm, matches the cards, no heavy dark block competing with content). Charts: 4 solid colours (indigo, teal, amber, rose), colour-blind checked; course-status bars use semantic colours.

## Icons

In-house set in `src/components/icons` (inline SVG, 24px grid, 1.75px stroke, round caps/joins, `currentColor`). Props: `size` (default 16) or a `size-*` class, optional `title` (makes it `role="img"`; otherwise `aria-hidden`). Never import an icon package. `/design-system` lists every icon; add new ones in `icons.tsx` (the registry is `registry.ts`).

## Motion

Tokens 100/150/200ms, ease-out (`--p-motion-*`; Tailwind transitions default to 150ms ease-out). Buttons press to scale 0.98; dialogs, menus, tooltips and toasts enter with opacity/transform only; skeletons are flat opacity pulses; `prefers-reduced-motion` collapses durations; `scrollbar-gutter: stable`; `.cv-auto` gives cheap `content-visibility`.

## Component states

| Component | Default | Hover | Active | Focus | Disabled | Error |
|---|---|---|---|---|---|---|
| Button primary | `--btn-primary-bg` | `-hover` | `-active` | 2px `--ring` outline, offset 2 | `--btn-disabled-bg/fg/border` | n/a |
| Button secondary/outline/ghost/danger | `--btn-<v>-bg` | `-hover` | `-active` | same ring | same disabled tokens | danger is its own variant |
| Input / Textarea | `--input-bg`, border `--input-border` | border `--input-border-hover` | n/a | 2px `--input-focus-ring` outline | `--input-disabled-bg/fg`, not-allowed cursor | border `--input-error` + `FieldError` text |
| Select | as input | as input | n/a | as input | as input | as input |
| Checkbox | `--checkbox-bg`, border `--checkbox-border` | n/a | n/a | ring, offset 2 | 60% opacity, not-allowed | wrap in `Field` with error text |
| Switch | track `--switch-off-bg`, thumb `--switch-thumb` | n/a | n/a | ring | 60% opacity | n/a |
| Table row | transparent, divider `--table-divider` | `--table-row-hover` | n/a (selected: `bg-primary-soft`) | row action focus ring | muted text | `bg-danger-soft` row |

Focus must always be visible. Never convey error by colour alone: pair with text.

## Dense admin screens

- Base text 14px (`text-base`); table cells and form controls 13-14px; secondary text `text-sm` (13px) in `text-muted`; labels/captions `text-xs` (12px) minimum. Page title 20px (`text-2xl`), section 16-18px, never above 24px inside the shell.
- Type scale: 12/13/14/16/18/20/24/30 with line heights 16/18/20/24/26/28/32/38. Weights 400/500/600/700; use 500-600 for emphasis, not size.
- Spacing is Tailwind's multiplier (1 unit = 0.25rem = 3.5px at the 14px root). Controls are 32px (`sm`) or 36px (`md`) high; table rows `py-2.5`-`py-3`; card padding `p-5`; gaps between sections `space-y-6`.
- Radii: 6px (`rounded-md`) small, 8px (`rounded-lg`) controls, 12px (`rounded-xl`) cards/dialogs, `rounded-full` badges only.
- Cards, tables and the shell are separated by 1px borders, not shadows.

## Charts

4 categorical colours (`--chart-1..4`), solid fills only, validated for deuteranopia, protanopia and tritanopia (minimum pairwise deltaE 15 in CIELAB) and 3:1 against surface. Grid `--chart-grid`, axis/labels `--chart-axis`. Add direct labels, patterns or markers in addition to colour. More than 4 series: group into "Other" or use small multiples. Use status colours (`success`/`danger`) only for status meaning.

## Do / Don't

- Do use semantic classes and component tokens. Don't write `#hex`, `rgb()` or Tailwind palette colours (`bg-indigo-600`) in `.tsx`.
- Do use borders and spacing to separate. Don't add shadows to cards, buttons or inputs.
- Do pair `-soft` backgrounds with their own foreground (`bg-danger-soft text-danger`). Don't put `text-muted` on `bg-border`.
- Do keep new variants inside `src/components/ui`. Don't restyle a component per page with colour overrides.
- Don't add gradients, glow blobs or gradient text anywhere.
- Don't use `text-white` on status fills: use `text-danger-foreground` / `text-primary-foreground` (white in light, dark ink in dark).
- Don't use `border-border-strong` for input boundaries (1.6:1); use `border-border-control` (3:1+).
