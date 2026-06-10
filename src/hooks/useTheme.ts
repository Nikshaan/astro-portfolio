import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => {};
  const obs = new MutationObserver(onStoreChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
}

function getSnapshot() {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "light";
}

function getServerSnapshot() {
  return false;
}

export function useIsLightTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useIsLightTheme;

export function toggleThemeWithTransition(duration = 400) {
  if (typeof document === "undefined") return;

  const html = document.documentElement;

  if (html.classList.contains("theme-transitioning")) {
    html.classList.remove("theme-transitioning");
    void html.offsetHeight;
  }

  html.classList.add("theme-transitioning");

  const isLight = html.getAttribute("data-theme") === "light";

  if (isLight) {
    html.removeAttribute("data-theme");
    localStorage.removeItem("theme");
  } else {
    html.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }

  window.setTimeout(() => {
    html.classList.remove("theme-transitioning");
  }, duration);
}
