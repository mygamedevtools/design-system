# Templates

Fixed-size HTML pages for marketing images. Each one reads its text from URL parameters, so one
template serves every package. Open them through `npm run dev` (fonts don't load from `file://`).

| Template | Size | Parameters |
| --- | --- | --- |
| `asset-store/icon.html` | 160×160 | `theme` |
| `asset-store/card.html` | 420×280 | `name`, `theme` |
| `asset-store/cover.html` | 1950×1300 | `name`, `tagline`, `image`, `theme` |
| `asset-store/social.html` | 1200×630 | `image` (no text allowed), `theme` |
| `asset-store/screenshot.html` | 2400×1600 | `eyebrow`, `caption`, `image`, `theme` |
| `social/social-card.html` | 1200×630 | `title`, `code`, `subtitle`, `theme` (docs link previews; has text, so not for the Asset Store) |
| `social/readme-banner.html` | 1280×320 | `name`, `tagline`, `theme` (render both for GitHub light/dark) |

Example: `/templates/asset-store/card.html?name=FPS%20Counter`

Asset Store cards and icons default to dark (ink) in every context, which keeps them recognizable
among screenshot-style thumbnails. The README banner follows `theme` or the OS setting.

The Asset Store templates follow Unity's text rules (see [store/README.md](../store/README.md)), and
`npm run store -- <listing folder>` renders them all to PNG at exact size. `image` takes a URL, e.g.
`/site/img/unity-loading-dark.png`; images are scaled to fit their frame. For the other templates,
open the page at 100% zoom and use Chrome DevTools' "Capture node screenshot" on `<body>`.
