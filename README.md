# Mojtaba — Personal Resume Site

A single-page, responsive, accessible resume website presenting one cohesive brand:
**Senior Software Engineer (.NET, SQL, EF Core, Kafka) + Persian musician (Daf, Tonbak, Tar).**

The visual motif is a **waveform** — it reads as both an audio signal and a data stream,
tying the two identities together. Palette: deep indigo/charcoal + warm brass.

- No build step, no frameworks — semantic HTML5, modern CSS, vanilla JS.
- Mobile-first, responsive down to 360px.
- Dark/light theme toggle (persisted, respects system preference).
- Accessible: WCAG AA contrast, keyboard nav, landmarks, alt text, `prefers-reduced-motion`.
- SEO: title, meta description, Open Graph, inline SVG favicon.

## File structure

```
resume-site/
├── index.html      # all content + sections
├── styles.css      # design tokens, layout, theming
├── blog.css        # editorial reading layer (blog pages only)
├── script.js       # theme toggle, mobile nav, scroll reveal, blog teaser
├── 404.html        # branded not-found page (served by GitHub Pages)
├── README.md
├── content/blog/   # ← the blog. One Markdown file per post.
├── tools/blog/     # the generator that turns that Markdown into HTML
├── tools/og/       # card.html → assets/og-image.png (social preview)
├── resume/         # print-styled résumé, source of the generated PDF
└── assets/
    ├── blog/                    # images used by posts
    ├── Mojtaba-Norouzi-CV.pdf   # generated in CI, gitignored
    └── og-image.png             # generated in CI, gitignored
```

Generated and gitignored: `blog/`, `sitemap.xml`, `robots.txt`, `assets/og-image.png`
and the résumé PDF. All are rebuilt in CI on every push, so nothing generated is ever
committed — the deployed site always matches its source.

Rebuild everything locally:

```bash
npm --prefix tools/blog ci && node tools/blog/build.mjs
npm --prefix tools/og  ci && node tools/og/build-og.mjs
```

## Run locally

It's a static site — just open `index.html`, or serve it:

```bash
# Python
python -m http.server 8000
# then visit http://localhost:8000

# or Node
npx serve .
```

## Deploy to GitHub Pages (automated via GitHub Actions)

This repo ships a workflow at `.github/workflows/deploy.yml` that publishes the site to
GitHub Pages on every push to `main` (no build step — it just uploads the repo root).

1. Create a repo. For a personal site use **`<username>.github.io`**; any name works for a
   project site.
2. Push this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial resume site"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

3. In the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**
   (one-time switch).
4. The workflow runs automatically. Watch it under the **Actions** tab; when it's green the
   site is live:
   - `<username>.github.io` repo → `https://<username>.github.io/`
   - any other repo → `https://<username>.github.io/<repo>/`

You can also trigger a deploy manually from the **Actions** tab (the workflow has
`workflow_dispatch` enabled).

## Résumé PDF (auto-built in CI)

The "Download Résumé" button serves `assets/Mojtaba-Norouzi-CV.pdf`, which is **generated
in CI** — never committed by hand — so it always matches the source.

- **Source of truth:** `resume/resume.html` + `resume/resume.css` (print-styled, A4,
  selectable text). Edit those to change the résumé.
- **Renderer:** headless Chromium via Playwright (`resume/build-pdf.mjs`), chosen for
  print fidelity that matches the browser.
- **Pipeline:** the Pages workflow (`.github/workflows/deploy.yml`) installs Chromium,
  runs the builder into `assets/`, then uploads the whole repo as the Pages artifact — so
  the deployed site always links a fresh PDF. The file is gitignored.

Rebuild locally:

```bash
npm --prefix resume install
npx --prefix resume playwright install chromium
node resume/build-pdf.mjs   # -> assets/Mojtaba-Norouzi-CV.pdf
```

Trigger a CI rebuild any time from the **Actions** tab (the workflow has
`workflow_dispatch`), or just push to `main`.

## Blog

Posts are Markdown files in `content/blog/`. `tools/blog/build.mjs` renders them to
static HTML in `blog/` at build time — the browser gets no Markdown parser and no
client-side rendering.

### Publish a post

```bash
# 1. write — the filename becomes the URL: my-post.md → /blog/my-post/
$EDITOR content/blog/my-post.md

# 2. preview
node tools/blog/build.mjs && python -m http.server 8123

# 3. publish
git add content/blog/my-post.md && git commit -m "post: my post" && git push
```

Pushing to `main` triggers CI, which reruns the tests, rebuilds the blog and the PDF,
and deploys. There is no admin UI and no database.

### Frontmatter

```yaml
---
title: Ordering is a local property   # required
description: One or two sentences.    # optional — derived from the first paragraph
date: 2026-07-18                      # required, YYYY-MM-DD
updated: 2026-08-02                   # optional
type: article                         # article | note | reading | build
tags: [Kafka, distributed-systems]    # optional
featured: true                        # optional — pins the post to the index hero
draft: true                           # optional — excluded from the build entirely
cover: /assets/blog/cover.png        # optional — raster (png/jpg/webp), see below
coverAlt: Description of the image.   # required whenever cover is set
lang: fa                              # optional, default en
link: https://…                       # optional — the source a `reading` post is about
---
```

The build **fails loudly** on a missing title or date, an unknown `type`, a cover
without alt text, a duplicate slug, or `<script>`/`onclick=`/`javascript:` in the body.
Errors name the file and list every problem at once.

### Notes

- **Drafts never reach disk.** `draft: true` produces no page, no feed entry and no
  sitemap row. To preview one locally: `BLOG_DRAFTS=1 node tools/blog/build.mjs`.
- **Body headings start at `##`.** A `#` in the body is rendered as `<h2>`, because the
  page's `<h1>` is the post title.
- **Persian works.** Set `lang: fa`; each block is given the direction its own text
  wants, so an English paragraph inside a Persian post stays LTR (and vice versa). Code
  is always LTR.
- **Covers should be raster.** An SVG cover still renders on the page, but social
  crawlers reject SVG, so the share card falls back to `assets/og-image.png`.
- **Routes:** `/blog/`, `/blog/<slug>/`, `/blog/tags/`, `/blog/tags/<tag>/`,
  `/blog/rss.xml`, `/blog/feed.json`, plus `/sitemap.xml` and `/robots.txt`.
- **`slug: tags` is reserved** — the build owns `/blog/tags/` and rejects the collision.

### Tests

```bash
npm --prefix tools/blog test
```

Covers frontmatter parsing, slugs, direction detection, rendering, draft exclusion,
generated metadata, feeds, and the empty/single-post/invalid-content cases. CI runs it
before every deploy.

## Content status

Engineering, education, links, and résumé download are filled from the real CV
(`assets/Mojtaba-Norouzi-CV.pdf`). Links point to:

- GitHub: <https://github.com/mojtabanorouzie>
- LinkedIn: <https://www.linkedin.com/in/mojtabanorouzi/>
- Email: `mojtaba.norouzie@gmail.com`

**Still predicted — review & rewrite:** the **Music → Performance highlights** (concert
venues/years are plausible stand-ins) and the instrument blurbs. The **Music embed** block
is an optional slot — uncomment the `<iframe>` in `index.html` and set a YouTube/SoundCloud
URL, or delete the `.embed` block.

Optional: add `assets/og-image.png` (1200×630) for a richer social-share preview.

## License

Personal use. Replace placeholder content with your own before publishing.
