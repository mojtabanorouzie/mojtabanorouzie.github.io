// Single source of truth for everything the generator needs to know about the site.
// Change the origin here if the site ever moves to a custom domain — canonical URLs,
// Open Graph tags, the sitemap and both feeds all read from it.
export const SITE = {
  // The canonical origin. Everything absolute — canonical links, Open Graph
  // tags, the sitemap and both feeds — is derived from this single value, so
  // moving hosts again means changing this one line (or setting SITE_ORIGIN,
  // which still wins, for a staged cutover).
  origin: process.env.SITE_ORIGIN || "https://mojtaba.tech",
  title: "Mojtaba Norouzi",
  blogTitle: "Blog — Mojtaba Norouzi",
  blogDescription:
    "Notes, essays and build logs on backend engineering, distributed systems, AI — and the occasional detour into Persian music.",
  // Shown on the blog index, under the title. This is the voice of the section.
  blogIntro:
    "A working notebook. Things I learned, things I built, papers and articles I went down a rabbit hole on, and the occasional half-formed idea I wanted to write down before it evaporated.",
  author: {
    name: "Mojtaba Norouzi",
    role: "Senior Software Engineer · Backend & Distributed Systems · Persian musician",
    email: "mojtaba.norouzie@gmail.com",
    github: "https://github.com/mojtabanorouzie",
    linkedin: "https://www.linkedin.com/in/mojtabanorouzi/",
  },
  language: "en",
  // Fallback social image, reused from the existing site metadata.
  ogImage: "/assets/og-image.png",
  themeColor: "#0e1116",
};

// Content types. A single content model with a `type` field — not four systems.
// `label` is what the reader sees; `plural` titles the (future) type archives.
export const TYPES = {
  article: { label: "Article", plural: "Articles" },
  note: { label: "Note", plural: "Notes" },
  reading: { label: "Reading", plural: "Reading" },
  build: { label: "Build log", plural: "Build logs" },
};

export const DEFAULT_TYPE = "article";

// Words per minute used for the reading-time estimate.
export const WPM = 200;

// Paths, all relative to the repository root.
export const PATHS = {
  content: "content/blog",
  outDir: "blog",
  css: "/blog.css",
  siteCss: "/styles.css",
  script: "/script.js",
};

export const absolute = (path) =>
  path.startsWith("http") ? path : SITE.origin + (path.startsWith("/") ? path : `/${path}`);
