# Screenshots

Every page in the app, captured in one command.

## Generating them

Serve the site, then run the capture:

```bash
npx http-server -p 8791 -s
```

```bash
node capture-screenshots.js --both --mobile --base http://localhost:8791
```

Output lands in `screenshots/`, which is gitignored — see "Why they are not
committed" below.

| Flag | Effect |
|---|---|
| *(none)* | Dark theme, 1280px, every page |
| `--light` | Light theme instead of dark |
| `--both` | Both themes |
| `--mobile` | Also capture at 375px |
| `--base <url>` | Point at a different server (default `http://localhost:8791`) |

`--both --mobile` gives the full set: 36 pages x 2 themes x 2 widths = 144
images, roughly 27 MB.

## Pages are discovered, not listed

The script walks `.`, `pages/`, `pages/learn/` and `practice-apps/` for HTML
files rather than reading a hard-coded list.

This matters. The previous capture script named eight URLs explicitly, so the
set silently went stale every time a page was added — and a screenshot set that
quietly omits pages is worse than having none, because it looks complete. Add a
page and it appears in the next run with no edit here.

The output directory is emptied first, so a deleted page does not leave an
orphan image behind pretending to still be part of the app.

## It doubles as a test

Each page is loaded with console listeners attached. If a page fails to load,
returns a non-200, or logs a console error, the run reports it and exits
non-zero.

A page that errors while being photographed is a page that errors for a
visitor. It costs nothing to notice at the same time.

## State is seeded

Dashboards, the portfolio and the RPG chip are populated with quiz runs,
defect finds, a study plan and two saved drafts before capture.

Empty-state screenshots tell you nothing about the design of the thing you are
reviewing — every dashboard looks clean with no data in it.

## Why they are not committed

`screenshots/` is gitignored. The repository is about 1.7 MB; the full set is
27 MB, so committing it would grow the history roughly seventeenfold to store
files that are stale the moment a color token changes.

This history has already been rewritten once to strip 11.7 MB of accidentally
committed files. Re-adding twice that on purpose would be an odd lesson to
take from it.

The generator is the durable artifact. The images are its output, and they
rebuild in under a minute.

If a specific screenshot needs to live somewhere permanent — a README banner,
an issue, a portfolio page — copy that one file out deliberately rather than
committing the directory.
