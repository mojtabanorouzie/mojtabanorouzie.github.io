// RSS 2.0, JSON Feed 1.1, sitemap.xml and robots.txt.
//
// Dates are derived from the content (newest post) rather than from the clock,
// so two builds of the same content produce byte-identical files.

import { SITE, TYPES, absolute } from "./config.mjs";
import { absolutizeUrls, escapeXml, isoDate } from "./text.mjs";

const rfc822 = (date) => date.toUTCString();

/** Guard against a `]]>` sequence inside post HTML terminating the section early. */
const cdata = (value) => `<![CDATA[${String(value).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

const newest = (posts) => (posts.length ? posts[0].updated ?? posts[0].date : new Date(0));

export function renderRss(posts) {
  const items = posts
    .map((post) => {
      const url = absolute(post.url);
      const categories = post.tags
        .map((tag) => `      <category>${escapeXml(tag.name)}</category>`)
        .join("\n");
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <content:encoded>${cdata(absolutizeUrls(post.html, SITE.origin))}</content:encoded>
${categories}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(SITE.blogTitle)}</title>
    <link>${escapeXml(absolute("/blog/"))}</link>
    <description>${escapeXml(SITE.blogDescription)}</description>
    <language>${escapeXml(SITE.language)}</language>
    <lastBuildDate>${rfc822(newest(posts))}</lastBuildDate>
    <managingEditor>${escapeXml(`${SITE.author.email} (${SITE.author.name})`)}</managingEditor>
    <atom:link href="${escapeXml(absolute("/blog/rss.xml"))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

export function renderJsonFeed(posts) {
  return `${JSON.stringify(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: SITE.blogTitle,
      home_page_url: absolute("/blog/"),
      feed_url: absolute("/blog/feed.json"),
      description: SITE.blogDescription,
      language: SITE.language,
      authors: [{ name: SITE.author.name, url: SITE.origin }],
      items: posts.map((post) => ({
        id: absolute(post.url),
        url: absolute(post.url),
        title: post.title,
        summary: post.description,
        content_html: absolutizeUrls(post.html, SITE.origin),
        date_published: post.date.toISOString(),
        ...(post.updated ? { date_modified: post.updated.toISOString() } : {}),
        ...(post.cover ? { image: absolute(post.cover) } : {}),
        tags: post.tags.map((tag) => tag.name),
        language: post.lang,
        // Non-standard but harmless extension: the homepage teaser reads these
        // instead of re-deriving them.
        _blog: {
          type: post.type,
          type_label: TYPES[post.type]?.label ?? post.type,
          path: post.url,
          reading_minutes: post.readingMinutes,
        },
      })),
    },
    null,
    2,
  )}\n`;
}

export function renderSitemap({ posts, tags }) {
  const url = (loc, lastmod) =>
    `  <url>
    <loc>${escapeXml(absolute(loc))}</loc>${lastmod ? `\n    <lastmod>${isoDate(lastmod)}</lastmod>` : ""}
  </url>`;

  const entries = [
    url("/"),
    url("/blog/", posts.length ? newest(posts) : null),
    ...posts.map((post) => url(post.url, post.updated ?? post.date)),
    ...(tags.length ? [url("/blog/tags/")] : []),
    ...tags.map((tag) => url(`/blog/tags/${tag.slug}/`)),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}

export function renderRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${absolute("/sitemap.xml")}
`;
}
