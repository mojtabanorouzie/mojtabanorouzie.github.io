// Renders tools/og/card.html -> assets/og-image.png (1200×630), the social
// share card referenced by index.html and every blog page.
//
// Same shape as resume/build-pdf.mjs: a plain Node script CI runs before the
// Pages artifact is uploaded, so the card always matches its source and is
// never committed by hand.
//
//   node tools/og/build-og.mjs
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

// Open Graph's expected size. Anything else gets cropped unpredictably by the
// various crawlers, so it is fixed rather than configurable.
const WIDTH = 1200;
const HEIGHT = 630;

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const input = pathToFileURL(resolve(here, "card.html")).href;
const outDir = resolve(repoRoot, "assets");
const output = resolve(outDir, "og-image.png");

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await page.goto(input, { waitUntil: "networkidle" });
await page.screenshot({ path: output, type: "png" });
await browser.close();

console.log(`✓ Social card written to ${output} (${WIDTH}×${HEIGHT})`);
