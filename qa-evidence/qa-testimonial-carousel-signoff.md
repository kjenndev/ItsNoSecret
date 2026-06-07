# QA sign-off: testimonial carousel

Task: t_ae058bce
Project: /home/ansibl/Code/its-no-secret-computer-services-site
Date: 2026-06-06

## Result

PASS

## Automated evidence

Command run from project root:

```sh
npm test && npm run lint && npm run build
```

Actual result:
- `npm test`: PASS — Vitest reported `1 passed (1)` test file and `10 passed (10)` tests.
- `npm run lint`: PASS — eslint exited 0.
- `npm run build`: PASS — Vite built successfully, `✓ built in 213ms`.

## Functional/manual browser evidence

Local preview:
- Started with `npm run dev -- --port 5173`.
- Confirmed `curl -I --max-time 5 http://127.0.0.1:5173/` returned `HTTP/1.1 200 OK`.
- Browser console after navigation/interactions: 0 console messages, 0 JS errors.

Carousel checks:
- Auto-rotation observed: initial state advanced from S. C. to Dom M. after the rotation interval during browser review.
- Manual previous/next navigation checked by focused/clicked controls; Next from DJ Ram-Z wrapped to S. C., Previous from S. C. wrapped to DJ Ram-Z.
- Position indicators checked for all five supplied reviews; each dot selected the expected customer and set `aria-current="true"` on the active indicator:
  - S. C.
  - Dom M.
  - TJ Dubois
  - Mauro Perez
  - DJ Ram-Z
- Mauro Perez long review checked in excerpt and expanded states. Expanded quote length was 641 characters; card height expanded from 394px to 558.5px with no horizontal overflow in the desktop browser (`document.body.scrollWidth > window.innerWidth` returned false).
- Keyboard usability checked by focusing `Next testimonial` and pressing Enter; active testimonial changed from Mauro Perez to DJ Ram-Z while focus remained on the labeled control.
- Accessibility basics inspected: carousel is a labeled `role="region"`; previous/pause/next controls and all five indicators have accessible labels; active indicator uses `aria-current`; live region is `aria-live="polite"`; code implements `prefers-reduced-motion: reduce` via MUI `useMediaQuery` to disable rotation/animations.

Visual evidence generated/inspected:
- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/qa-testimonial-carousel-desktop-1440.png` — 1440 x 5200 PNG.
- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/qa-testimonial-carousel-mobile-390.png` — 390 x 12000 PNG.
- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/qa-testimonial-carousel-desktop-1440-carousel-crop.png` — 1440 x 900 carousel crop.
- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/qa-testimonial-carousel-mobile-390-carousel-crop.png` — 390 x 1600 carousel crop.

Visual inspection notes:
- Desktop expanded Mauro Perez review remains readable and contained inside the testimonial card; controls and dots remain visible/professional.
- Mobile screenshot/crop shows the carousel stacked cleanly, text readable, controls/dots visible, and no testimonial content cut off.
- Existing logo, hero diagnostic card, polished content cards, and CTAs remained visible and styled consistently in desktop/mobile screenshots.

## Acceptance criteria status

- All five supplied reviews represented with correct attribution: PASS.
- Auto-rotate plus manual previous/next and indicators: PASS.
- Long reviews readable/professional desktop/mobile, no cut-off observed: PASS.
- Accessibility basics: PASS.
- Existing approved logo/hero/card styling and CTAs not regressed: PASS.
- Automated evidence (`npm test`, `npm run lint`, `npm run build`): PASS.
- Functional/manual browser review and screenshot evidence under `qa-evidence`: PASS.

## Notes / limitations

No issues found. This directory is not a git repository, so no git diff/status was used for QA sign-off.
