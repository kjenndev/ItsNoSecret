# It’s No Secret Computer Services — UI/UX + Visual Identity Handoff

## Brand direction
Create a premium local technology diagnostics identity: trustworthy, precise, and calm under pressure. The visual language should feel like a professional diagnostic lab for home and small-business computers, not a generic repair shop.

Required tagline: **Finding What Others Miss.**

Do not use the existing/current logo. Use the generated magnifying-glass + circuit-board identity in `src/assets/brand/logo-primary.svg` and `src/assets/brand/logo-mark.svg`.

## MUI theme direction
Use an IBM Carbon-inspired foundation for trust and clarity, softened with Linear-style dark surfaces and luminous diagnostic accents.

### Palette tokens
```ts
const palette = {
  mode: 'dark',
  background: { default: '#050A12', paper: '#0B1728', elevated: '#10243B', section: '#07111F' },
  primary: { main: '#1877F2', light: '#38D6FF', dark: '#0B4EA2', contrastText: '#FFFFFF' },
  secondary: { main: '#2EE6A6', light: '#78E08F', dark: '#168A66', contrastText: '#03100B' },
  text: { primary: '#F8FBFF', secondary: '#B9C7D8', disabled: '#6C7A8F' },
  divider: '#20354F', success: { main: '#2EE6A6' }, warning: { main: '#F5C451' }, error: { main: '#FF5D5D' }
}
```

### Typography
- Primary font: `IBM Plex Sans`, fallback `Inter, system-ui, -apple-system, Segoe UI, sans-serif`.
- Mono/accent font: `IBM Plex Mono`, fallback `ui-monospace, SFMono-Regular, Menlo, monospace`.
- H1 desktop: 56–64px, weight 600, line-height 1.04, letter-spacing -1.2px.
- H1 mobile: 38–44px, weight 600, line-height 1.08.
- H2: 36–44px, weight 600, letter-spacing -0.5px.
- H3/card titles: 20–24px, weight 600.
- Body: 16–18px, line-height 1.55, color `text.secondary`.
- Eyebrow/labels: 12–13px IBM Plex Mono, uppercase, letter-spacing 0.12em, color `secondary.light`.

### Spacing and shape
- Base spacing: 8px grid.
- Page max width: 1200px; wide hero art may extend to 1280px.
- Section padding: desktop 88–112px vertical, tablet 72px, mobile 48–56px.
- Card padding: 24px desktop, 18–20px mobile.
- Radius scale: 10px controls, 16px cards, 24px hero/art panels, 999px pills.
- Borders: 1px solid `#20354F`; hover border `rgba(56, 214, 255, 0.45)`.

### Component tone
- Buttons: confident and rectangular-rounded, not playful. Primary CTA uses blue gradient or `primary.main`; secondary/outlined CTA uses transparent dark background with cyan border. Minimum height 48px.
- Cards: dark elevated panels with subtle borders; avoid heavy drop shadows. Use a faint cyan/green top accent for diagnostic affordance.
- Chips/trust badges: compact pill or badge components, mono labels, green check accent.
- Forms: dark fields, high contrast labels, visible focus ring `0 0 0 3px rgba(56,214,255,.28)`.
- Navigation: sticky dark header, logo left, services/why/about/contact anchors, phone CTA right.

## Layout notes
1. Hero: two-column desktop. Left: logo, eyebrow `Local Computer Diagnostics & Repair`, headline such as `Computer problems solved with careful diagnostics.` Subheadline mentions Donald Bean, San Antonio-area service, and 20+ years/since 2003. CTAs: Call Now `(210) 658-6964`, Schedule Service, Request a Free Consultation. Right: `hero-diagnostics.svg` in a rounded panel.
2. Trust strip: four badges using `badge-since-2003.svg`, `badge-owner-operated.svg`, `badge-local-sa.svg`, `badge-diagnostics-first.svg`.
3. Why choose us: diagnostics-first story, difficult problems others miss, owner-operated accountability, clear process.
4. Services grid: seven service cards using the generated icons in `src/assets/brand/`.
5. About Donald Bean: human, restrained credibility. Avoid unsupported biography details.
6. Process: Diagnose → Explain → Repair/Recover → Verify. Use numbered cards with circuit-line connectors on desktop.
7. Testimonials: if real testimonials are unavailable, use a section prepared for future quotes rather than fabricated reviews.
8. Contact CTA: large dark panel with phone link `tel:+12106586964`, service area list, and concise reassurance.

## Asset manifest and alt text
- `logo-primary.svg`: Full logo lockup. Alt: `It’s No Secret Computer Services — Finding What Others Miss.`
- `logo-mark.svg`: Square diagnostic mark. Alt: `Magnifying glass with circuit-board traces.`
- `favicon.svg`: App/favicon version of the diagnostic mark. Alt: decorative when used as favicon.
- `hero-diagnostics.svg`: Hero illustration. Alt: `Diagnostic dashboard with a magnifying glass highlighting circuit-board issues.`
- Service icons: computer repair, malware removal, data recovery, custom PC, performance tuning, small business support, technology training. Use each SVG title/desc or equivalent HTML alt text.
- Trust badges: since 2003, owner operated, local San Antonio area, diagnostics first.

## Suggested imagery and iconography
Use generated SVG/CSS assets only. The hero should combine a diagnostic dashboard, subtle circuit traces, and the magnifying-glass motif. Service cards should pair concise copy with single-color line icons on dark panels. Avoid stock photos unless the license is clearly commercial and the image looks local/professional rather than generic.

## Responsive behavior
- Desktop ≥1024px: hero and major feature sections use 2-column layout; services grid 3 columns; trust badges 4 columns.
- Tablet 768–1023px: hero stacks art below text or uses 55/45 split; services grid 2 columns; CTA buttons remain inline if space allows.
- Mobile <768px: single column, 24px page gutters, H1 38–44px, buttons full-width, trust badges 2-column or stacked, hero art simplified/downsized.

## Accessibility requirements
- Maintain 4.5:1 contrast for body text and 3:1 for large headings/icons.
- All CTAs need visible focus states and 44px minimum touch target.
- SVGs with text content are decorative if equivalent HTML text appears nearby; otherwise use the alt text above.
- Do not fabricate reviews or guarantees. Keep claims to provided facts: Donald Bean, phone number, service area, since 2003/20+ years.

## Acceptance criteria for engineer
- MUI theme implements the palette, typography, spacing, radius, and component states above.
- No current/existing logo appears anywhere.
- Generated SVG assets are imported from `src/assets/brand` or served from `public/assets`.
- Hero includes tagline or logo lockup and at least one phone CTA with `tel:+12106586964`.
- Services, trust, about, process, and contact sections use the specified visual hierarchy and assets.
- Build passes and rendered page shows no obvious console/runtime errors.
