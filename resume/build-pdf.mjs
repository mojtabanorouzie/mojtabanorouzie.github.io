// Renders resume/resume.html -> assets/Mojtaba-Norouzi-CV.pdf via headless Chromium.
// Run locally: `npm --prefix resume ci && node resume/build-pdf.mjs`
// In CI it runs before the Pages artifact is uploaded, so the deployed site always
// links a fresh, selectable-text PDF.
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const input = pathToFileURL(resolve(here, "resume.html")).href;
const outDir = resolve(repoRoot, "assets");
const output = resolve(outDir, "Mojtaba-Norouzi-CV.pdf");

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
// `networkidle` ensures the local stylesheet is applied before printing.
await page.goto(input, { waitUntil: "networkidle" });
await page.pdf({
  path: output,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true, // honor @page size/margins from resume.css
});
await browser.close();

console.log(`✓ Résumé PDF written to ${output}`);
