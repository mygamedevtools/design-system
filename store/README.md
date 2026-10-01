# Asset Store kit

Everything a My Gamedev Tools package needs for its Asset Store listing, in brand style. The tool
and templates live here; each package's listing lives in that package's own repo:

```sh
npm run store -- ../scene-loader/store             # a listing folder; output goes to ../scene-loader/store/dist/
npm run store -- ../scene-loader/store --out tmp   # or anywhere else
npm run store -- example                           # the example in this repo (store/example)
```

Open `<listing>/dist/index.html` to review the result. It's self-contained (fonts and styles
included), so it works wherever the output lives. In the package's repo, ignore `store/dist/`; the
images are uploaded to the Publisher Portal by hand.

## What it produces

| File | Size | Unity's rule |
| --- | --- | --- |
| `icon.png` | 160×160 | No text. Shown at 80×80 in the browse grid. |
| `card.png` | 420×280 | Asset title and publisher logo or name only. |
| `cover.png` | 1950×1300 | Title, publisher logo or name, and tagline only. |
| `social.png` | 1200×630 | No text. Defaults to the mark; a supplied image must have no text either. |
| `screenshot-NN.png` | 2400×1600 | At least 1200px wide; 2400×1600 recommended. |
| `description.html`, `description.txt` | | Your description plus the required disclosures (dependencies, compatibility, third-party notices, AI use, links). |
| `Third-Party Notices.txt` | | Required when the package ships third-party fonts or code, e.g. the UI kit's fonts in samples. Put it in the package root. |
| `checklist.md` | | Automatic checks plus the manual ones the tool can't verify. |

All key images: no watermarks, Unity logos, sale banners or the default Skybox, and not only Unity
Editor screenshots.

## A listing folder

In the package's repo, e.g. `scene-loader/store/`:

```
store/
  listing.json      package, title, publisher, tagline, summary, category, unity, keywords,
                    dependencies, aiDisclosure, includesUiKit, links, media.cover, media.social, screenshots
  description.md    the description body: paragraphs, "## " headings, "- " lists, **bold**, `code`, [links](url)
  screenshots/      source images; reference them by path relative to this folder
  dist/             generated (ignore it in git)
```

Media paths are relative to the listing folder; paths starting with `/` point into this repo (for
example the kit renders in `/site/img/`). Fields set to `[CONFIRM …]` show up as warnings until you
replace them; `store/example/` shows every field. Capture screenshots at 2160px wide or more so they
aren't upscaled in the frame.

## Submitting

The kit covers the listing. The package itself goes through Unity's tools:

1. Create a package draft in the [Publisher Portal](https://publisher.unity.com) and fill in the
   listing from `<listing>/dist/`.
2. Install [Asset Store Publishing Tools](https://assetstore.unity.com/packages/package/5368745),
   then run **Tools > Asset Store > Validator** and fix what it reports.
3. Upload with **Tools > Asset Store > Uploader**, then submit the draft for review (at least five
   business days).

## Requirements this kit follows

From Unity's [key image article](https://support.unity.com/hc/en-us/articles/210122403-What-makes-a-great-key-image-and-are-there-any-size-restrictions-),
[Submission Guidelines](https://assetstore.unity.com/publishing/submission-guidelines) and
[publisher docs](https://docs.unity.com/en-us/asset-store/publishing/asset-packages/workflow.md), as of
September 2026:

- Unity 2022.3 or newer (1.3.a).
- Dependencies disclosed in the description and set up in the manifest or Publisher Portal (1.1.c).
- Third-Party Notices file for fonts and other third-party components, plus the sentence
  "Asset uses [name] under [license]; see Third-Party Notices.txt" in the description (1.2.a).
- AI-assisted content disclosed in plain terms (1.6).
- Documentation for anything with code or setup (2.3), samples or demo content (1.1.f).
- Code in your own namespaces, no errors or warnings after setup (2.5.a, 1.1.b).
- Keywords: space-delimited, 255 characters (from Unity's older publishing docs; check the portal).

Unity doesn't publish a summary length limit in these docs, so the checklist reports the length for
you to check against the Publisher Portal.
