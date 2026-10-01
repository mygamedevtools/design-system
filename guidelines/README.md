# Brand guidelines

The visual reference is the site: run `npm run dev` and open http://localhost:4321/site/.
This page covers the rules that a page can't show.

## Name

- Write **My Gamedev Tools** in prose, and **MY GAMEDEV TOOLS** in the wordmark and small labels.
- Package names are written in title case in prose (Scene Loader, Script Template) and uppercase in
  display type on cards and banners.

## Logo

The mark is **H1**: a hexagon frame with three rounded axes and a center dot, read as both a cube and
a 3D gizmo. Every package uses the same mark; packages are told apart by name, never by a variant
mark.

- Use `mark-light` on cream or other light backgrounds and `mark-dark` on ink or other dark
  backgrounds. The file name describes the background, not the mark.
- Use `mark-mono` (single color, `currentColor`) where color isn't available, like embossing,
  one-color prints and monochrome icon sets.
- The axes always keep their order, top to bottom-left to bottom-right: tomato, amber, teal. Don't
  recolor, rotate, outline or add effects to the mark.
- Keep clear space around the mark of at least a quarter of its height.
- Minimum size is 16px. Below 24px, use the mark alone, without the wordmark.
- In lockups, the wordmark is always to the right of the mark (`lockup-horizontal`, or
  `lockup-stacked` where space is narrow).

## Color

- Light mode is cream with ink text, and dark mode is ink with cream text. Use the semantic
  `--mgt-color-*` tokens so both modes work without extra code.
- Tomato, amber and teal are signals, not surfaces. They appear in the stripes, the mark's axes,
  eyebrows, links and one primary action per screen. Never use them as large background fills.
- Bright amber and teal fail contrast on cream. For graphics on light backgrounds use `amber-deep`
  and `teal-deep`; for text use `tomato-deep` (the light-mode link and accent color).
- The stripes always appear together, in order, with equal widths.

## Status

| Status | Use | Docusaurus |
| --- | --- | --- |
| Success | Tips, stable releases, passing checks, valid input | `:::tip`, `badge--success` |
| Info | Neutral facts worth noticing, previews | `:::info`, `badge--info` |
| Warning | Deprecations, breaking changes ahead, risky settings | `:::warning`, `badge--warning` |
| Error | Failures, invalid input, breaking releases | `:::danger`, `badge--danger` |

- Each status has a solid color (`--mgt-color-success`), the text on it (`--mgt-color-on-success`), a
  tinted background, a border and a text color for use on the tint. Every pair is at least 4.5:1.
- Green, cobalt and cherry are reserved for status; don't use them as decoration. Warning shares
  amber with the brand stripes, which is fine because amber already reads as caution.
- Always pair the color with an icon or a word. The icons differ by shape (circle-check, circle-i,
  triangle, octagon-x), so status never depends on color alone.
- Use tinted callouts for messages and solid labels for short tags. `:::note` stays neutral.

## Type

| Role | Font | Notes |
| --- | --- | --- |
| Display | Russo One | Headings, wordmark, package names. One weight; never fake bold. |
| Text | Rethink Sans | Body copy and UI. |
| Code and labels | Red Hat Mono | Code, eyebrows and small uppercase labels, tracked at 0.1em. |

All three are under the SIL Open Font License (see `assets/fonts/*/OFL.txt`).

## Signature elements

- **Diagonal stripes** in the top-right corner of store cards, social cards and banners. They must
  bleed off both the top and right edges; nothing sits on top of them.
- **Tri-color rule**: a 3px tomato, amber and teal bar under headers (docs navbar, sample
  screens).
- **Eyebrow**: three short stripe bars followed by an uppercase mono label.

## Asset Store

- Cards, covers and social images are ink in every context, so they stay recognizable among
  screenshot-style thumbnails.
- Follow Unity's text rules: the icon and social image have no text, the card shows only the title
  and publisher, and the cover adds a tagline. The templates enforce this; `npm run store` renders
  them (see `store/README.md`).
- Screenshots use the branded frame: eyebrow with the product name, one short caption, the image.
- The icon is the dark mark centered on ink.

## Unity

- **Editor windows, inspectors and settings pages keep Unity's standard look.** No brand header,
  colors or fonts. Package tools should feel native next to every other editor tool.
- **Runtime UI in samples is branded.** Loading screens, HUDs and menus in a package's samples use
  the UI kit, which ships inside the sample (`npm run unity:export -- --for <package>`). Games never
  depend on it: it's never a package dependency, and nothing outside samples references it.
- Runtime screens default to dark, since they usually sit over a game scene; use
  `.mgt-theme-light` where a light screen fits better.
- A branded loading screen has the corner stripes, the mark, an eyebrow label, the percentage in
  Russo One and an accent progress bar.

## Voice

Short, concrete and code-first, like the current Scene Loader copy: say what the package does in one
line ("Scene transitions, in one line."), then show the code. Avoid hype words.
