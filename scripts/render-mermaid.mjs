import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { mermaidId, mermaidSvgPath, normalizeMermaid } from "../src/lib/mermaidId.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const mermaidBundle = require.resolve("mermaid/dist/mermaid.min.js");
const interLatin = require.resolve("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2");
const interLatinExt = require.resolve("@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2");
const blogDir = join(root, "src/content/blog");
const outDir = join(root, "src/assets/blog/mermaid");
const diagramDir = join(root, "src/data/diagrams");
const diagramOut = join(root, "src/assets/diagrams");

function chartsIn(source) {
  const charts = [];
  // MDX dedents a template literal by the indentation of the line that opens it.
  const pattern = /<Mermaid\b[\s\S]*?\n([ \t]*)chart=\{`([\s\S]*?)`\}/g;
  for (const match of source.matchAll(pattern)) {
    const indent = match[1];
    const dedented = match[2]
      .split("\n")
      .map((line, index) => (index > 0 && line.startsWith(indent) ? line.slice(indent.length) : line))
      .join("\n");
    charts.push(normalizeMermaid(dedented));
  }
  return charts;
}

function collectCharts() {
  const files = readdirSync(blogDir).filter((file) => file.endsWith(".mdx") || file.endsWith(".md"));
  return files.flatMap((file) => chartsIn(readFileSync(join(blogDir, file), "utf8")));
}

const fontFace = (family, file) => `@font-face {
  font-family: ${family};
  src: url("data:font/woff2;base64,${readFileSync(file).toString("base64")}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}`;

async function renderChart(page, chart, id) {
  return page.evaluate(async (source, diagramId) => {
    await document.fonts.ready;
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      flowchart: { htmlLabels: true, wrappingWidth: -1 },
    });
    const { svg } = await window.mermaid.render(diagramId, source);
    return svg;
  }, chart, `mmd${id}`);
}

const charts = collectCharts();
if (!charts.length) {
  console.error("No <Mermaid chart={`...`} /> blocks found in src/content/blog.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome";
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1800, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    ${fontFace("Inter", interLatin)}
    ${fontFace("Inter", interLatinExt)}
    body { margin: 0; background: #fff; font-family: Inter, Arial, sans-serif; }
  </style></head><body></body></html>`, { waitUntil: "networkidle0" });
  await page.addScriptTag({ path: mermaidBundle });

  const written = new Set();
  for (const chart of charts) {
    const id = mermaidId(chart);
    const svg = await renderChart(page, chart, id);
    if (!svg || /class="error-text"/.test(svg) || /Syntax error in/.test(svg)) {
      console.error(`Mermaid failed to render diagram ${id}.`);
      console.error(svg?.slice(0, 500) ?? "");
      process.exitCode = 1;
      continue;
    }
    const path = mermaidSvgPath(chart);
    writeFileSync(path, svg);
    written.add(path);
    console.log(`rendered ${id}.svg (${svg.length} bytes)`);
  }

  for (const file of readdirSync(outDir)) {
    const path = join(outDir, file);
    if (file.endsWith(".svg") && !written.has(path)) rmSync(path);
  }

  if (existsSync(diagramDir)) {
    mkdirSync(diagramOut, { recursive: true });
    const named = new Set();
    for (const file of readdirSync(diagramDir).filter((name) => name.endsWith(".mmd"))) {
      const chart = normalizeMermaid(readFileSync(join(diagramDir, file), "utf8"));
      const id = mermaidId(chart);
      const svg = await renderChart(page, chart, id);
      if (!svg || /class="error-text"/.test(svg) || /Syntax error in/.test(svg)) {
        console.error(`Mermaid failed to render ${file}.`);
        console.error(svg?.slice(0, 500) ?? "");
        process.exitCode = 1;
        continue;
      }
      const path = join(diagramOut, file.replace(/\.mmd$/, ".svg"));
      writeFileSync(path, svg);
      named.add(path);
      console.log(`rendered diagrams/${file.replace(/\.mmd$/, ".svg")} (${svg.length} bytes)`);
    }
    for (const file of readdirSync(diagramOut)) {
      const path = join(diagramOut, file);
      if (file.endsWith(".svg") && !named.has(path)) rmSync(path);
    }
  }
} finally {
  await browser.close();
}

if (process.exitCode) process.exit(process.exitCode);
