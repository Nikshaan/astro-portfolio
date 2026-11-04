export function markMermaidOverflow() {
  document.querySelectorAll<HTMLElement>(".post-mermaid-scroll").forEach((el) => {
    el.classList.toggle("is-overflowing", el.scrollWidth > el.clientWidth + 2);
  });
}

let installed = false;

export function installMermaidOverflow() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const run = () => markMermaidOverflow();
  run();
  window.addEventListener("resize", run, { passive: true });
  document.addEventListener("astro:page-load", run);
  if ("ResizeObserver" in window) {
    new ResizeObserver(run).observe(document.body);
  }
}
