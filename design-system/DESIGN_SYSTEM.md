# Design System — Vaishnavi Agencies Distribution System

Single source of truth for the approved enterprise UI. Primary brand **`#D71920`**. Two themes (Light / Premium Dark) share **one token system**.

- Canonical tokens: `design-system/tokens.json`
- Runtime implementation: CSS variables in `frontend/src/index.css` (`:root` = light, `.dark` = dark)
- Tailwind mapping: `frontend/tailwind.config.js` (tokens exposed as utility classes with alpha support)

---

## 1. Color

### Brand
| Token | Light | Dark |
|-------|-------|------|
| `brand` | `#D71920` | `#FF4B50` |
| `brand-light` | `#F0333A` | `#FF6E72` |
| `brand-dark` | `#A81218` | `#D71920` |
| `brand-soft` | `#FDE8E9` | `#2A1011` |

### Surfaces
| Token | Light | Dark |
|-------|-------|------|
| `bg` (page) | `#F6F7F9` | `#0B0B0C` |
| `surface` (card) | `#FFFFFF` | `#161618` |
| `surface2` | `#F1F3F5` | `#1E1E21` |
| `border` | `#E4E7EC` | `#2A2A2E` |

### Text
| Token | Light | Dark |
|-------|-------|------|
| `text` | `#15181D` | `#F2F3F5` |
| `sub` | `#5B6470` | `#A6ADB8` |
| `muted` | `#828B98` | `#6B7280` |

### Semantic
`success` `#16A34A`/`#22C55E` · `warning` `#D97706`/`#F59E0B` · `danger` `#DC2626`/`#EF4444` · `info` `#2563EB`/`#3B82F6`

Usage: `bg-brand text-white`, `text-success`, `bg-warning/12 text-warning`, etc. Opacity utilities supported (`bg-brand/10`).

## 2. Spacing
4px base scale: `2, 4, 8, 12, 14, 16, 20, 24, 28, 32`. Cards `p-4`/`p-5`; grids `gap-4`; sections `mb-6`.

## 3. Typography
- **Head** (display/headings/numbers): *Barlow Condensed*.
- **Body**: *Barlow*.
- Scale: display `clamp(2rem,8vw,3rem)/800` · h1 `clamp(1.35rem,5vw,1.9rem)/800` · title `1rem/700` · body `0.875rem` · label `0.72rem uppercase` · caption `0.65rem`.
- Uppercase reserved for eyebrow labels only (not body/buttons).

## 4. Radius
`sm 6 · md 8 · lg 12 · xl 16 · card 16 · xl2 20 · full`. Cards use `rounded-card`; buttons/inputs `rounded-xl`; chips `rounded-full`.

## 5. Shadows / Elevation
- `shadow-card` (resting card), `shadow-elev` (hover/raised), `shadow-glow` (brand emphasis). Two values per theme.

## 6. Motion
| Token | Spec | Tailwind |
|-------|------|----------|
| Page transition | 180ms ease-out, fade+slide-up | `animate-fade-up` / `.page-container` |
| Card hover | translateY(-2px) 150ms + shadow | `hover:-translate-y-0.5 hover:shadow-elev` |
| Skeleton | 1.2s shimmer | `.skeleton` |
| Counter | 0→value 800ms easeOutCubic | `useCountUp()` |
| Drawer/sheet | 250ms spring | `animate-slide-up` (ease-spring) |
| Toast | slide+fade 200ms | `animate-toast-in` |

All motion respects `prefers-reduced-motion` (global reset in `index.css`).

## 7. Icons
**lucide-react** monoline SVG. Default size 18, stroke 2 (2.4 active). Emoji removed from all functional UI.

## 8. Accessibility
WCAG **AA** contrast in both themes; touch targets ≥ 38–44px; visible `:focus-visible` ring (2px brand, 2px offset); full keyboard nav.

## 9. Themes
- `theme/light` = Enterprise Fintech (default).
- `theme/dark` = Premium Dark.
- Switch via header toggle → `ThemeContext` toggles `.dark` on `<html>`, persisted in `localStorage('thumbs-theme')`, no-flash inline script in `index.html`.

## 10. Component primitives
`Button` (primary/secondary/ghost/green/danger), `Card`/`CardHeader`/`CardBody`, `StatCard` (icon + trend), `Badge` (semantic tones), `Field`/`Input`/`Select`/`Textarea`, `Skeleton*`, `SimpleBarChart`, `Donut`. All consume tokens, so re-theming is automatic.
