---
title: How this blog is built
description: A Markdown folder, one Node script, and no framework. The build log for the publishing system you are currently reading.
date: 2026-08-05
type: build
tags: [meta, static-sites, tooling]
---

The rest of this site is three files: `index.html`, `styles.css`, `script.js`. No build
step, no framework, no `node_modules` in sight. I liked it that way, and I did not want
a blog to be the thing that dragged in a bundler.

So the constraint I set myself was: **adding a post must not make the site heavier for
the reader, and must not make the repository harder to understand.**

## What it does

Every post is a Markdown file in `content/blog/`. A Node script reads them at build
time and writes plain HTML into `blog/`. The browser receives no Markdown, no parser,
and no JavaScript that is not already on the homepage.

```text
content/blog/my-post.md   →   blog/my-post/index.html
                          →   blog/index.html
                          →   blog/tags/<tag>/index.html
                          →   blog/rss.xml, blog/feed.json
                          →   sitemap.xml, robots.txt
```

The generated directory is gitignored. It is rebuilt in CI on every push, immediately
before the GitHub Pages artifact is uploaded — which is exactly how the résumé PDF on
the homepage already worked. I did not invent a pipeline; I added a step to one that
existed.

## Frontmatter

Each file opens with a small metadata block:

```yaml
---
title: Ordering is a local property
description: Message ordering is not something a broker hands you globally.
date: 2026-08-05
updated: 2026-08-09
type: article
tags: [Kafka, distributed-systems]
featured: true
draft: false
---
```

`type` is the interesting field. I write four different kinds of thing — long articles,
short notes, reactions to something I read, and build logs like this one — and my first
instinct was four separate systems. That was wrong. They differ in *presentation*, not
in structure: same title, same date, same body. One content model with a `type` field
does the whole job, and the templates decide that a note does not need a reading-time
badge.

## The parts worth mentioning

**One dependency.** `marked`, for Markdown. It has no transitive dependencies and it
runs only at build time. I parse the frontmatter myself — it is eight known keys, and
pulling a full YAML engine in to read eight known keys is not a trade I wanted.

**Headings become anchors.** Every `##` gets a stable, Unicode-safe id and a permalink,
so you can link someone to the paragraph that matters instead of to the top of a
two-thousand-word page.

**Direction is per block, not per page.** I write in English and in Persian, sometimes
in the same paragraph. The build tags each block with the direction that most of its
characters actually want, rather than trusting the first-strong-character rule that
`dir="auto"` uses — which gets a Persian sentence wrong the moment it opens with an
English technical term.

**Drafts are not built.** A post with `draft: true` produces no file at all. There is no
page to leak, no URL to guess, and nothing in the sitemap or feeds. Locally I run:

```bash
BLOG_DRAFTS=1 node tools/blog/build.mjs
```

which is the only way a draft ever becomes HTML.

## What I deliberately left out

Syntax highlighting, for now. Every option costs either a large build-time grammar
bundle or client-side JavaScript, and monospaced code with real contrast and generous
line height reads fine. If I start posting more code than prose I will revisit it — the
hook is a single function in `tools/blog/markdown.mjs`.

Comments, analytics, a newsletter, and search. There are a handful of posts here. A
search box would be decoration.

Pagination. At some point a chronological index gets silly, but "some point" is a long
way from here, and building for it now would mean guessing at a problem I do not have.

## The whole publishing workflow

```bash
# 1. write
$EDITOR content/blog/something-i-learned.md

# 2. preview
node tools/blog/build.mjs && python -m http.server 8123

# 3. publish
git add content/blog/something-i-learned.md && git commit && git push
```

Step three triggers CI, which rebuilds the site and the PDF and deploys. There is no
step four, and there is no admin panel to log into — which was the entire objective.
