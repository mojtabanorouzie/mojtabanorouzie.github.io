import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentError, buildPost, parseFrontmatter, sortPosts } from "./content.mjs";

const post = (frontmatter, body = "Body text.") =>
  buildPost({ filename: "example.md", source: `---\n${frontmatter}\n---\n\n${body}\n` });

const valid = "title: Example\ndate: 2026-01-02";

describe("parseFrontmatter", () => {
  it("separates metadata from the body", () => {
    const { data, body } = parseFrontmatter("---\ntitle: Hi\n---\n\nHello.\n");
    assert.deepEqual(data, { title: "Hi" });
    assert.equal(body.trim(), "Hello.");
  });

  it("keeps colons that appear inside a value", () => {
    const { data } = parseFrontmatter("---\ntitle: Ordering: a local property\n---\n");
    assert.equal(data.title, "Ordering: a local property");
  });

  it("reads quoted strings and unescapes inner quotes", () => {
    const { data } = parseFrontmatter(`---\ntitle: "He said \\"hi\\""\n---\n`);
    assert.equal(data.title, 'He said "hi"');
  });

  it("reads inline arrays, respecting quoted commas", () => {
    const { data } = parseFrontmatter(`---\ntags: [Kafka, "a, b", DDD]\n---\n`);
    assert.deepEqual(data.tags, ["Kafka", "a, b", "DDD"]);
  });

  it("reads block arrays", () => {
    const { data } = parseFrontmatter("---\ntags:\n  - Kafka\n  - DDD\n---\n");
    assert.deepEqual(data.tags, ["Kafka", "DDD"]);
  });

  it("reads booleans and leaves other scalars as strings", () => {
    const { data } = parseFrontmatter("---\ndraft: true\nfeatured: false\ndate: 2026-01-02\n---\n");
    assert.equal(data.draft, true);
    assert.equal(data.featured, false);
    assert.equal(data.date, "2026-01-02");
  });

  it("ignores comment lines and blank lines", () => {
    const { data } = parseFrontmatter("---\n# a comment\n\ntitle: Hi\n---\n");
    assert.deepEqual(data, { title: "Hi" });
  });

  it("treats a file with no frontmatter as all body", () => {
    const { data, body } = parseFrontmatter("# Just markdown\n");
    assert.deepEqual(data, {});
    assert.equal(body, "# Just markdown\n");
  });

  it("tolerates CRLF line endings", () => {
    const { data, body } = parseFrontmatter("---\r\ntitle: Hi\r\n---\r\n\r\nHello.\r\n");
    assert.equal(data.title, "Hi");
    assert.match(body, /Hello\./);
  });

  it("rejects a line it cannot parse", () => {
    assert.throws(() => parseFrontmatter("---\nthis is not a pair\n---\n"), /cannot parse/);
  });
});

describe("buildPost validation", () => {
  it("requires a title", () => {
    assert.throws(() => post("date: 2026-01-02"), /title: required/);
  });

  it("requires a date", () => {
    assert.throws(() => post("title: Example"), /date: required/);
  });

  it("rejects an unparseable date", () => {
    assert.throws(() => post("title: Example\ndate: last tuesday"), /not a valid date/);
  });

  it("rejects an unknown type", () => {
    assert.throws(() => post(`${valid}\ntype: essay`), /is not one of/);
  });

  it("rejects a cover without alt text", () => {
    assert.throws(() => post(`${valid}\ncover: /a.svg`), /coverAlt: required/);
  });

  it("rejects an updated date earlier than the publication date", () => {
    assert.throws(() => post(`${valid}\nupdated: 2025-12-01`), /earlier than date/);
  });

  it("reports every problem at once rather than only the first", () => {
    try {
      post("type: essay");
      assert.fail("expected a ContentError");
    } catch (error) {
      assert.ok(error instanceof ContentError);
      assert.match(error.message, /title: required/);
      assert.match(error.message, /date: required/);
      assert.match(error.message, /is not one of/);
    }
  });

  it("names the offending file in the error", () => {
    assert.throws(() => buildPost({ filename: "broken.md", source: "---\n---\n" }), /broken\.md/);
  });
});

describe("buildPost security guard", () => {
  it("rejects script tags", () => {
    assert.throws(() => post(valid, "<script>alert(1)</script>"), /unsafe HTML/);
  });

  it("rejects inline event handlers", () => {
    assert.throws(() => post(valid, `<img src="x" onerror="alert(1)">`), /unsafe HTML/);
  });

  it("rejects javascript: URLs", () => {
    assert.throws(() => post(valid, `<a href="javascript:alert(1)">x</a>`), /unsafe HTML/);
  });

  it("still allows ordinary raw HTML such as an embed", () => {
    assert.doesNotThrow(() => post(valid, `<iframe src="https://example.com"></iframe>`));
  });
});

describe("buildPost derived fields", () => {
  it("defaults type, direction and language", () => {
    const built = post(valid);
    assert.equal(built.type, "article");
    assert.equal(built.dir, "ltr");
    assert.equal(built.lang, "en");
    assert.equal(built.draft, false);
    assert.equal(built.featured, false);
    assert.deepEqual(built.tags, []);
  });

  it("derives the slug and URL from the filename", () => {
    const built = buildPost({ filename: "my-post.md", source: `---\n${valid}\n---\n` });
    assert.equal(built.slug, "my-post");
    assert.equal(built.url, "/blog/my-post/");
  });

  it("strips a date prefix from the filename", () => {
    const built = buildPost({ filename: "2026-01-02-my-post.md", source: `---\n${valid}\n---\n` });
    assert.equal(built.slug, "my-post");
  });

  it("lets frontmatter override the slug", () => {
    const built = post(`${valid}\nslug: custom-slug`);
    assert.equal(built.slug, "custom-slug");
  });

  it("rejects a slug that would collide with a generated route", () => {
    // /blog/tags/ is the tag index; a post there would be overwritten silently.
    assert.throws(() => post(`${valid}\nslug: tags`), /reserved/);
    assert.throws(() => buildPost({ filename: "Tags.md", source: `---\n${valid}\n---\n` }), /reserved/);
  });

  it("detects RTL content without being told", () => {
    const built = post(valid, "این یک متن فارسی است که باید راست‌چین شود.");
    assert.equal(built.dir, "rtl");
  });

  it("lets an explicit dir win over detection", () => {
    const built = post(`${valid}\ndir: ltr`, "این یک متن فارسی است.");
    assert.equal(built.dir, "ltr");
  });

  it("normalises tags into name/slug pairs", () => {
    const built = post(`${valid}\ntags: [Kafka, Event Driven]`);
    assert.deepEqual(built.tags, [
      { name: "Kafka", slug: "kafka" },
      { name: "Event Driven", slug: "event-driven" },
    ]);
  });

  it("treats an empty block list as no tags", () => {
    assert.deepEqual(post(`${valid}\ntags:`).tags, []);
  });
});

describe("sortPosts", () => {
  it("orders newest first and breaks ties on slug for stable output", () => {
    const make = (slug, date) => ({ slug, date: new Date(date) });
    const sorted = sortPosts([
      make("b", "2026-01-01"),
      make("c", "2026-03-01"),
      make("a", "2026-01-01"),
    ]);
    assert.deepEqual(sorted.map((p) => p.slug), ["c", "a", "b"]);
  });
});
