# Testimonial Carousel UI/UX Handoff

Project: It’s No Secret Computer Services React/Vite/MUI marketing site
Target file likely affected: `src/App.jsx`
Design intent: Replace the placeholder testimonials section with a polished, trustworthy carousel using the supplied real reviews. Preserve the approved logo, hero, cards, navy/teal/green visual system, and restrained local computer-services positioning.

## Section strategy

Use the testimonials section as social proof, not as a loud sales block. It should feel like verified neighborhood/customer confidence layered into the existing diagnostic-lab style.

Recommended section copy:

- Eyebrow: `Customer stories`
- Title: `Trusted computer help when the stakes feel high.`
- Body: `Real customers call out quick turnaround, honest guidance, reliable builds, and careful file recovery support from Donald Bean.`

Optional compact trust chips under the heading:
- `Quick turnaround`
- `Data saved`
- `Reliable custom builds`
- `Local San Antonio-area help`

Keep these chips factual and derived from review content. Do not introduce unsupported ratings, review platform claims, star counts, guarantees, or “best in San Antonio” language.

## Carousel layout

### Desktop, >=1024px

Use a 12-column MUI Grid inside the existing `Container maxWidth="lg"`.

Recommended structure:

1. Left column, 4 columns:
   - SectionHeading or equivalent heading stack.
   - 2–3 concise trust chips.
   - Small line of context: `Five customer reviews supplied for publication.` only if useful internally; avoid making the public UI feel admin-like.
   - Manual controls below: previous button, next button, and a pause/play toggle.

2. Right column, 8 columns:
   - One large active testimonial card with carousel controls/dots.
   - On wide desktop, optionally show a secondary “next quote” preview card behind/to the side with lower opacity, but do not show more than 2 cards at once. The section should stay calm.

Active card design:
- Use the existing `PolishedCard` treatment: dark elevated panel, `#20354F` border, green/cyan top accent.
- Card background: `linear-gradient(145deg, rgba(16,36,59,.92), rgba(11,23,40,.96))` with a subtle radial accent: `radial-gradient(circle at 90% 0%, rgba(46,230,166,.12), transparent 20rem)`.
- Padding: 32–40px desktop, 24px tablet, 20px mobile.
- Border radius: current card radius 16px; keep consistent.
- Add a decorative quote mark only if subtle: mono `“` glyph in `rgba(56,214,255,.18)`, 64–88px, positioned top-right. Mark it `aria-hidden`.
- Add a small “Customer review” chip at card top or footer, not a fake star rating.

Quote typography:
- Quote text: 20–22px desktop for short/medium reviews; 18–20px for long review excerpts; line-height 1.65–1.75.
- Author: 16px, weight 600, `text.primary`.
- Supporting label: 13px mono or `text.secondary`, e.g. `Computer service customer` / `Custom PC customer` / `Data recovery customer`.

## Review content model

Create a `testimonials` array with fields:

```js
{
  id: 'sc',
  author: 'S. C.',
  label: 'Computer service customer',
  pullQuote: 'Quick turn-around, affordable prices, and quality work!',
  quote: 'Very convenient computer services. Quick turn-around, affordable prices, and quality work! I’ll be calling Donald for help with my computers in the future!',
  excerpt: 'Very convenient computer services. Quick turn-around, affordable prices, and quality work! I’ll be calling Donald for help with my computers in the future!',
  theme: 'Quick turnaround',
  isLong: false
}
```

Use smart apostrophes if the rest of the site already does, but keep the tone authentic.

## Short vs long review treatment

### Short and medium reviews

Reviews 1, 2, 3, and 5 can appear in full on desktop and tablet. On mobile, reviews 2 and 5 may use a 4–6 line clamp if needed, but full display is acceptable if spacing remains comfortable.

### Long Mauro Perez review

Do not put the entire Mauro review into the auto-rotating card by default. It is emotionally strong and valuable, but too long for carousel scanability.

Recommended treatment:
- Use an excerpt in the carousel card.
- Provide an inline `Read full story` / `Show less` button within the same card.
- When expanded, keep the card in normal document flow and pause auto-rotation.
- Do not open a modal unless engineering already has a standard modal pattern. Inline expansion is simpler and less disruptive.
- On mobile, expanded content should remain readable and should not trap focus.

Mauro excerpt recommendation:

`Donald got all my old files from my old computer and put everything on my new computer. Basically, he saved my life — I thought I was going to lose everything.`

Keep the full review available behind `Read full story`, with light typo fixes only.

## Copy-edit notes

Allowed light edits that preserve meaning/authenticity:

1. S. C.
   - Original is already strong.
   - Consider changing `I'll` to smart apostrophe `I’ll` for consistency only.
   - Keep `Quick turn-around` as supplied or standardize to `quick turnaround`. Recommendation: use `quick turn-around` in body if preserving voice, `Quick turnaround` in chip/theme.

2. Dom M.
   - Fix `specking out parts` to `spec'ing out parts` or clearer `specifying parts`.
   - Recommended edited quote: `Donald has built all of my machines in the last 15 years, and all have been super reliable. He’s offered quick turnaround time and was very thorough in specifying parts for the right price. Super affordable and quality service.`

3. TJ Dubois
   - Original works well.
   - Use as-is except smart apostrophe in `Can’t` if desired.

4. Mauro Perez
   - Fix obvious typo `labtop` -> `laptop`.
   - Light punctuation is acceptable to improve readability, but preserve urgency and emotion.
   - Avoid over-polishing the voice. This review should still sound like a real relieved customer.
   - Recommended carousel excerpt above.
   - Full-story edited version:
     `I went with a broken laptop, scared I was going to lose everything I worked so hard on. I thought the computer broke, but it was just the screen. I bought a new computer from Best Buy because my old computer, with all my files and work on it, was close to 10 years old. This computer wizard and technology guru got all my old files from my old computer and put everything — I mean everything — on my new computer. Basically, he saved my life. I thought I was going to die if I lost all those files. Would I go to him again? I’ll go to him as long as he’s in business. I don’t want to go to any other technology and computer people but him.`

5. DJ Ram-Z
   - Original works well.
   - Consider `turn around time` -> `turnaround time`.
   - `computer needs some lovin` can remain; it adds authentic local personality.

## Interaction behavior

Auto-rotation:
- Rotate every 7–8 seconds. This gives long quotes enough reading time.
- Default to auto-rotating only after the component is mounted and visible enough to matter if IntersectionObserver is easy; otherwise simple mount-based interval is acceptable.
- Pause auto-rotation on:
  - mouse hover over carousel
  - keyboard focus inside carousel
  - touch interaction / swipe / manual navigation
  - when a review is expanded
  - when document is hidden
- Resume only when the user explicitly presses play after manual pause, or after hover/focus ends if the user has not manually paused.

Manual controls:
- Previous and next controls should be MUI `IconButton`s with visible circular hit areas.
- Minimum target size 44x44px.
- Use `aria-label="Previous testimonial"` and `aria-label="Next testimonial"`.
- Add a pause/play toggle with `aria-label="Pause testimonial rotation"` / `aria-label="Resume testimonial rotation"`.
- Dots should be real buttons, not spans.
- Dot labels: `aria-label="Show testimonial from S. C."`, etc.
- Active dot should expose `aria-current="true"`.

Keyboard:
- Tab reaches previous, next, pause/play, dots, and read-more button.
- Do not auto-advance while keyboard focus is inside the carousel.
- Optional arrow-key navigation is nice but not required; if implemented, keep it scoped to the carousel root.

Swipe:
- Optional. If implemented, support horizontal swipe on touch devices without interfering with vertical page scroll.

## Accessibility and reduced motion

- Use `role="region"` on the carousel wrapper with `aria-label="Customer testimonials"`.
- The visible quote card can use `aria-live="polite"`, but only update the live region for manual changes. Avoid announcing every automatic rotation to screen readers if possible.
- Decorative quote glyphs and background marks must be `aria-hidden="true"`.
- Honor reduced motion:
  - `const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')`
  - If reduced motion is true, disable auto-rotation by default.
  - Remove slide/scale animation; use instant or very subtle opacity transition.
- Avoid aggressive motion. If using transitions, use 180–240ms opacity/translate at most.
- Maintain body text contrast. Use `text.secondary #B9C7D8` only on dark backgrounds where contrast remains readable; quote text should generally use `text.primary` or near-primary.

## Responsive behavior

### Desktop >=1024px
- Two-column section: heading/control rail + active card.
- Active card min-height around 360–420px to reduce layout jump.
- Excerpts keep the card consistent; expanded state may grow naturally.

### Tablet 768–1023px
- Stack heading above carousel or use a 12/12 grid.
- Controls sit in a row below heading or below card.
- Card width 100%; max-width about 760px and centered.
- Keep quote text 18–20px.

### Mobile <768px
- Single column.
- 24px gutters inherited from existing layout.
- Quote card padding 20px.
- Quote text 17–18px, line-height 1.65.
- Controls below the card: previous, pause/play, next, then dots on a second centered row if needed.
- Do not show preview/neighbor cards on mobile.
- Expanded Mauro story should be readable but not auto-expanded.

## Visual details to match current system

Use existing palette and patterns:
- Background section: current testimonials section `rgba(7,17,31,.58)` is appropriate.
- Card border: `#20354F`; hover/focus border `rgba(56,214,255,.45)`.
- Accent: green/cyan top rule from `PolishedCard`.
- Chips: `rgba(46,230,166,.08)` background, green check icon or mono label.
- Focus ring: `3px solid rgba(56,214,255,.28)` with 2px offset.

Avoid:
- Yellow five-star rows unless verified review/rating source is supplied.
- Heavy drop shadows.
- Stock customer avatars.
- Overly bubbly quote cards.
- Showing all five reviews as a dense grid; the request is a polished carousel.

## Suggested component outline

```jsx
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { IconButton, useMediaQuery } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
```

Implementation notes:
- Add React hooks imports if `App.jsx` currently has none.
- Keep carousel logic small in `App.jsx`; if it grows, extract `TestimonialsCarousel.jsx`.
- Store `activeIndex`, `isPaused`, and `expandedIds` or `expandedReviewId`.
- Use modulo math for previous/next.
- Use `setInterval` only when not paused, not reduced motion, and no expanded review.
- Clear interval on cleanup.

## Acceptance criteria for engineering

1. Testimonials placeholder is replaced with a carousel containing all five supplied reviews.
2. The carousel auto-rotates every 7–8 seconds unless reduced motion is requested.
3. Auto-rotation pauses on hover, keyboard focus, manual interaction, and expanded long review state.
4. Previous, next, pause/play, and dot controls are keyboard accessible with descriptive labels and visible focus states.
5. Dots are buttons, indicate the active testimonial, and can jump directly to a review.
6. The Mauro Perez review uses a readable excerpt by default and offers inline read-more/show-less behavior for the full story.
7. Short and medium reviews remain readable without dense truncation on desktop/tablet; mobile avoids oversized cards and can use careful line clamping where needed.
8. Visual styling matches the approved navy/teal/green MUI system and existing `PolishedCard` treatment.
9. No fake ratings, fabricated reviews, unsupported claims, stock avatars, or new logo/hero/card styling changes are introduced.
10. Reduced-motion users do not receive automatic slide motion.
11. The section works responsively: two-column/preview optional on desktop, stacked on tablet, single card with compact controls on mobile.
12. Build/test passes and rendered page has no console/runtime errors.
