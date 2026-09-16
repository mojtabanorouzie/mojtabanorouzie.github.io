---
title: How this blog is built
description: How a folder of Markdown files and one Node script turn my writing into blog pages.
date: 2026-08-05
type: build
tags: [meta, static-sites, tooling]
---

The rest of this site uses three main files: `index.html`, `styles.css`, and `script.js`. It does not need a build step to prepare those pages. I liked this simple setup and wanted to keep it when I added a blog.

My goal was simple: adding a post should not make the site slower to load or the project harder to understand.

## How it works

Every post is a Markdown file in `content/blog/`. Markdown lets me write text with simple marks for headings, links, and lists.

A Node script reads these files and creates HTML pages in `blog/`. This happens before the site is published. The reader's browser gets the finished pages. It does not need extra code to turn Markdown into HTML.

```text
content/blog/my-post.md   →   blog/my-post/index.html
                          →   blog/index.html
                          →   blog/tags/<tag>/index.html
                          →   blog/rss.xml, blog/feed.json
                          →   sitemap.xml, robots.txt
```

Along with each post, the script creates a list of posts and pages for each tag. It also creates feeds for reading apps and a sitemap that lists pages for search engines.

The generated `blog/` folder is not saved in Git, the tool I use to track changes. The publishing process builds it again each time I push a change. It then prepares the files for GitHub Pages, where the site is published. The site already had an automatic process for creating my résumé PDF. I added the blog build to that process.

## Post details

Each file starts with a block called frontmatter. It holds details such as the title, date, and tags:

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

The `type` field says what kind of post it is. I write long articles, short notes, thoughts about things I read, and posts about things I build.

At first, I thought I needed four separate systems. But all four kinds of post have a title, a date, and a body. One system can handle them. The page templates control how each kind looks. For example, a short note does not need to show a reading time.

## A few useful details

**One extra package.** The build uses `marked` to read Markdown. That package does not require other packages, and it runs only when the site is built. I wrote a small reader for the frontmatter too. The blog uses a limited set of fields, so I did not add a full YAML reader.

**Links to headings.** Each `##` heading gets an ID and a direct link. The IDs support English and Persian text. This lets someone share a link to a section instead of asking a reader to search the whole page.

**English and Persian text.** I sometimes use both languages in one post. English reads from left to right; Persian reads from right to left. The build checks the text in each block and sets its direction. It uses the main language direction in that block. A single English term at the start of a Persian paragraph should not decide the direction of the whole paragraph.

**Unpublished drafts.** A post marked `draft: true` is left out of the normal build. It has no public page and does not appear in feeds or the sitemap. To preview drafts on my computer, I run:

```bash
BLOG_DRAFTS=1 node tools/blog/build.mjs
```

This setting tells the build to include drafts in the local preview.

## What I left out

I have not added syntax highlighting, which uses colors to show different parts of code. It would need extra code or files. For now, code uses a clear font, readable colors, and enough space between lines. If I share more code later, I can change this in `tools/blog/markdown.mjs`.

I also left out comments, visitor tracking, a newsletter, and search. There are only a few posts, so I have kept the site simple.

The post list is still on one page. I may split it across pages when there are enough posts to need that.

## Writing and publishing

These commands show the three steps I use:

```bash
# 1. write
$EDITOR content/blog/something-i-learned.md

# 2. preview
node tools/blog/build.mjs && python -m http.server 8123

# 3. publish
git add content/blog/something-i-learned.md && git commit && git push
```

First, I write the post. Then I build the pages and preview them on my computer. Finally, I save and push the change with Git.

That last step starts the automatic process that builds and publishes the site and PDF. I can publish from my project without logging into a separate writing tool.
