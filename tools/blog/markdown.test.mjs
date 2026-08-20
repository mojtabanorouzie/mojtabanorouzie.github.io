import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderMarkdown, tokenText } from "./markdown.mjs";
import { SITE } from "./config.mjs";

const render = (md, options) => renderMarkdown(md, options).html;

describe("headings", () => {
  it("gives each heading an id and a permalink", () => {
    const html = render("## Hello world");
    assert.match(html, /<h2 id="hello-world">/);
    assert.match(html, /<a class="heading-anchor" href="#hello-world"/);
  });

  it("de-duplicates ids when a heading repeats", () => {
    const { html, headings } = renderMarkdown("## Same\n\n## Same\n\n## Same");
    assert.deepEqual(headings.map((h) => h.id), ["same", "same-2", "same-3"]);
    assert.equal((html.match(/id="same"/g) ?? []).length, 1);
  });

  it("builds usable ids from Persian headings", () => {
    const { headings } = renderMarkdown("## یک عنوان فارسی");
    assert.equal(headings[0].id, "یک-عنوان-فارسی");
  });

  it("demotes a body h1 to h2 so the post title stays the only h1", () => {
    const { html, headings } = renderMarkdown("# Body heading");
    assert.match(html, /<h2 id="body-heading">/);
    assert.ok(!html.includes("<h1"));
    assert.deepEqual(headings, [{ depth: 2, id: "body-heading", text: "Body heading" }]);
  });

  it("escapes markup in the permalink label", () => {
    const html = render('## A & B <c>');
    assert.match(html, /aria-label="Permalink: A &amp; B/);
  });
});

describe("images and figures", () => {
  it("promotes a standalone image to a figure with a caption", () => {
    const html = render('![Alt text](/a.svg "The caption")');
    assert.match(html, /<figure class="figure">/);
    assert.match(html, /<figcaption>The caption<\/figcaption>/);
    assert.match(html, /alt="Alt text"/);
  });

  it("omits the caption when the image has no title", () => {
    const html = render("![Alt text](/a.svg)");
    assert.match(html, /<figure class="figure">/);
    assert.ok(!html.includes("figcaption"));
  });

  it("lazy-loads images", () => {
    assert.match(render("![a](/a.svg)"), /loading="lazy" decoding="async"/);
  });

  it("leaves an image inline when it shares a paragraph with text", () => {
    const html = render("Look at this ![a](/a.svg) picture.");
    assert.ok(!html.includes("<figure"));
    assert.match(html, /<p>Look at this <img/);
  });

  it("escapes a quote in the alt text", () => {
    assert.match(render('![say "hi"](/a.svg)'), /alt="say &quot;hi&quot;"/);
  });
});

describe("links", () => {
  it("adds rel to external links only", () => {
    const html = render("[out](https://example.com) and [in](/blog/x/)");
    assert.match(html, /<a href="https:\/\/example\.com" rel="noopener noreferrer">/);
    assert.match(html, /<a href="\/blog\/x\/">in<\/a>/);
  });

  it("treats the site's own absolute URLs as internal", () => {
    const html = render(`[home](${SITE.origin}/blog/x/)`);
    assert.ok(!html.includes("noopener"));
  });
});

describe("code", () => {
  it("wraps a fenced block with a language label and a focusable region", () => {
    const html = render("```js\nconst a = 1;\n```");
    assert.match(html, /<div class="code-block" data-lang="js">/);
    assert.match(html, /<pre dir="ltr" tabindex="0" role="region" aria-label="Code sample, js">/);
    assert.match(html, /<code class="language-js">/);
  });

  it("handles a fence with no language", () => {
    const html = render("```\nplain\n```");
    assert.match(html, /<div class="code-block">/);
    assert.match(html, /aria-label="Code sample"/);
    assert.ok(!html.includes("data-lang"));
  });

  it("escapes HTML inside code rather than executing it", () => {
    const html = render("```\n<script>alert(1)</script>\n```");
    assert.match(html, /&lt;script&gt;/);
    assert.ok(!html.includes("<script>"));
  });

  it("uses only the first word of the info string as the language", () => {
    assert.match(render('```js title="a.js"\nx\n```'), /data-lang="js"/);
  });
});

describe("tables", () => {
  it("wraps tables in a scrollable labelled region", () => {
    const html = render("| a | b |\n| - | - |\n| 1 | 2 |");
    assert.match(html, /<div class="table-wrap" tabindex="0" role="region" aria-label="Table">/);
    assert.match(html, /<table>/);
  });
});

describe("direction", () => {
  it("marks only the blocks that disagree with the article direction", () => {
    const html = render("English paragraph.\n\nاین یک پاراگراف فارسی است.", { baseDir: "ltr" });
    assert.match(html, /<p>English paragraph\.<\/p>/);
    assert.match(html, /<p dir="rtl">این/);
  });

  it("mirrors correctly for an RTL article", () => {
    const html = render("این یک پاراگراف فارسی است.\n\nEnglish paragraph.", { baseDir: "rtl" });
    assert.match(html, /<p>این/);
    assert.match(html, /<p dir="ltr">English paragraph\.<\/p>/);
  });

  it("marks lists and blockquotes too", () => {
    const html = render("- مورد اول\n- مورد دوم\n\n> نقل قول فارسی", { baseDir: "ltr" });
    assert.match(html, /<ul dir="rtl">/);
    assert.match(html, /<blockquote dir="rtl">/);
  });

  it("ignores code when deciding a block's direction", () => {
    // Mostly Latin characters, but all of them inside code spans.
    const html = render("`SELECT * FROM orders WHERE id = 1` را اجرا کن.", { baseDir: "ltr" });
    assert.match(html, /<p dir="rtl">/);
  });

  it("leaves direction-neutral blocks unmarked", () => {
    assert.match(render("123 456", { baseDir: "ltr" }), /<p>123 456<\/p>/);
  });
});

describe("tokenText", () => {
  it("returns an empty string for empty input", () => {
    assert.equal(tokenText(null), "");
    assert.equal(tokenText([]), "");
  });
});

describe("robustness", () => {
  it("renders empty and undefined sources without throwing", () => {
    assert.equal(render(""), "");
    assert.equal(renderMarkdown(undefined).html, "");
  });

  it("does not choke on unbalanced markup", () => {
    assert.doesNotThrow(() => render("## Unclosed **bold\n\n[link](\n\n```\nunclosed fence"));
  });
});
