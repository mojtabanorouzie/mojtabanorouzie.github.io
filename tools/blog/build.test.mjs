// End-to-end: build a fixture corpus into a temp directory and assert on the
// files that come out. This is the test that actually protects the routes,
// the draft guarantee and the generated metadata.

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { build } from "./build.mjs";
import { SITE } from "./config.mjs";

const silent = { log() {}, warn() {}, error() {} };

// SITE.origin is env-overridable for the domain cutover, so these tests derive
// their expectations from it rather than pinning a hostname that would fail the
// build the moment the origin changes. Escaped for use inside a RegExp.
const ORIGIN_RE = SITE.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const FIXTURES = {
  "published.md": `---
title: A published post
description: The description of the published post.
date: 2026-03-02
type: article
tags: [Kafka, Event Driven]
---

# Body heading

First paragraph with \`code\` and a [link](https://example.com).

## Section one

\`\`\`js
const x = 1 < 2;
\`\`\`

## Section two

| a | b |
| - | - |
| 1 | 2 |

## Section three

Done.
`,
  "older.md": `---
title: An older post
description: Older, and tagged the same way.
date: 2026-01-15
tags: [Kafka]
---

Older body.
`,
  "secret.md": `---
title: A secret draft
description: Must never be published.
date: 2026-04-01
draft: true
tags: [Kafka]
---

Secret body text.
`,
  "no-description.md": `---
title: No description supplied
date: 2026-02-01
---

This first paragraph should become the description automatically.

A second paragraph that should not.
`,
  "persian.md": `---
title: یک یادداشت فارسی
description: توضیح کوتاه.
date: 2026-02-10
lang: fa
---

این یک پاراگراف فارسی است.

This paragraph is English and should be marked ltr.
`,
  "awkward.md": `---
title: "Angle < brackets > & \\"quotes\\" — a very, very long title that keeps going well past any sensible column width to see what breaks"
description: Special characters everywhere.
date: 2026-02-20
tags: [C#]
---

Body.
`,
};

let dir;
let out;
let root;
let result;

const read = (path) => readFile(join(root, path), "utf8");

before(async () => {
  root = await mkdtemp(join(tmpdir(), "blog-test-"));
  dir = join(root, "content");
  out = join(root, "blog");
  await mkdir(dir, { recursive: true });
  for (const [name, source] of Object.entries(FIXTURES)) {
    await writeFile(join(dir, name), source, "utf8");
  }
  result = await build({ contentDir: dir, outDir: out, rootDir: root, year: 2026, log: silent });
});

after(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("routes", () => {
  it("builds the blog index", () => {
    assert.ok(existsSync(join(out, "index.html")));
  });

  it("builds one directory-style page per published post", () => {
    for (const slug of ["published", "older", "no-description", "persian", "awkward"]) {
      assert.ok(existsSync(join(out, slug, "index.html")), `missing ${slug}`);
    }
  });

  it("builds tag pages and a tag index", () => {
    assert.ok(existsSync(join(out, "tags", "index.html")));
    assert.ok(existsSync(join(out, "tags", "kafka", "index.html")));
  });

  it("labels the archive by year only when it spans more than one", async () => {
    // Every fixture is dated 2026, so a year divider would be noise.
    const index = await read("blog/index.html");
    assert.match(index, /id="more-posts">More posts</);
    assert.ok(!index.includes(">2026<"));
  });

  it("keeps the heading outline gap-free on every page", async () => {
    for (const path of [
      "blog/index.html",
      "blog/published/index.html",
      "blog/tags/kafka/index.html",
      "blog/tags/index.html",
    ]) {
      const levels = [...(await read(path)).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      assert.equal(levels[0], 1, `${path} should open with an h1`);
      assert.equal(levels.filter((l) => l === 1).length, 1, `${path} should have exactly one h1`);
      for (let i = 1; i < levels.length; i++) {
        assert.ok(
          levels[i] - levels[i - 1] <= 1,
          `${path} skips from h${levels[i - 1]} to h${levels[i]}`,
        );
      }
    }
  });

  it("builds both feeds and the sitemap", () => {
    assert.ok(existsSync(join(out, "rss.xml")));
    assert.ok(existsSync(join(out, "feed.json")));
    assert.ok(existsSync(join(root, "sitemap.xml")));
    assert.ok(existsSync(join(root, "robots.txt")));
  });
});

describe("drafts", () => {
  it("generates no page for a draft", () => {
    assert.equal(existsSync(join(out, "secret")), false);
  });

  it("keeps the draft out of every listing, feed and sitemap", async () => {
    for (const path of ["blog/index.html", "blog/rss.xml", "blog/feed.json", "sitemap.xml"]) {
      const contents = await read(path);
      assert.ok(!contents.includes("secret"), `draft leaked into ${path}`);
      assert.ok(!contents.includes("Secret body"), `draft body leaked into ${path}`);
    }
  });

  it("keeps the draft off the tag page it would have shared", async () => {
    const page = await read("blog/tags/kafka/index.html");
    assert.ok(!page.includes("A secret draft"));
  });

  it("includes it only when drafts are explicitly requested", async () => {
    const draftRoot = await mkdtemp(join(tmpdir(), "blog-drafts-"));
    try {
      const built = await build({
        contentDir: dir,
        outDir: join(draftRoot, "blog"),
        rootDir: draftRoot,
        includeDrafts: true,
        year: 2026,
        log: silent,
      });
      assert.ok(built.posts.some((post) => post.slug === "secret"));
      assert.ok(existsSync(join(draftRoot, "blog", "secret", "index.html")));
    } finally {
      await rm(draftRoot, { recursive: true, force: true });
    }
  });
});

describe("article metadata", () => {
  let html;
  before(async () => {
    html = await read("blog/published/index.html");
  });

  it("sets a canonical URL", () => {
    assert.match(html, new RegExp(`<link rel="canonical" href="${ORIGIN_RE}/blog/published/" />`));
  });

  it("emits Open Graph and Twitter metadata", () => {
    assert.match(html, /<meta property="og:type" content="article" \/>/);
    assert.match(html, /<meta property="og:title" content="A published post — Mojtaba Norouzi"/);
    assert.match(html, /<meta property="og:url" content="https:\/\/[^"]*\/blog\/published\/"/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  });

  it("emits article publication metadata", () => {
    assert.match(html, /<meta property="article:published_time" content="2026-03-02" \/>/);
    assert.match(html, /<meta property="article:tag" content="Kafka" \/>/);
  });

  it("emits valid BlogPosting structured data", () => {
    const match = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
    assert.ok(match, "no JSON-LD block");
    const data = JSON.parse(match[1].replace(/\\u003C/g, "<"));
    assert.equal(data["@type"], "BlogPosting");
    assert.equal(data.headline, "A published post");
    assert.equal(data.datePublished, "2026-03-02");
    assert.equal(data.author.name, "Mojtaba Norouzi");
  });

  it("never lets a raw `<` survive inside the JSON-LD script", () => {
    const match = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
    assert.ok(!match[1].includes("<"));
  });

  it("never advertises an SVG as the share image", async () => {
    // published.md has no cover; add one that is a vector and one that is not.
    for (const [cover, expected] of [
      ["/assets/blog/x.svg", "/assets/og-image.png"],
      ["/assets/blog/x.png", "/assets/blog/x.png"],
    ]) {
      const coverRoot = await mkdtemp(join(tmpdir(), "blog-cover-"));
      const coverContent = join(coverRoot, "content");
      try {
        await mkdir(coverContent, { recursive: true });
        await writeFile(
          join(coverContent, "c.md"),
          `---\ntitle: C\ndate: 2026-01-01\ncover: ${cover}\ncoverAlt: Alt.\n---\n\nBody.\n`,
          "utf8",
        );
        await build({
          contentDir: coverContent,
          outDir: join(coverRoot, "blog"),
          rootDir: coverRoot,
          year: 2026,
          log: silent,
        });
        const page = await readFile(join(coverRoot, "blog", "c", "index.html"), "utf8");
        const og = /<meta property="og:image" content="([^"]*)"/.exec(page)?.[1];
        assert.equal(og, `${SITE.origin}${expected}`);
        assert.ok(!og.endsWith(".svg"));
      } finally {
        await rm(coverRoot, { recursive: true, force: true });
      }
    }
  });

  it("links the RSS feed for autodiscovery", () => {
    assert.match(html, /<link rel="alternate" type="application\/rss\+xml"[^>]*href="\/blog\/rss\.xml"/);
  });
});

describe("article rendering", () => {
  let html;
  before(async () => {
    html = await read("blog/published/index.html");
  });

  it("gives body headings stable ids and permalinks", () => {
    assert.match(html, /<h2 id="section-one">/);
    assert.match(html, /<a class="heading-anchor" href="#section-one"/);
  });

  it("wraps code blocks so they can scroll and be focused", () => {
    assert.match(html, /<div class="code-block" data-lang="js">/);
    assert.match(html, /<pre dir="ltr" tabindex="0" role="region"/);
    assert.match(html, /const x = 1 &lt; 2;/);
  });

  it("wraps tables in a scrollable region", () => {
    assert.match(html, /<div class="table-wrap" tabindex="0" role="region"/);
  });

  it("marks external links but leaves internal ones alone", () => {
    assert.match(html, /<a href="https:\/\/example\.com" rel="noopener noreferrer">/);
    assert.match(html, /<a href="\/blog\//);
    assert.ok(!/<a href="\/blog\/[^"]*" rel="noopener/.test(html));
  });

  it("renders a table of contents once there are enough headings", () => {
    assert.match(html, /<details class="toc">/);
  });

  it("links the previous and next posts", () => {
    assert.match(html, /rel="prev"/);
    assert.match(html, /class="pager"/);
  });

  it("shows related posts that share a tag", () => {
    assert.match(html, /class="related"/);
    assert.match(html, /An older post/);
  });
});

describe("edge cases", () => {
  it("derives a description from the first paragraph when none is given", async () => {
    const html = await read("blog/no-description/index.html");
    const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1];
    assert.equal(description, "This first paragraph should become the description automatically.");
  });

  it("escapes special characters in titles everywhere they appear", async () => {
    const html = await read("blog/awkward/index.html");
    assert.match(html, /Angle &lt; brackets &gt; &amp; &quot;quotes&quot;/);
    assert.ok(!/<title>[^<]*Angle < brackets/.test(html));
  });

  it("keeps a very long title from producing a broken document", async () => {
    const html = await read("blog/awkward/index.html");
    assert.match(html, /<h1 class="post__title">/);
    assert.match(html, /<\/html>/);
  });

  it("marks mixed-direction blocks individually", async () => {
    const html = await read("blog/persian/index.html");
    assert.match(html, /<article class="post" lang="fa" dir="rtl">/);
    assert.match(html, /<p dir="ltr">This paragraph is English/);
    assert.ok(!/<p dir="rtl">این/.test(html), "matching blocks should not be re-marked");
  });

  it("gives a Persian title a usable slug", () => {
    assert.ok(result.posts.some((post) => post.slug === "persian"));
  });
});

describe("feeds", () => {
  it("produces a parseable JSON feed with absolute URLs", async () => {
    const feed = JSON.parse(await read("blog/feed.json"));
    assert.equal(feed.version, "https://jsonfeed.org/version/1.1");
    assert.equal(feed.items.length, 5);
    assert.ok(feed.items.every((item) => item.url.startsWith("https://")));
    assert.ok(feed.items.every((item) => item._blog.path.startsWith("/blog/")));
  });

  it("orders feed items newest first", async () => {
    const feed = JSON.parse(await read("blog/feed.json"));
    const dates = feed.items.map((item) => item.date_published);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  it("rewrites root-relative URLs to absolute inside feed content", async () => {
    const feed = JSON.parse(await read("blog/feed.json"));
    assert.ok(!/(href|src)="\//.test(feed.items.map((i) => i.content_html).join("")));
  });

  it("produces well-formed RSS", async () => {
    const rss = await read("blog/rss.xml");
    assert.match(rss, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.equal((rss.match(/<item>/g) ?? []).length, 5);
    assert.match(rss, /<atom:link href="[^"]+\/blog\/rss\.xml" rel="self"/);
    // No stray raw ampersands outside CDATA sections.
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(rss.replace(/<!\[CDATA\[[\s\S]*?]]>/g, "")));
  });

  it("lists the homepage and every post in the sitemap", async () => {
    const sitemap = await read("sitemap.xml");
    assert.match(sitemap, new RegExp(`<loc>${ORIGIN_RE}/</loc>`));
    assert.match(sitemap, /<loc>[^<]*\/blog\/published\/<\/loc>/);
    // 5 posts + homepage + blog index + tag index + one page per tag
    assert.equal((sitemap.match(/<url>/g) ?? []).length, 5 + 3 + result.tags.length);
  });

  it("points robots.txt at the sitemap", async () => {
    assert.match(await read("robots.txt"), /Sitemap: https:\/\/[^\s]+\/sitemap\.xml/);
  });
});

describe("empty and single-post blogs", () => {
  it("builds an empty blog without crashing", async () => {
    const emptyRoot = await mkdtemp(join(tmpdir(), "blog-empty-"));
    try {
      const built = await build({
        contentDir: join(emptyRoot, "content"), // does not exist at all
        outDir: join(emptyRoot, "blog"),
        rootDir: emptyRoot,
        year: 2026,
        log: silent,
      });
      assert.equal(built.posts.length, 0);
      const html = await readFile(join(emptyRoot, "blog", "index.html"), "utf8");
      assert.match(html, /Nothing published yet/);
      assert.ok(!html.includes("undefined"));
      const feed = JSON.parse(await readFile(join(emptyRoot, "blog", "feed.json"), "utf8"));
      assert.deepEqual(feed.items, []);
    } finally {
      await rm(emptyRoot, { recursive: true, force: true });
    }
  });

  it("builds a one-post blog with no pager links", async () => {
    const oneRoot = await mkdtemp(join(tmpdir(), "blog-one-"));
    const oneContent = join(oneRoot, "content");
    try {
      await mkdir(oneContent, { recursive: true });
      await writeFile(join(oneContent, "only.md"), FIXTURES["older.md"], "utf8");
      await build({
        contentDir: oneContent,
        outDir: join(oneRoot, "blog"),
        rootDir: oneRoot,
        year: 2026,
        log: silent,
      });
      const html = await readFile(join(oneRoot, "blog", "only", "index.html"), "utf8");
      assert.ok(!html.includes('class="pager"'), "a lone post has nowhere to page to");
      assert.ok(!html.includes('class="related"'));
      const index = await readFile(join(oneRoot, "blog", "index.html"), "utf8");
      assert.match(index, /post-lead/);
      assert.ok(!index.includes("post-group"), "no archive section when there is only a lead");
      assert.ok(!index.includes("post-group__year"));
    } finally {
      await rm(oneRoot, { recursive: true, force: true });
    }
  });
});

describe("invalid content", () => {
  const buildWith = async (files) => {
    const badRoot = await mkdtemp(join(tmpdir(), "blog-bad-"));
    const badContent = join(badRoot, "content");
    await mkdir(badContent, { recursive: true });
    for (const [name, source] of Object.entries(files)) {
      await writeFile(join(badContent, name), source, "utf8");
    }
    try {
      return await build({
        contentDir: badContent,
        outDir: join(badRoot, "blog"),
        rootDir: badRoot,
        year: 2026,
        log: silent,
      });
    } finally {
      await rm(badRoot, { recursive: true, force: true });
    }
  };

  it("fails the build on a malformed post, naming the file", async () => {
    await assert.rejects(
      buildWith({ "broken.md": "---\ntype: nonsense\n---\n\nBody.\n" }),
      /broken\.md[\s\S]*title: required/,
    );
  });

  it("fails the build on duplicate slugs rather than silently overwriting", async () => {
    await assert.rejects(
      buildWith({
        "one.md": "---\ntitle: One\ndate: 2026-01-01\nslug: same\n---\n",
        "two.md": "---\ntitle: Two\ndate: 2026-01-02\nslug: same\n---\n",
      }),
      /already used by/,
    );
  });

  it("fails the build on unsafe HTML in content", async () => {
    await assert.rejects(
      buildWith({ "xss.md": "---\ntitle: X\ndate: 2026-01-01\n---\n\n<script>alert(1)</script>\n" }),
      /unsafe HTML/,
    );
  });
});

describe("output directory safety", () => {
  it("refuses to delete a directory it did not generate", async () => {
    const guardRoot = await mkdtemp(join(tmpdir(), "blog-guard-"));
    const guardOut = join(guardRoot, "blog");
    try {
      await mkdir(guardOut, { recursive: true });
      await writeFile(join(guardOut, "precious.txt"), "do not delete me", "utf8");
      await assert.rejects(
        build({
          contentDir: join(guardRoot, "content"),
          outDir: guardOut,
          rootDir: guardRoot,
          year: 2026,
          log: silent,
        }),
        /Refusing to overwrite/,
      );
      assert.ok(existsSync(join(guardOut, "precious.txt")));
    } finally {
      await rm(guardRoot, { recursive: true, force: true });
    }
  });

  it("removes pages for posts that no longer exist", async () => {
    const staleRoot = await mkdtemp(join(tmpdir(), "blog-stale-"));
    const staleContent = join(staleRoot, "content");
    const staleOut = join(staleRoot, "blog");
    try {
      await mkdir(staleContent, { recursive: true });
      await writeFile(join(staleContent, "gone.md"), FIXTURES["older.md"], "utf8");
      const opts = { contentDir: staleContent, outDir: staleOut, rootDir: staleRoot, year: 2026, log: silent };
      await build(opts);
      assert.ok(existsSync(join(staleOut, "gone", "index.html")));

      await rm(join(staleContent, "gone.md"));
      await writeFile(join(staleContent, "kept.md"), FIXTURES["older.md"], "utf8");
      await build(opts);

      assert.equal(existsSync(join(staleOut, "gone")), false, "orphaned page survived");
      assert.ok(existsSync(join(staleOut, "kept", "index.html")));
    } finally {
      await rm(staleRoot, { recursive: true, force: true });
    }
  });
});
