// Loads and validates content/blog/*.md.
//
// Frontmatter is a deliberately small, documented YAML subset — scalars, quoted
// strings, booleans, inline arrays and block arrays. That covers every field the
// blog actually uses, and keeps the dependency list at one package instead of
// pulling in a full YAML engine to read eight keys.

import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { DEFAULT_TYPE, TYPES } from "./config.mjs";
import { detectDirection, slugify } from "./text.mjs";

const FRONTMATTER = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Raw HTML is allowed through (it is useful, and every post is written by the
// site owner and reviewed in git), but these constructs are never legitimate in
// a personal blog post and almost always mean something was pasted in by
// accident. Failing the build is cheaper than shipping them.
const UNSAFE_HTML = [
  { pattern: /<script\b/i, what: "<script> tag" },
  { pattern: /<\s*\w+[^>]*\son[a-z]+\s*=/i, what: "inline event handler (onclick=…)" },
  { pattern: /\b(?:href|src)\s*=\s*["']?\s*javascript:/i, what: "javascript: URL" },
];

// Right-to-left scripts, by IETF language subtag.
const RTL_LANGUAGES = new Set(["fa", "ar", "he", "ur", "ps", "sd", "ckb", "dv", "yi", "ku"]);

const isRtlLanguage = (lang) =>
  RTL_LANGUAGES.has(String(lang).toLowerCase().split(/[-_]/)[0]);

// Paths under /blog/ that the generator owns.
const RESERVED_SLUGS = new Set(["tags"]);

class ContentError extends Error {}

/** Parse the frontmatter block. Returns { data, body }. */
export function parseFrontmatter(source) {
  const match = FRONTMATTER.exec(String(source ?? "").trimStart());
  if (!match) return { data: {}, body: String(source ?? "") };

  const data = {};
  let listKey = null;

  for (const [index, raw] of match[1].split(/\r?\n/).entries()) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim() || /^\s*#/.test(line)) continue;

    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item) {
      if (!listKey) {
        throw new ContentError(`frontmatter line ${index + 1}: list item without a key`);
      }
      data[listKey].push(parseScalar(item[1]));
      continue;
    }

    const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!pair) {
      throw new ContentError(`frontmatter line ${index + 1}: cannot parse ${JSON.stringify(line)}`);
    }

    const [, key, rest] = pair;
    if (rest.trim() === "") {
      // A bare `key:` opens a block list; if nothing follows it stays an empty
      // array, which the consumers treat the same as "absent".
      data[key] = [];
      listKey = key;
    } else {
      data[key] = parseScalar(rest);
      listKey = null;
    }
  }

  return { data, body: match[2] ?? "" };
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "" || value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;

  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  if (quoted) return quoted[2].replace(/\\(["'\\])/g, "$1");

  if (value.startsWith("[") && value.endsWith("]")) {
    return splitInline(value.slice(1, -1)).map(parseScalar);
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/** Split `a, "b, c", d` on commas that are not inside quotes. */
function splitInline(value) {
  const parts = [];
  let current = "";
  let quote = null;
  for (const ch of value) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      current += ch;
      quote = ch;
    } else if (ch === ",") {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== "");
}

function toArray(value) {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value])
    .map((entry) => String(entry).trim())
    .filter(Boolean);
}

function parseDate(value, field, errors) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  const date = new Date(DATE_ONLY.test(text) ? `${text}T00:00:00Z` : text);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field}: ${JSON.stringify(text)} is not a valid date (use YYYY-MM-DD)`);
    return null;
  }
  return date;
}

/**
 * Turn one Markdown file into a post record. Throws a ContentError listing
 * *every* problem found, so a bad file is fixed in one pass rather than ten.
 */
export function buildPost({ filename, source }) {
  const errors = [];
  let data = {};
  let body = "";

  try {
    ({ data, body } = parseFrontmatter(source));
  } catch (error) {
    errors.push(error.message);
  }

  const title = data.title == null ? "" : String(data.title).trim();
  if (!title) errors.push("title: required");

  const date = parseDate(data.date, "date", errors);
  if (data.date == null) errors.push("date: required (YYYY-MM-DD)");

  const updated = parseDate(data.updated, "updated", errors);
  if (updated && date && updated < date) {
    errors.push("updated: is earlier than date");
  }

  const type = data.type == null ? DEFAULT_TYPE : String(data.type).trim();
  if (!Object.hasOwn(TYPES, type)) {
    errors.push(`type: ${JSON.stringify(type)} is not one of ${Object.keys(TYPES).join(", ")}`);
  }

  if (data.cover && !data.coverAlt) {
    errors.push("coverAlt: required whenever `cover` is set (it is the image's alt text)");
  }

  for (const { pattern, what } of UNSAFE_HTML) {
    if (pattern.test(body)) errors.push(`unsafe HTML: contains ${what}`);
  }

  if (errors.length) {
    throw new ContentError(`${filename}\n  - ${errors.join("\n  - ")}`);
  }

  // Slug comes from the filename (minus an optional date prefix, which is only
  // there to keep the directory sorted) unless the file overrides it.
  const slug = slugify(
    data.slug ?? basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
  );

  // /blog/tags/ is generated by the build; a post landing there would be
  // silently overwritten by the tag index.
  if (RESERVED_SLUGS.has(slug)) {
    throw new ContentError(
      `${filename}\n  - slug "${slug}" is reserved by the blog itself; set a different \`slug\`.`,
    );
  }

  const lang = data.lang ? String(data.lang).trim() : "en";

  // Precedence: an explicit `dir` wins, then the declared language, then
  // character counting. Language has to outrank detection — a Persian post
  // that quotes a long English passage can easily contain more Latin
  // characters than Persian ones without ceasing to be a Persian post.
  const dir =
    (data.dir ? String(data.dir).trim() : null) ??
    (isRtlLanguage(lang) ? "rtl" : null) ??
    detectDirection(`${title} ${body}`) ??
    "ltr";

  return {
    filename,
    slug,
    url: `/blog/${slug}/`,
    title,
    description: data.description == null ? "" : String(data.description).trim(),
    date,
    updated,
    type,
    tags: toArray(data.tags).map((name) => ({ name, slug: slugify(name) })),
    featured: data.featured === true,
    draft: data.draft === true,
    cover: data.cover ? String(data.cover).trim() : null,
    coverAlt: data.coverAlt ? String(data.coverAlt).trim() : null,
    link: data.link ? String(data.link).trim() : null,
    lang,
    dir: dir === "rtl" ? "rtl" : "ltr",
    body,
  };
}

/** Newest first; slug breaks ties so the output is byte-stable across builds. */
export function sortPosts(posts) {
  return [...posts].sort(
    (a, b) => b.date - a.date || a.slug.localeCompare(b.slug, "en"),
  );
}

export async function loadPosts({ dir, includeDrafts = false }) {
  let filenames;
  try {
    filenames = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  } catch (error) {
    if (error.code === "ENOENT") return []; // no content directory yet — an empty blog
    throw error;
  }

  const posts = [];
  const problems = [];
  const seen = new Map();

  for (const filename of filenames) {
    const source = await readFile(join(dir, filename), "utf8");
    try {
      const post = buildPost({ filename, source });
      const previous = seen.get(post.slug);
      if (previous) {
        problems.push(`${filename}\n  - slug "${post.slug}" already used by ${previous}`);
        continue;
      }
      seen.set(post.slug, filename);
      if (post.draft && !includeDrafts) continue;
      posts.push(post);
    } catch (error) {
      if (!(error instanceof ContentError)) throw error;
      problems.push(error.message);
    }
  }

  if (problems.length) {
    throw new Error(`Invalid blog content:\n\n${problems.join("\n\n")}\n`);
  }

  return sortPosts(posts);
}

export { ContentError };
