export interface PageState {
  scrollY?: number;
  modal?: string | null;
  modalScroll?: number;
  search?: string;
  ui?: Record<string, string>;
}

export function restoredPageState(): PageState | null {
  if (typeof window === "undefined") return null;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type !== "back_forward") return null;
  const state = window.history.state?.pageState;
  return state && typeof state === "object" ? state : null;
}

export function takeRestoredModal(ownsModal: (modal: string) => boolean): PageState | null {
  const state = restoredPageState();
  if (!state?.modal || !ownsModal(state.modal)) return null;
  try {
    window.history.replaceState(
      { ...window.history.state, pageState: { ...state, modal: null, modalScroll: 0 } },
      "",
    );
  } catch {}
  return state;
}

export function rememberUiState(key: string, value: string): void {
  try {
    const state = window.history.state ?? {};
    const pageState: PageState = state.pageState ?? {};
    window.history.replaceState(
      { ...state, pageState: { ...pageState, ui: { ...pageState.ui, [key]: value } } },
      "",
    );
  } catch {}
}

export function restoredUiState(key: string): string | undefined {
  return restoredPageState()?.ui?.[key];
}
