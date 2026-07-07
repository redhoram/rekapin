---
name: premium-design
description: Use when designing or building any UI — landing page, web app, dashboard, or component — and you want a premium, high-craft result instead of a generic template. Covers palette discipline, typography metrics, intentional motion, spacing, and context adaptation (marketing vs product).
---

# Premium Design

Core belief: "premium" is not decoration — it's **discipline applied with the right
intensity for the context.** A page looks expensive when every choice is deliberate
and nothing is left at default.

Two failure modes — avoid BOTH:
- **Generic** — default Tailwind colors, system fonts, no motion, cramped spacing.
  Looks like an unstyled template.
- **Over-designed** — everything animated, max contrast everywhere, bold for the sake
  of bold. Looks loud and cheap, and it hurts usability.
The target is the narrow band between them: confident, restrained, intentional.

## 1. Palette — discipline over decoration
- Define a small SEMANTIC palette (3–5 roles): `ink` (near-black text), `surface`/`bg`,
  `accent`, optionally `muted` + one supporting tone. Name by role, not by color.
- NO raw default colors in output (`red-500`, `blue-600`, `gray-400`). Every color
  traces to a defined role.
- Deliberate values, not pure black/white: ink `#0A0A0A` not `#000`; warm off-white
  `#F3F0E6` not `#FFF`.
- One accent, used sparingly — it earns attention because it's rare.
> Example direction (NOT a mandate): ink `#0A0A0A` + warm sand `#F3F0E6` + one bold
> accent. Swap to fit the brand — see §6 for how to swap correctly.

## 2. Typography — set the metrics, not just the font
- Pair a DISPLAY font (headlines) with a BODY font, e.g. Space Grotesk / Outfit +
  Inter / Plus Jakarta Sans. Never leave it to system default.
- Big headlines: `tracking-tight`, `leading-none`/`leading-tight` — punchy, integrated.
- Eyebrows / small caps: `tracking-wide`+ uppercase — editorial feel.
- Body: `leading-relaxed`, comfortable measure. Let it breathe.
- Scale responsively with intent: `text-5xl md:text-7xl`, not one fixed size.

## 3. Motion — intentional, never bloat
- Each interactive element gets ONE deliberate hover state: lift (`hover:-translate-y-1`),
  shadow bloom, or icon nudge (`group-hover:rotate-12`). One per element, not all at once.
- Scroll-reveal via IntersectionObserver (fade-in + slide-up), unobserve after trigger.
  Not a heavy animation library.
- **No-JS resilience**: don't hardcode `opacity-0` as the initial JSX/HTML state — content
  vanishes if JS fails or is slow. Apply the hidden state via a JS-added class (e.g. `js-ready`
  on `<body>`), so the CSS default stays visible. Always add `prefers-reduced-motion: reduce`
  to skip animations entirely for users who need it.
- Standard transition: `transition-all duration-300 ease-in-out`. Smooth, never abrupt.
- Every motion must have a job: reveal, feedback, or emphasis. No job → cut it.

## 4. Layout & spacing — let it breathe
- Generous vertical rhythm between sections; double your padding instinct.
- One focal point per section; supporting elements quieter.
- Break the grid occasionally (overlap, asymmetry) — on purpose, for emphasis.

## 5. Adapt to context — what separates a pro
Same palette discipline + craft, DIFFERENT intensity:

| | Marketing / Landing | Product / Dashboard |
|--|--|--|
| Spacing | Generous (`py-24`–`py-32`) | Tight, dense (`p-4`–`p-6`) |
| Layout | Flowing, editorial, asymmetric | Structured grid, sidebar, tables |
| Motion | Scroll-reveal, dramatic hovers | Snappy, instant feedback only |
| Goal | Emotion + conversion | Utility + legibility |

Keep identical across both: palette, type system, border radii, hover smoothness.
Bold suits marketing. For B2B/enterprise product, **restraint IS the premium move** —
don't force neo-brutalism into a dashboard.

## 6. Reusing a look for a new brand (swapping hex)
Changing colors is NOT 1:1:
- Keep the CONTRAST RELATIONSHIP, not just the hue. A bold look depends on a
  high-luminance accent over dark ink. If the new brand color is soft/pastel, either
  pick a bolder accent or dial the boldness down — never ship a weak accent in a
  high-contrast layout.
- Re-check text legibility on every surface (aim WCAG AA); find the exact `bg-ink/80`
  sweet spot per background.
- Reconsider the font pairing — the new brand's character may not match the old fonts.
- Hex + font is ~30% of the job. Copy, section structure, and assets are the rest.

## 7. Non-negotiable discipline (the real differentiator)
- Semantic HTML; `aria-label` on icon buttons; sections with IDs for nav.
- Responsive at every breakpoint; check mobile.
- Light assets: SVG icons, optimized images, no broken gray placeholders — describe or
  generate a real one in-palette.
- Respect a performance budget; keep motion at 60fps.

## Done check
- [ ] Zero default/raw colors — all semantic
- [ ] Display + body fonts set; headline metrics tuned
- [ ] Every interactive element has one deliberate state
- [ ] Spacing matches context (generous vs dense)
- [ ] a11y: labels, contrast, semantics
- [ ] Would a senior designer call this intentional — not loud?

> If it looks like an unstyled template, you under-designed. If it looks loud and busy,
> you over-designed. Premium is deliberate restraint.
