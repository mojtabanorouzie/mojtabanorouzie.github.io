// HTML templates. Every page shares the site's existing header, footer, design
// tokens and script.js, so the blog is the same website — it just has an
// editorial reading layer (blog.css) layered on top of styles.css.

import { PATHS, SITE, TYPES, absolute } from "./config.mjs";
import { escapeHtml, formatDate, isoDate } from "./text.mjs";

// Reused verbatim from index.html so the tab icon stays identical site-wide.
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230e1116'/%3E%3Cg stroke='%23d8a657' stroke-width='2.4' stroke-linecap='round'%3E%3Cline x1='8' y1='16' x2='8' y2='16'/%3E%3Cline x1='12' y1='10' x2='12' y2='22'/%3E%3Cline x1='16' y1='6' x2='16' y2='26'/%3E%3Cline x1='20' y1='11' x2='20' y2='21'/%3E%3Cline x1='24' y1='14' x2='24' y2='18'/%3E%3C/g%3E%3C/svg%3E";

// Runs before first paint so a light-theme reader never sees a dark flash.
// script.js owns the toggle itself; this only restores the stored choice.
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

const NAV_LINKS = [
  { href: "/#about", label: "About" },
  { href: "/#tech", label: "Tech" },
  { href: "/#music", label: "Music" },
  { href: "/#education", label: "Education" },
  { href: "/blog/", label: "Blog", id: "blog" },
  { href: "/#contact", label: "Contact" },
];

/**
 * Join template parts, dropping the empty ones. Optional blocks would otherwise
 * leave blank lines all through the generated source — and collapsing those
 * afterwards is not safe, because blank lines inside a <pre> are content.
 */
const block = (...parts) => parts.filter((part) => part !== "" && part != null).join("\n");

/** JSON-LD is inlined into a <script>, so `<` must never survive as itself. */
const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003C")}</script>`;

// Social crawlers (X, Facebook, LinkedIn) and Google's rich results reject SVG
// for preview images, so a vector cover is decorative only — the share card
// falls back to the site image rather than pointing at something unrenderable.
const RASTER_IMAGE = /\.(png|jpe?g|webp|gif)(\?|#|$)/i;
const socialImage = (cover) => (cover && RASTER_IMAGE.test(cover) ? cover : null);

const meta = (attr, name, content) =>
  content ? `<meta ${attr}="${escapeHtml(name)}" content="${escapeHtml(content)}" />` : "";

function head({ title, description, canonical, type = "website", image, extraHead = "" }) {
  const url = absolute(canonical);
  return `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  ${meta("name", "author", SITE.author.name)}
  ${meta("name", "theme-color", SITE.themeColor)}

  ${meta("property", "og:type", type)}
  ${meta("property", "og:site_name", SITE.title)}
  ${meta("property", "og:title", title)}
  ${meta("property", "og:description", description)}
  ${meta("property", "og:url", url)}
  ${meta("property", "og:image", absolute(image || SITE.ogImage))}
  ${meta("name", "twitter:card", "summary_large_image")}
  ${meta("name", "twitter:title", title)}
  ${meta("name", "twitter:description", description)}
${extraHead}
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.blogTitle)}" href="/blog/rss.xml" />
  <link rel="alternate" type="application/feed+json" title="${escapeHtml(SITE.blogTitle)}" href="/blog/feed.json" />
  <link rel="icon" href="${FAVICON}" />
  <link rel="stylesheet" href="${PATHS.siteCss}" />
  <link rel="stylesheet" href="${PATHS.css}" />
  <script>${THEME_BOOTSTRAP}</script>`;
}

function header(currentId) {
  const links = NAV_LINKS.map(({ href, label, id }) => {
    const current = id && id === currentId ? ' aria-current="page"' : "";
    return `        <li><a href="${href}"${current}>${label}</a></li>`;
  }).join("\n");

  return `  <header class="site-header" id="top">
    <nav class="nav" aria-label="Primary">
      <a class="brand" href="/" aria-label="Mojtaba Norouzi — home">
        <svg class="brand__mark" width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
          <g stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <line x1="8" y1="13" x2="8" y2="19"/>
            <line x1="12" y1="10" x2="12" y2="22"/>
            <line x1="16" y1="6" x2="16" y2="26"/>
            <line x1="20" y1="11" x2="20" y2="21"/>
            <line x1="24" y1="14" x2="24" y2="18"/>
          </g>
        </svg>
        <span>Mojtaba Norouzi</span>
      </a>

      <button class="nav__toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>

      <ul class="nav__menu" id="nav-menu">
${links}
        <li>
          <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch to light theme" title="Toggle theme">
            <svg class="theme-toggle__sun" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><g stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.5" y1="4.5" x2="6.6" y2="6.6"/><line x1="17.4" y1="17.4" x2="19.5" y2="19.5"/><line x1="4.5" y1="19.5" x2="6.6" y2="17.4"/><line x1="17.4" y1="6.6" x2="19.5" y2="4.5"/></g></svg>
            <svg class="theme-toggle__moon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          </button>
        </li>
      </ul>
    </nav>
  </header>`;
}

function footer(year) {
  return `  <footer class="site-footer">
    <p>© ${year} Mojtaba Norouzi · Built with semantic HTML, CSS &amp; vanilla JS.</p>
    <p class="site-footer__links">
      <a href="/">Home</a> · <a href="/blog/">Blog</a> ·
      <a href="/blog/rss.xml">RSS</a> ·
      <a href="${SITE.author.github}" rel="noopener">GitHub</a>
    </p>
  </footer>`;
}

export function layout({ title, description, canonical, type, image, extraHead, main, currentId, year }) {
  return `<!DOCTYPE html>
<html lang="${SITE.language}" dir="ltr" data-theme="dark">
<head>${head({ title, description, canonical, type, image, extraHead })}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

${header(currentId)}

  <main id="main">
${main}
  </main>

${footer(year)}

  <script src="${PATHS.script}"></script>
</body>
</html>
`;
}

/* ---------------------------------------------------------------- fragments */

const typeLabel = (post) => TYPES[post.type]?.label ?? TYPES.article.label;

/** Notes are short by definition; a "1 min read" badge on them is just noise. */
const showsReadingTime = (post) => post.type !== "note" || post.readingMinutes >= 2;

function postMeta(post, { withType = true } = {}) {
  const parts = [];
  if (withType) parts.push(`<span class="post-type post-type--${post.type}">${typeLabel(post)}</span>`);
  parts.push(`<time datetime="${isoDate(post.date)}">${formatDate(post.date)}</time>`);
  if (showsReadingTime(post)) parts.push(`<span>${post.readingMinutes} min read</span>`);
  return `<p class="post-meta">${parts.join('<span class="post-meta__dot" aria-hidden="true">·</span>')}</p>`;
}

function tagList(tags, { className = "tags" } = {}) {
  if (!tags.length) return "";
  const items = tags
    .map(
      (tag) =>
        `<li><a href="/blog/tags/${escapeHtml(tag.slug)}/">${escapeHtml(tag.name)}</a></li>`,
    )
    .join("");
  return `<ul class="${className}" aria-label="Tags">${items}</ul>`;
}

/**
 * @param {number} level  Heading level for the entry title. The blog index
 *   nests entries under an h2 year heading so they are h3; a tag page has no
 *   such grouping, so its entries are h2 — skipping a level would break the
 *   document outline for anyone navigating by heading.
 */
function postItem(post, { level = 3 } = {}) {
  return `        <li class="post-item">
          <article>
            ${postMeta(post)}
            <h${level} class="post-item__title"><a href="${post.url}">${escapeHtml(post.title)}</a></h${level}>
            <p class="post-item__desc">${escapeHtml(post.description)}</p>
            ${tagList(post.tags)}
          </article>
        </li>`;
}

function leadPost(post) {
  const cover = post.cover
    ? `        <a class="post-lead__cover" href="${post.url}" tabindex="-1" aria-hidden="true">
          <img src="${escapeHtml(post.cover)}" alt="" loading="eager" decoding="async">
        </a>\n`
    : "";
  return `      <article class="post-lead">
${cover}        <div class="post-lead__body">
          ${postMeta(post)}
          <h2 class="post-lead__title"><a href="${post.url}">${escapeHtml(post.title)}</a></h2>
          <p class="post-lead__desc">${escapeHtml(post.description)}</p>
          ${tagList(post.tags)}
          <p class="post-lead__more"><a class="text-link" href="${post.url}">Read this post <span aria-hidden="true">→</span></a></p>
        </div>
      </article>`;
}

/* -------------------------------------------------------------- blog index */

export function renderIndex({ posts, tags, year }) {
  // The index is curated, not just chronological: `featured: true` pins a post
  // to the top slot. Falling back to the newest keeps it curated by default.
  const lead = posts.find((post) => post.featured) ?? posts[0];
  const rest = posts.filter((post) => post !== lead);

  const groups = new Map();
  for (const post of rest) {
    const key = post.date.getUTCFullYear();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(post);
  }

  // Year dividers only earn their place once the archive spans more than one
  // year. A lone "2026" under the lead post is filing-cabinet furniture — the
  // date on every entry already says as much.
  const archive = rest.length
    ? [...groups.entries()]
        .map(([groupYear, group]) => {
          const label = groups.size > 1 ? String(groupYear) : "More posts";
          const id = groups.size > 1 ? `year-${groupYear}` : "more-posts";
          return `      <section class="post-group" aria-labelledby="${id}">
        <h2 class="post-group__year" id="${id}">${label}</h2>
        <ol class="post-list">
${group.map(postItem).join("\n")}
        </ol>
      </section>`;
        })
        .join("\n")
    : "";

  const empty = `      <p class="blog-empty">Nothing published yet. The first post is being written — check back soon, or <a class="text-link" href="/blog/rss.xml">subscribe by RSS</a> so it finds you instead.</p>`;

  const tagCloud = tags.length
    ? `      <section class="tag-cloud" aria-labelledby="topics">
        <h2 class="tag-cloud__title" id="topics">Topics</h2>
        <ul class="tags tags--cloud">
${tags
  .map(
    (tag) =>
      `          <li><a href="/blog/tags/${escapeHtml(tag.slug)}/">${escapeHtml(tag.name)} <span class="tag-count">${tag.count}</span></a></li>`,
  )
  .join("\n")}
        </ul>
      </section>`
    : "";

  const main = `    <div class="blog-page">
      <header class="blog-hero">
        <p class="hero__eyebrow">Notes · Essays · Build logs</p>
        <h1 class="blog-hero__title">Blog</h1>
        <p class="blog-hero__intro">${escapeHtml(SITE.blogIntro)}</p>
        <p class="blog-hero__feed"><a class="text-link" href="/blog/rss.xml">RSS</a> <span class="post-meta__dot" aria-hidden="true">·</span> <a class="text-link" href="/blog/feed.json">JSON Feed</a></p>
      </header>

${block(lead ? leadPost(lead) : empty, archive, tagCloud)}
    </div>`;

  const extraHead = `  ${jsonLd({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: SITE.blogTitle,
    description: SITE.blogDescription,
    url: absolute("/blog/"),
    inLanguage: SITE.language,
    author: { "@type": "Person", name: SITE.author.name, url: SITE.origin },
    blogPost: posts.slice(0, 20).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: absolute(post.url),
      datePublished: isoDate(post.date),
    })),
  })}`;

  return layout({
    title: SITE.blogTitle,
    description: SITE.blogDescription,
    canonical: "/blog/",
    extraHead,
    main,
    currentId: "blog",
    year,
  });
}

/* ------------------------------------------------------------- article page */

function tableOfContents(headings) {
  const entries = headings.filter((heading) => heading.depth <= 3);
  if (entries.length < 3) return ""; // a two-item ToC helps nobody

  const items = entries
    .map(
      (heading) =>
        `          <li class="toc__item toc__item--h${heading.depth}"><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`,
    )
    .join("\n");

  return `      <details class="toc">
        <summary class="toc__summary">Contents</summary>
        <nav aria-label="Table of contents">
          <ol class="toc__list">
${items}
          </ol>
        </nav>
      </details>`;
}

function relatedPosts(related) {
  if (!related.length) return "";
  const items = related
    .map(
      (post) => `          <li class="post-item">
            <article>
              ${postMeta(post)}
              <h3 class="post-item__title"><a href="${post.url}">${escapeHtml(post.title)}</a></h3>
              <p class="post-item__desc">${escapeHtml(post.description)}</p>
            </article>
          </li>`,
    )
    .join("\n");

  return `      <section class="related" aria-labelledby="related-title">
        <h2 class="related__title" id="related-title">Related</h2>
        <ol class="post-list">
${items}
        </ol>
      </section>`;
}

function pagination(newer, older) {
  if (!newer && !older) return "";
  // The archive reads oldest → newest, so rel="next" points at the newer post.
  const link = (post, rel, label) =>
    post
      ? `        <a class="pager__link pager__link--${rel}" rel="${rel}" href="${post.url}">
          <span class="pager__label">${label}</span>
          <span class="pager__title">${escapeHtml(post.title)}</span>
        </a>`
      : `        <span class="pager__link pager__link--${rel} is-empty" aria-hidden="true"></span>`;

  return `      <nav class="pager" aria-label="More posts">
${link(newer, "next", "← Newer")}
${link(older, "prev", "Older →")}
      </nav>`;
}

export function renderPost({ post, newer, older, related, year }) {
  const langAttrs =
    post.lang !== SITE.language || post.dir !== "ltr"
      ? ` lang="${escapeHtml(post.lang)}" dir="${post.dir}"`
      : "";

  const cover = post.cover
    ? `      <figure class="post__cover">
        <img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.coverAlt ?? "")}" loading="eager" decoding="async">
      </figure>`
    : "";

  const updated = post.updated
    ? `        <p class="post__updated">Updated <time datetime="${isoDate(post.updated)}">${formatDate(post.updated)}</time></p>`
    : "";

  // `reading` posts point at the thing they are about — that is the whole point
  // of the type, so it gets a prominent link rather than a footnote.
  const source = post.link
    ? `        <p class="post__source"><a class="text-link" href="${escapeHtml(post.link)}" rel="noopener noreferrer">Read the original <span aria-hidden="true">↗</span></a></p>`
    : "";

  const deck = post.description
    ? `        <p class="post__deck">${escapeHtml(post.description)}</p>`
    : "";

  const main = `    <div class="blog-page blog-page--post">
      <p class="post__back"><a class="text-link" href="/blog/"><span aria-hidden="true">←</span> All posts</a></p>

      <article class="post"${langAttrs}>
${block(
  `        <header class="post__header">`,
  `          ${postMeta(post)}`,
  `          <h1 class="post__title">${escapeHtml(post.title)}</h1>`,
  deck,
  updated,
  source,
  tagList(post.tags) && `          ${tagList(post.tags)}`,
  `        </header>`,
  cover,
  tableOfContents(post.headings),
  `        <div class="prose">`,
)}
${post.html}        </div>

        <footer class="post__footer">
          <div class="byline">
            <svg class="byline__mark" width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
              <g stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                <line x1="8" y1="13" x2="8" y2="19"/><line x1="12" y1="10" x2="12" y2="22"/>
                <line x1="16" y1="6" x2="16" y2="26"/><line x1="20" y1="11" x2="20" y2="21"/>
                <line x1="24" y1="14" x2="24" y2="18"/>
              </g>
            </svg>
            <div>
              <p class="byline__name">${escapeHtml(SITE.author.name)}</p>
              <p class="byline__role">${escapeHtml(SITE.author.role)}</p>
            </div>
          </div>
        </footer>
      </article>
${block(pagination(newer, older), relatedPosts(related))}
    </div>`;

  const extraHead = block(
    `  <meta property="article:published_time" content="${isoDate(post.date)}" />`,
    post.updated
      ? `  <meta property="article:modified_time" content="${isoDate(post.updated)}" />`
      : "",
    `  <meta property="article:author" content="${escapeHtml(SITE.author.name)}" />`,
    ...post.tags.map((tag) => `  <meta property="article:tag" content="${escapeHtml(tag.name)}" />`),
    `  ${jsonLd({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: absolute(post.url),
    mainEntityOfPage: { "@type": "WebPage", "@id": absolute(post.url) },
    datePublished: isoDate(post.date),
    dateModified: isoDate(post.updated ?? post.date),
    inLanguage: post.lang,
    keywords: post.tags.map((tag) => tag.name),
    wordCount: post.wordCount,
    ...(socialImage(post.cover) ? { image: [absolute(socialImage(post.cover))] } : {}),
    author: { "@type": "Person", name: SITE.author.name, url: SITE.origin },
    publisher: { "@type": "Person", name: SITE.author.name, url: SITE.origin },
  })}`,
  );

  return layout({
    title: `${post.title} — ${SITE.title}`,
    description: post.description,
    canonical: post.url,
    type: "article",
    image: socialImage(post.cover),
    extraHead,
    main,
    currentId: "blog",
    year,
  });
}

/* ---------------------------------------------------------------- tag pages */

export function renderTagPage({ tag, posts, year }) {
  const count = `${posts.length} post${posts.length === 1 ? "" : "s"}`;
  const main = `    <div class="blog-page">
      <header class="blog-hero blog-hero--tag">
        <p class="hero__eyebrow"><a class="text-link" href="/blog/tags/">Topics</a></p>
        <h1 class="blog-hero__title">${escapeHtml(tag.name)}</h1>
        <p class="blog-hero__intro">${count} tagged <strong>${escapeHtml(tag.name)}</strong>.</p>
      </header>

      <ol class="post-list">
${posts.map((post) => postItem(post, { level: 2 })).join("\n")}
      </ol>

      <p class="blog-back"><a class="text-link" href="/blog/"><span aria-hidden="true">←</span> All posts</a></p>
    </div>`;

  return layout({
    title: `${tag.name} — Blog — ${SITE.title}`,
    description: `Posts tagged “${tag.name}” on ${SITE.title}'s blog. ${count}.`,
    canonical: `/blog/tags/${tag.slug}/`,
    main,
    currentId: "blog",
    year,
  });
}

export function renderTagIndex({ tags, year }) {
  const body = tags.length
    ? `      <ul class="tags tags--cloud">
${tags
  .map(
    (tag) =>
      `        <li><a href="/blog/tags/${escapeHtml(tag.slug)}/">${escapeHtml(tag.name)} <span class="tag-count">${tag.count}</span></a></li>`,
  )
  .join("\n")}
      </ul>`
    : `      <p class="blog-empty">No topics yet — they appear as posts get tagged.</p>`;

  const main = `    <div class="blog-page">
      <header class="blog-hero blog-hero--tag">
        <p class="hero__eyebrow">Blog</p>
        <h1 class="blog-hero__title">Topics</h1>
        <p class="blog-hero__intro">Every tag used so far, most-written-about first.</p>
      </header>

${body}

      <p class="blog-back"><a class="text-link" href="/blog/"><span aria-hidden="true">←</span> All posts</a></p>
    </div>`;

  return layout({
    title: `Topics — Blog — ${SITE.title}`,
    description: "Browse blog posts by topic.",
    canonical: "/blog/tags/",
    main,
    currentId: "blog",
    year,
  });
}
