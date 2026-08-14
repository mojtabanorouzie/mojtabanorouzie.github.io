import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absolutizeUrls,
  detectDirection,
  escapeHtml,
  escapeXml,
  formatDate,
  isoDate,
  readingTime,
  slugify,
  stripHtml,
  truncate,
} from "./text.mjs";

describe("escaping", () => {
  it("escapes every character that can break out of HTML", () => {
    assert.equal(escapeHtml(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("uses &apos; for XML rather than the HTML-only &#39;", () => {
    assert.equal(escapeXml("it's <b>"), "it&apos;s &lt;b&gt;");
  });

  it("handles null and undefined without throwing", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
  });
});

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    assert.equal(slugify("Ordering Is A Local Property"), "ordering-is-a-local-property");
  });

  it("drops apostrophes instead of turning them into separators", () => {
    assert.equal(slugify("What's next"), "whats-next");
  });

  it("keeps Persian letters instead of producing an empty slug", () => {
    assert.equal(slugify("یادداشت کوتاه"), "یادداشت-کوتاه");
  });

  it("strips Arabic diacritics", () => {
    assert.equal(slugify("نکتهٔ ظریف"), slugify("نکته ظریف"));
  });

  it("trims separator runs from both ends", () => {
    assert.equal(slugify("  --Hello,  World!!  "), "hello-world");
  });

  it("never returns an empty string", () => {
    assert.equal(slugify("!!!"), "section");
    assert.equal(slugify(""), "section");
  });
});

describe("detectDirection", () => {
  it("returns rtl for Persian prose", () => {
    assert.equal(detectDirection("این یک جمله فارسی است"), "rtl");
  });

  it("returns ltr for English prose", () => {
    assert.equal(detectDirection("This is an English sentence"), "ltr");
  });

  it("uses the majority, not the first strong character", () => {
    // `dir="auto"` would call this LTR because it opens with "Kafka".
    assert.equal(detectDirection("Kafka رو برای همین کار انتخاب کردیم چون ترتیب مهم بود"), "rtl");
  });

  it("returns null when there is no directional signal", () => {
    assert.equal(detectDirection("123 -- 456"), null);
    assert.equal(detectDirection(""), null);
  });
});

describe("readingTime", () => {
  it("rounds to whole minutes at 200 wpm", () => {
    assert.equal(readingTime("word ".repeat(400)), 2);
  });

  it("never returns zero for short text", () => {
    assert.equal(readingTime("three words here"), 1);
    assert.equal(readingTime(""), 1);
  });
});

describe("stripHtml", () => {
  it("removes tags and decodes the entities we emit", () => {
    assert.equal(stripHtml("<p>a &amp; <b>b</b></p>"), "a & b");
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    assert.equal(truncate("short", 20), "short");
  });

  it("cuts on a word boundary and marks the cut", () => {
    const result = truncate("the quick brown fox jumps over the lazy dog", 20);
    assert.ok(result.endsWith("…"));
    assert.ok(result.length <= 21);
    assert.ok(!result.includes("jumps over"));
  });
});

describe("dates", () => {
  const date = new Date("2026-01-05T00:00:00Z");

  it("formats using UTC so a calendar day never shifts west of UTC", () => {
    assert.equal(formatDate(date), "5 Jan 2026");
    assert.equal(isoDate(date), "2026-01-05");
  });
});

describe("absolutizeUrls", () => {
  it("rewrites root-relative href and src for off-site readers", () => {
    assert.equal(
      absolutizeUrls('<a href="/blog/x/"><img src="/a.svg"></a>', "https://example.com"),
      '<a href="https://example.com/blog/x/"><img src="https://example.com/a.svg"></a>',
    );
  });

  it("leaves absolute and protocol-relative URLs alone", () => {
    const html = '<a href="https://other.test/x"><img src="//cdn.test/a.png"></a>';
    assert.equal(absolutizeUrls(html, "https://example.com"), html);
  });
});
