// Markdown → HTML, with the handful of renderer overrides that make the output
// good to read: linkable headings, figures with captions, keyboard-scrollable
// code blocks and tables, and per-block text direction for mixed Persian/English
// writing.

import { Marked, Renderer } from "marked";
import { SITE } from "./config.mjs";
import { detectDirection, escapeHtml, slugify } from "./text.mjs";

/**
 * @param {string} source  Markdown body.
 * @param {object} options
 * @param {"ltr"|"rtl"} options.baseDir  Direction of the surrounding article; a
 *   `dir` attribute is only emitted on blocks that disagree with it, so a purely
 *   English post produces no direction markup at all.
 * @returns {{ html: string, headings: Array<{depth:number,id:string,text:string}> }}
 */
export function renderMarkdown(source, { baseDir = "ltr" } = {}) {
  const headings = [];
  const usedIds = new Map();

  /** Stable, unique, Unicode-safe heading id. */
  const headingId = (text) => {
    const base = slugify(text);
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  /** Only mark direction when it fights the article's own direction. */
  const dirAttr = (text) => {
    const dir = detectDirection(text);
    return dir && dir !== baseDir ? ` dir="${dir}"` : "";
  };

  const isExternal = (href) =>
    /^https?:\/\//i.test(href) && !href.startsWith(`${SITE.origin}/`);

  class BlogRenderer extends Renderer {
    heading({ tokens, depth }) {
      const html = this.parser.parseInline(tokens);
      const text = this.parser.parseInline(tokens, this.parser.textRenderer);

      // The page's h1 is the post title, supplied by the template. A `#` in the
      // body would make a second one and break the document outline, so it is
      // rendered as an h2 — the level the author almost certainly meant.
      // Body headings therefore start at h2 whether they were written as # or ##.
      const level = Math.max(2, depth);

      const id = headingId(text);
      headings.push({ depth: level, id, text });
      return (
        `<h${level} id="${id}"${dirAttr(tokenText(tokens))}>${html}` +
        `<a class="heading-anchor" href="#${id}" aria-label="Permalink: ${escapeHtml(text)}">` +
        `<span aria-hidden="true">#</span></a></h${level}>\n`
      );
    }

    paragraph({ tokens }) {
      // A paragraph holding nothing but an image becomes a <figure>, which is
      // what the author meant and what the CSS needs to let images run wide.
      const meaningful = tokens.filter(
        (token) => !(token.type === "text" && !token.text.trim()),
      );
      if (meaningful.length === 1 && meaningful[0].type === "image") {
        return this.figure(meaningful[0]);
      }
      return `<p${dirAttr(tokenText(tokens))}>${this.parser.parseInline(tokens)}</p>\n`;
    }

    figure(token) {
      const caption = token.title
        ? `<figcaption>${escapeHtml(token.title)}</figcaption>`
        : "";
      return `<figure class="figure">${this.image(token)}${caption}</figure>\n`;
    }

    image({ href, text }) {
      // No width/height in Markdown, so reserve nothing and let the CSS keep the
      // aspect ratio; lazy + async decode keeps images off the critical path.
      return (
        `<img src="${escapeHtml(href)}" alt="${escapeHtml(text ?? "")}" ` +
        `loading="lazy" decoding="async">`
      );
    }

    link({ href, title, tokens }) {
      const html = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      // Links open in the same tab on purpose — the reader decides. `rel` still
      // matters for privacy and for the opener reference.
      const rel = isExternal(href) ? ' rel="noopener noreferrer"' : "";
      return `<a href="${escapeHtml(href)}"${titleAttr}${rel}>${html}</a>`;
    }

    code({ text, lang, escaped }) {
      const language = String(lang ?? "").trim().split(/\s+/)[0];
      const body = escaped ? text : escapeHtml(text);
      const classAttr = language ? ` class="language-${escapeHtml(language)}"` : "";
      const label = language ? `Code sample, ${language}` : "Code sample";
      return (
        `<div class="code-block"${language ? ` data-lang="${escapeHtml(language)}"` : ""}>` +
        `<pre dir="ltr" tabindex="0" role="region" aria-label="${escapeHtml(label)}">` +
        `<code${classAttr}>${body}</code></pre></div>\n`
      );
    }

    list(token) {
      return withDir(super.list(token), token);
    }

    blockquote(token) {
      return withDir(super.blockquote(token), token);
    }

    table(token) {
      // Wide tables scroll rather than blowing out the page; a focusable region
      // keeps that scroll reachable from the keyboard.
      return (
        `<div class="table-wrap" tabindex="0" role="region" aria-label="Table">` +
        `${super.table(token)}</div>\n`
      );
    }
  }

  /** Inject a direction attribute into the opening tag of already-built HTML. */
  function withDir(html, token) {
    const attr = dirAttr(tokenText(token));
    return attr ? html.replace(/^<(\w+)/, `<$1${attr}`) : html;
  }

  // `setOptions` rather than `new Marked({ renderer })` / `use({ renderer })`:
  // those two merge the renderer's *own enumerable* properties, which silently
  // drops every method of a class-based renderer (they live on the prototype).
  // Subclassing is what gives the overrides below access to `super`.
  const marked = new Marked();
  marked.setOptions({ gfm: true, breaks: false, renderer: new BlogRenderer() });
  return { html: marked.parse(source ?? ""), headings };
}

// Token types whose text says nothing about the prose direction — a Persian
// paragraph is still Persian even when most of its characters sit in a
// `code span`.
const NON_PROSE = new Set(["code", "codespan", "html", "space", "def"]);

/** Recursively collect the prose text carried by a token tree. */
export function tokenText(token) {
  if (!token) return "";
  if (Array.isArray(token)) return token.map(tokenText).join(" ");
  if (NON_PROSE.has(token.type)) return "";
  if (token.tokens?.length) return tokenText(token.tokens);
  if (token.items?.length) return tokenText(token.items);
  if (token.rows || token.header) {
    return tokenText([...(token.header ?? []), ...(token.rows ?? []).flat()]);
  }
  return token.text ?? "";
}
