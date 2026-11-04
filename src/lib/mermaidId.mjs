import { createHash } from "node:crypto";
import { join } from "node:path";

export function normalizeMermaid(chart) {
  return `${chart.replace(/\r\n/g, "\n").trim()}\n`;
}

export function mermaidId(chart) {
  return createHash("sha256").update(normalizeMermaid(chart)).digest("hex").slice(0, 20);
}

export function mermaidSvgPath(chart) {
  return join(process.cwd(), "src/assets/blog/mermaid", `${mermaidId(chart)}.svg`);
}
