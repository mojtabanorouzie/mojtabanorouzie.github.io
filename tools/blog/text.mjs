// Small, dependency-free text helpers shared by the loader, renderer and feeds.
// Everything here is pure so it can be unit-tested in isolation (see text.test.mjs).

import { WPM } from "./config.mjs";

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape a string for interpolation into HTML text *or* a quoted attribute. */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Escape for XML (RSS/sitemap). Same set, but never emits HTML-only entities. */
export function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) =>
    ch === "'" ? "&apos;" : HTML_ESCAPES[ch],
  );
}

/**
 * Unicode-aware slug. Keeps Persian/Arabic letters intact rather than stripping
 * them to an empty string, which is what an ASCII-only slugifier would do.
 */
export function slugify(input) {
  const slug = String(input ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\p{M}/gu, "") // drop combining marks (Arabic/Persian diacritics)
    .replace(/['’ʼ`]/g, "") // apostrophes vanish rather than becoming separators
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

const RTL_CHARS = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Thaana}\p{Script=Syriac}]/gu;
const LTR_CHARS = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]/gu;

/**
 * Decide the base direction of a block of text by counting strong directional
 * characters. Deliberately *not* the "first strong character" heuristic that
 * `dir="auto"` uses — a Persian paragraph that opens with an English technical
 * term ("Kafka رو برای...") would be mis-detected as LTR by that rule.
 *
 * Returns "rtl", "ltr", or null when the text carries no directional signal
 * (pure code, digits, punctuation) so the caller can inherit instead.
 */
export function detectDirection(text) {
  const value = String(text ?? "");
  const rtl = (value.match(RTL_CHARS) || []).length;
  const ltr = (value.match(LTR_CHARS) || []).length;
  if (rtl === 0 && ltr === 0) return null;
  return rtl > ltr ? "rtl" : "ltr";
}

/** Strip tags and decode the handful of entities we generate, for text analysis. */
export function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) =>
      ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " })[name],
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** Reading-time estimate in whole minutes, never less than one. */
export function readingTime(text) {
  const words = stripHtml(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}

/** Trim to a word boundary, appending an ellipsis when the text was cut. */
export function truncate(text, max = 180) {
  const value = String(text ?? "").trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > max * 0.6 ? cut.slice(0, boundary) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "12 Jan 2026". Uses UTC accessors on purpose: dates in frontmatter are plain
 * calendar days, and local-time accessors would shift them a day west of UTC.
 */
export function formatDate(date) {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** YYYY-MM-DD, for <time datetime> and the sitemap. */
export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/** Rewrite root-relative links to absolute ones — feeds are read off-site. */
export function absolutizeUrls(html, origin) {
  return String(html ?? "").replace(
    /\b(href|src)="\/(?!\/)/g,
    (_, attr) => `${attr}="${origin}/`,
  );
}
