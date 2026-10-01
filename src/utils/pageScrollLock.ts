/**
 * Freeze page scrolling behind a modal without shifting the page.
 *
 * The lock goes on <html>, not <body>: global.css gives <html> an overflow-x
 * value, and then CSS no longer passes a body `overflow: hidden` on to the
 * viewport. The scrollbar would stay, the page would keep scrolling, and the
 * padding meant to replace the scrollbar would squeeze the layout sideways.
 *
 * --scrollbar-width also feeds the fixed navbar's `right` offset
 * (transitions.css), so it doesn't move either.
 */
export function lockPageScroll(): void {
  const root = document.documentElement;
  root.style.setProperty(
    "--scrollbar-width",
    `${window.innerWidth - root.clientWidth}px`,
  );
  root.style.overflow = "hidden";
  document.body.style.paddingRight = "var(--scrollbar-width, 0px)";
}

export function unlockPageScroll(): void {
  const root = document.documentElement;
  root.style.overflow = "";
  document.body.style.paddingRight = "";
  root.style.removeProperty("--scrollbar-width");
}
