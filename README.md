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
├── script.js       # theme toggle, mobile nav, scroll reveal
├── README.md
└── assets/
    ├── Mojtaba-Resume.pdf   # (add yours — hero "Download Résumé" button)
    └── og-image.png         # (add yours — 1200×630 social preview)
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
