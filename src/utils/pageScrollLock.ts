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
