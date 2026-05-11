import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RadialHeatmapPayload } from "../utils/radialHeatmapClient";
import {
  loadRadialHeatmapPayload,
  readRadialHeatmapCache,
} from "../utils/radialHeatmapClient";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CX = 340;
const CY = 340;
const R_OUTER = 308;
const RING_W = 21;
const RING_GAP = 3;
const N_WEEKS = 52;
const N_RINGS = 10;
const GAP_DEG = 1.3;
const LABEL_R = 325;
const SWEEP_DEG = (360 - N_WEEKS * GAP_DEG) / N_WEEKS;
const SWEEP_RAD = (SWEEP_DEG * Math.PI) / 180;
const STRIDE_RAD = SWEEP_RAD + (GAP_DEG * Math.PI) / 180;
const ROTATE_NEWEST_WEEK_TO_TOP_DEG =
  -((N_WEEKS - 1) * STRIDE_RAD * 180) / Math.PI;
const CHART_ROTATE_TRANSFORM = `rotate(${ROTATE_NEWEST_WEEK_TO_TOP_DEG} ${CX} ${CY})`;
const CHART_TEXT_UPRIGHT_DEG = -ROTATE_NEWEST_WEEK_TO_TOP_DEG;

const ARTIST_PALETTE = [
  "#D64045",
  "#E07830",
  "#C49A15",
  "#72B03C",
  "#1FA868",
  "#18A0B8",
  "#3878CC",
  "#6858D0",
  "#A848C0",
  "#D04478",
];

function annularPath(
  cx: number,
  cy: number,
  ri: number,
  ro: number,
  a0: number,
  a1: number,
): string {
  const x0o = cx + ro * Math.cos(a0);
  const y0o = cy + ro * Math.sin(a0);
  const x1o = cx + ro * Math.cos(a1);
  const y1o = cy + ro * Math.sin(a1);
  const x1i = cx + ri * Math.cos(a1);
  const y1i = cy + ri * Math.sin(a1);
  const x0i = cx + ri * Math.cos(a0);
  const y0i = cy + ri * Math.sin(a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0o} ${y0o} A ${ro} ${ro} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${ri} ${ri} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

function ringOuterInner(ring: number): { ro: number; ri: number } {
  const ro = R_OUTER - ring * (RING_W + RING_GAP);
  const ri = ro - RING_W;
  return { ro, ri };
}

function buildPaths(): string[][] {
  const paths: string[][] = [];
  for (let ring = 0; ring < N_RINGS; ring++) {
    const { ro, ri } = ringOuterInner(ring);
    const row: string[] = [];
    for (let w = 0; w < N_WEEKS; w++) {
      const a0 = -Math.PI / 2 + w * STRIDE_RAD;
      const a1 = a0 + SWEEP_RAD;
      row.push(annularPath(CX, CY, ri, ro, a0, a1));
    }
    paths.push(row);
  }
  return paths;
}

const STATIC_PATHS = buildPaths();

function innermostInnerR(): number {
  const { ri } = ringOuterInner(N_RINGS - 1);
  return ri;
}

function weekFromSvgPoint(x: number, y: number): number | null {
  const dx = x - CX;
  const dy = y - CY;
  const dist = Math.hypot(dx, dy);
  const { ro } = ringOuterInner(0);
  const rim = innermostInnerR();
  if (dist < rim * 0.98 || dist > ro * 1.015) return null;
  let a = Math.atan2(dy, dx);
  let t = a + Math.PI / 2;
  if (t < 0) t += 2 * Math.PI;
  if (t >= 2 * Math.PI - 1e-10) t -= 2 * Math.PI;
  const wi = Math.floor(t / STRIDE_RAD);
  if (wi < 0 || wi >= N_WEEKS) return null;
  const within = t - wi * STRIDE_RAD;
  if (within > SWEEP_RAD) return null;
  return wi;
}

function monthLabels(
  fromSec: number,
  toSec: number,
): { a: number; text: string }[] {
  const out: { a: number; text: string }[] = [];
  const span = Math.max(1, toSec - fromSec);
  let y = new Date(fromSec * 1000).getUTCFullYear();
  let mo = new Date(fromSec * 1000).getUTCMonth();
  for (let i = 0; i < 24; i++) {
    const sec = Math.floor(Date.UTC(y, mo, 1) / 1000);
    if (sec >= fromSec && sec <= toSec) {
      const u = (sec - fromSec) / span;
      const a = -Math.PI / 2 + u * 2 * Math.PI;
      const text = new Date(sec * 1000).toLocaleDateString(undefined, {
        month: "short",
        timeZone: "UTC",
      });
      out.push({ a, text });
    }
    mo++;
    if (mo > 11) {
      mo = 0;
      y++;
    }
    if (Date.UTC(y, mo, 1) / 1000 > toSec) break;
  }
  return out;
}

function formatWeekOf(fromSec: number): string {
  const line = new Date(fromSec * 1000).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `Week of ${line}`;
}

function useCoarsePointer() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(pointer: coarse)");
      const handler = () => onStoreChange();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    },
    () =>
      typeof window === "undefined"
        ? false
        : window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

type BuiltModel = {
  artists: RadialHeatmapPayload["artists"];
  weeks: RadialHeatmapPayload["weeks"];
  baseOpacities: number[][];
  colors: string[];
  fromSec: number;
  toSec: number;
};

function normalizeArtists(
  artists: RadialHeatmapPayload["artists"],
): RadialHeatmapPayload["artists"] {
  const trimmed = artists.slice(0, N_RINGS);
  while (trimmed.length < N_RINGS) {
    trimmed.push({ name: "", plays: Array.from({ length: N_WEEKS }, () => 0) });
  }
  return trimmed.map((a) => {
    let plays = a.plays.slice();
    if (plays.length > N_WEEKS) plays = plays.slice(-N_WEEKS);
    while (plays.length < N_WEEKS) plays.unshift(0);
    return { name: a.name, plays };
  });
}

export default memo(function RadialArtistHeatmap() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [data, setData] = useState<RadialHeatmapPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const coarsePointer = useCoarsePointer();
  const stickyTouchTooltip =
    coarsePointer ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);

  useEffect(() => {
    const boot = readRadialHeatmapCache();
    if (boot) {
      setData(boot);
      setShouldLoad(true);
    }
  }, []);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const chartGroupRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipTitleRef = useRef<HTMLDivElement | null>(null);
  const tooltipListRef = useRef<HTMLUListElement | null>(null);
  const modelRef = useRef<BuiltModel | null>(null);
  const lastPointerWeekRef = useRef<number | null>(null);
  const [hoverWeek, setHoverWeek] = useState<number | null>(null);
  const cellsRef = useRef<(SVGPathElement | null)[][]>([]);

  const bindRoot = useCallback((el: HTMLDivElement | null) => {
    rootRef.current = el;
  }, []);

  const flushHighlight = useCallback(() => {
    const m = modelRef.current;
    if (!m) return;
    for (let r = 0; r < N_RINGS; r++) {
      for (let w = 0; w < N_WEEKS; w++) {
        const el = cellsRef.current[r]?.[w];
        if (!el) continue;
        const o = m.baseOpacities[r]?.[w] ?? 0.06;
        el.setAttribute("fill-opacity", String(o));
        el.setAttribute("stroke", "none");
        el.setAttribute("stroke-width", "0");
      }
    }
  }, []);

  const applyWeekHover = useCallback(
    (week: number | null) => {
      const m = modelRef.current;
      if (!m) return;
      if (week === null) {
        flushHighlight();
        return;
      }
      for (let r = 0; r < N_RINGS; r++) {
        for (let w = 0; w < N_WEEKS; w++) {
          const el = cellsRef.current[r]?.[w];
          if (!el) continue;
          if (w === week) {
            const plays = m.artists[r]?.plays?.[week] ?? 0;
            if (plays > 0) {
              el.setAttribute("fill-opacity", "1");
              el.setAttribute("stroke", "var(--radial-cell-highlight-stroke)");
              el.setAttribute("stroke-width", "1");
            } else {
              const o = m.baseOpacities[r]?.[w] ?? 0.06;
              el.setAttribute("fill-opacity", String(o));
              el.setAttribute("stroke", "none");
              el.setAttribute("stroke-width", "0");
            }
          } else {
            const o = m.baseOpacities[r]?.[w] ?? 0.06;
            el.setAttribute("fill-opacity", String(o));
            el.setAttribute("stroke", "none");
            el.setAttribute("stroke-width", "0");
          }
        }
      }
    },
    [flushHighlight],
  );

  const dismissTouchRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!stickyTouchTooltip) return;
    const onDocTouchStart = (e: TouchEvent) => {
      const svg = svgRef.current;
      const node = e.target;
      if (!svg || !(node instanceof Node) || svg.contains(node)) return;
      if (lastPointerWeekRef.current === null) return;
      dismissTouchRef.current();
    };
    document.addEventListener("touchstart", onDocTouchStart, true);
    return () =>
      document.removeEventListener("touchstart", onDocTouchStart, true);
  }, [stickyTouchTooltip]);

  useEffect(() => {
    const sync = () =>
      setIsLightTheme(
        document.documentElement.getAttribute("data-theme") === "light",
      );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancel = false;
    const prefetch = readRadialHeatmapCache();
    if (prefetch) {
      setData(prefetch);
      setError(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
    loadRadialHeatmapPayload()
      .then((payload) => {
        if (cancel) return;
        setData(payload);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancel) return;
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load yearly scrobbles";
        setError(message);
        const fallback = readRadialHeatmapCache();
        if (fallback) {
          setData(fallback);
          setError(null);
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [shouldLoad]);

  useEffect(() => {
    if (shouldLoad) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: "400px 0px 340px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoad]);

  const model = useMemo((): BuiltModel | null => {
    if (!data?.weeks?.length || !data.artists?.length) return null;
    const wk = data.weeks;
    if (wk.length !== N_WEEKS) return null;
    const artists = normalizeArtists(data.artists);
    const fromSec = wk[0]?.from ?? 0;
    const toSec = wk[N_WEEKS - 1]?.to ?? fromSec;
    const baseOpacities: number[][] = [];
    const oEmpty = isLightTheme ? 0.14 : 0.06;
    for (let r = 0; r < N_RINGS; r++) {
      const plays =
        artists[r]?.plays ?? Array.from({ length: N_WEEKS }, () => 0);
      const peak = plays.reduce((m, v) => Math.max(m, v), 0);
      const row: number[] = [];
      for (let w = 0; w < N_WEEKS; w++) {
        const p = plays[w] ?? 0;
        if (peak <= 0) row.push(oEmpty);
        else if (p <= 0) row.push(oEmpty);
        else {
          const t = Math.min(1, p / peak);
          if (isLightTheme) row.push(Math.min(1, 0.2 + t * 0.8));
          else row.push(Math.max(0.06, t));
        }
      }
      baseOpacities.push(row);
    }
    const colors = artists.map(
      (_, i) => ARTIST_PALETTE[i % ARTIST_PALETTE.length],
    );
    return { artists, weeks: wk, baseOpacities, colors, fromSec, toSec };
  }, [data, isLightTheme]);

  const monthPts = useMemo(() => {
    if (!model) return [];
    return monthLabels(model.fromSec, model.toSec);
  }, [model]);

  useLayoutEffect(() => {
    modelRef.current = model;
    lastPointerWeekRef.current = null;
    setHoverWeek(null);
    if (!model) return;
    for (let r = 0; r < N_RINGS; r++) {
      for (let w = 0; w < N_WEEKS; w++) {
        const el = cellsRef.current[r]?.[w];
        if (!el) continue;
        const o = model.baseOpacities[r]?.[w] ?? 0.06;
        el.setAttribute("fill-opacity", String(o));
        el.setAttribute("stroke", "none");
        el.setAttribute("stroke-width", "0");
      }
    }
  }, [model]);

  const setCellRef = useCallback(
    (ring: number, week: number, el: SVGPathElement | null) => {
      if (!cellsRef.current[ring]) cellsRef.current[ring] = [];
      cellsRef.current[ring][week] = el;
    },
    [],
  );

  const pointerToChartSpace = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const g = chartGroupRef.current;
      const ctm = g?.getScreenCTM() ?? svg.getScreenCTM();
      if (!ctm) return null;
      const p = pt.matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    },
    [],
  );

  const updateTooltip = useCallback(
    (week: number | null, clientX: number, clientY: number) => {
      const tip = tooltipRef.current;
      const titleEl = tooltipTitleRef.current;
      const listEl = tooltipListRef.current;
      const host = rootRef.current;
      const m = modelRef.current;
      if (!tip || !titleEl || !listEl || !host || !m) return;
      if (week === null) {
        tip.style.visibility = "hidden";
        tip.style.opacity = "0";
        return;
      }
      const fromSec = m.weeks[week]?.from;
      if (fromSec === undefined) return;
      titleEl.textContent = formatWeekOf(fromSec);
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      const rows: { name: string; plays: number; color: string }[] = [];
      for (let r = 0; r < N_RINGS; r++) {
        const name = m.artists[r]?.name ?? "";
        const plays = m.artists[r]?.plays?.[week] ?? 0;
        if (plays > 0)
          rows.push({ name, plays, color: m.colors[r] ?? m.colors[0] });
      }
      rows.sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name));
      for (const row of rows) {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.alignItems = "baseline";
        li.style.gap = "6px";
        li.style.minWidth = "0";
        const dot = document.createElement("span");
        dot.style.width = "8px";
        dot.style.height = "8px";
        dot.style.borderRadius = "9999px";
        dot.style.backgroundColor = row.color;
        dot.style.flexShrink = "0";
        const nm = document.createElement("span");
        nm.style.minWidth = "0";
        nm.style.flex = "1";
        nm.style.overflow = "hidden";
        nm.style.textOverflow = "ellipsis";
        nm.style.whiteSpace = "nowrap";
        nm.textContent = row.name;
        const ct = document.createElement("span");
        ct.style.flexShrink = "0";
        ct.style.fontVariantNumeric = "tabular-nums";
        ct.textContent = row.plays.toLocaleString();
        li.appendChild(dot);
        li.appendChild(nm);
        li.appendChild(ct);
        listEl.appendChild(li);
      }
      tip.style.visibility = "visible";
      tip.style.opacity = "1";
      const rect = host.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const pad = 10;
      let left = clientX - rect.left + pad;
      let top = clientY - rect.top + pad;
      const maxL = rect.width - tipRect.width - pad;
      const maxT = rect.height - tipRect.height - pad;
      left = Math.max(pad, Math.min(left, maxL));
      top = Math.max(pad, Math.min(top, maxT));
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    },
    [],
  );

  useLayoutEffect(() => {
    dismissTouchRef.current = () => {
      lastPointerWeekRef.current = null;
      setHoverWeek(null);
      flushHighlight();
      updateTooltip(null, 0, 0);
    };
  }, [flushHighlight, updateTooltip]);

  const onSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (coarsePointer) return;
      const p = pointerToChartSpace(e.clientX, e.clientY);
      if (!p) return;
      const wi = weekFromSvgPoint(p.x, p.y);
      if (wi === null) {
        if (lastPointerWeekRef.current !== null) {
          lastPointerWeekRef.current = null;
          setHoverWeek(null);
          flushHighlight();
          updateTooltip(null, e.clientX, e.clientY);
        }
        return;
      }
      if (lastPointerWeekRef.current !== wi) {
        lastPointerWeekRef.current = wi;
        setHoverWeek(wi);
        applyWeekHover(wi);
      }
      updateTooltip(wi, e.clientX, e.clientY);
    },
    [
      applyWeekHover,
      coarsePointer,
      flushHighlight,
      pointerToChartSpace,
      updateTooltip,
    ],
  );

  const onSvgMouseLeave = useCallback(() => {
    lastPointerWeekRef.current = null;
    setHoverWeek(null);
    flushHighlight();
    updateTooltip(null, 0, 0);
  }, [flushHighlight, updateTooltip]);

  const onSvgTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (!e.touches[0]) return;
      const t = e.touches[0];
      const p = pointerToChartSpace(t.clientX, t.clientY);
      if (!p) return;
      const wi = weekFromSvgPoint(p.x, p.y);
      if (wi === null) {
        if (lastPointerWeekRef.current !== null) {
          lastPointerWeekRef.current = null;
          setHoverWeek(null);
          flushHighlight();
          updateTooltip(null, t.clientX, t.clientY);
        }
        return;
      }
      if (lastPointerWeekRef.current !== wi) {
        lastPointerWeekRef.current = wi;
        setHoverWeek(wi);
        applyWeekHover(wi);
      }
      updateTooltip(wi, t.clientX, t.clientY);
    },
    [applyWeekHover, flushHighlight, pointerToChartSpace, updateTooltip],
  );

  const onSvgTouchComplete = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (!stickyTouchTooltip) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const p = pointerToChartSpace(t.clientX, t.clientY);
      if (!p) return;
      const wi = weekFromSvgPoint(p.x, p.y);
      if (wi === null) {
        lastPointerWeekRef.current = null;
        setHoverWeek(null);
        flushHighlight();
        updateTooltip(null, t.clientX, t.clientY);
        return;
      }
      lastPointerWeekRef.current = wi;
      setHoverWeek(wi);
      applyWeekHover(wi);
      requestAnimationFrame(() => {
        updateTooltip(wi, t.clientX, t.clientY);
      });
    },
    [
      applyWeekHover,
      flushHighlight,
      pointerToChartSpace,
      stickyTouchTooltip,
      updateTooltip,
    ],
  );

  const chartReady = !!model && model.artists.some((a) => a.name.length > 0);
  const showSkeleton = shouldLoad && loading && !chartReady;
  const showError = shouldLoad && !!error && !chartReady;
  const showEmpty = shouldLoad && !loading && !showError && data && !chartReady;

  return (
    <div
      ref={bindRoot}
      className={cn(
        "radial-heatmap-root relative flex w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden pb-1 [contain:paint]",
        "min-h-[min(280px,85vw)] sm:min-h-[300px]",
      )}
    >
      <h2 id="radial-heatmap-heading" className="sr-only">
        Yearly scrobbles (week-wise): weekly listening intensity for your
        leading artists over the past year
      </h2>
      {showError ? (
        <div className="flex flex-1 items-center justify-center px-3 py-6 text-sm text-red-400">
          {error}
        </div>
      ) : null}
      {showSkeleton ? (
        <div
          className="radial-heatmap-shimmer flex flex-1 flex-col justify-center gap-2.5 py-5 sm:gap-3"
          aria-hidden="true"
        >
          <div
            className="mx-auto h-[min(260px,72vw)] w-[min(260px,72vw)] max-w-full rounded-full sm:h-[280px] sm:w-[280px]"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--shimmer-from, #2a2a2a) 25%, var(--shimmer-to, #3a3a3a) 50%, var(--shimmer-from, #2a2a2a) 75%)",
              backgroundSize: "400px 100%",
              animation: "radialHeatmapShimmer 1.6s infinite linear",
            }}
          />
          <style>{`
                        @keyframes radialHeatmapShimmer {
                            0% { background-position: -200px 0; }
                            100% { background-position: 200px 0; }
                        }
                        [data-theme="light"] .radial-heatmap-shimmer {
                            --shimmer-from: #bfdbfe;
                            --shimmer-to: #93c5fd;
                        }
                    `}</style>
        </div>
      ) : null}
      {showEmpty ? (
        <div
          className={cn(
            "flex flex-1 items-center justify-center px-3 py-6 text-sm",
            isLightTheme ? "text-slate-600" : "text-neutral-400",
          )}
        >
          Not enough weekly listening history yet.
        </div>
      ) : null}
      {chartReady && model ? (
        <>
          <div className="relative w-full max-w-full shrink-0">
            <svg
              ref={svgRef}
              role="img"
              viewBox="0 0 680 680"
              width="100%"
              aria-labelledby="radial-heatmap-heading"
              shapeRendering="optimizeSpeed"
              className="block max-h-[min(78vw,520px)] touch-manipulation"
              onMouseMove={onSvgMouseMove}
              onMouseLeave={onSvgMouseLeave}
              onTouchMove={onSvgTouchMove}
              onTouchEnd={onSvgTouchComplete}
              onTouchCancel={onSvgTouchComplete}
            >
              <desc>
                Yearly scrobbles shown week by week: ten concentric rings for
                your most-played artists over the last year. Each ring is split
                into fifty-two weeks; stronger segments mean more plays that
                week for that artist.
              </desc>
              <g ref={chartGroupRef} transform={CHART_ROTATE_TRANSFORM}>
                {monthPts.map((m, i) => {
                  const x = CX + LABEL_R * Math.cos(m.a);
                  const y = CY + LABEL_R * Math.sin(m.a);
                  return (
                    <text
                      key={`${m.text}-${i}`}
                      x={x}
                      y={y}
                      transform={`rotate(${CHART_TEXT_UPRIGHT_DEG} ${x} ${y})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={cn(
                        "pointer-events-none font-semibold",
                        isLightTheme ? "fill-[#0a0f1a]" : "fill-neutral-200",
                      )}
                      style={{
                        fontSize: 12,
                        paintOrder: "stroke fill",
                        stroke: isLightTheme ? "#eff6ff" : "rgba(0,0,0,0.55)",
                        strokeWidth: isLightTheme ? 1.35 : 0.9,
                        strokeLinejoin: "round",
                      }}
                    >
                      {m.text}
                    </text>
                  );
                })}
                <circle
                  r={innermostInnerR() - 10}
                  cx={CX}
                  cy={CY}
                  className={cn(
                    "pointer-events-none",
                    isLightTheme
                      ? "fill-blue-50/95"
                      : "fill-neutral-900/10 dark:fill-neutral-100/10",
                  )}
                />
                {STATIC_PATHS.map((row, ring) =>
                  row.map((d, week) => (
                    <path
                      key={`${ring}-${week}`}
                      ref={(el) => setCellRef(ring, week, el)}
                      d={d}
                      fill={model.colors[ring] ?? model.colors[0]}
                      fillOpacity={
                        model.baseOpacities[ring]?.[week] ??
                        (isLightTheme ? 0.14 : 0.06)
                      }
                      stroke="none"
                    />
                  )),
                )}
                <text
                  x={CX}
                  y={CY - 7}
                  transform={`rotate(${CHART_TEXT_UPRIGHT_DEG} ${CX} ${CY - 7})`}
                  textAnchor="middle"
                  className={cn(
                    "pointer-events-none font-medium",
                    isLightTheme ? "fill-slate-900" : "fill-neutral-500",
                  )}
                  style={{ fontSize: 10 }}
                >
                  Yearly scrobbles
                </text>
                <text
                  x={CX}
                  y={CY + 10}
                  transform={`rotate(${CHART_TEXT_UPRIGHT_DEG} ${CX} ${CY + 10})`}
                  textAnchor="middle"
                  className={cn(
                    "pointer-events-none font-medium",
                    isLightTheme ? "fill-slate-900" : "fill-neutral-500",
                  )}
                  style={{ fontSize: 10 }}
                >
                  (week-wise)
                </text>
              </g>
            </svg>
            <div
              ref={tooltipRef}
              className={cn(
                "pointer-events-none absolute z-20 max-w-[min(100%-16px,18rem)] rounded-xl border p-3 text-xs shadow-lg transition-opacity",
                "border-white/20 bg-neutral-50 text-neutral-900 dark:border-white/20 dark:bg-[#171717] dark:text-neutral-100",
                "[html[data-theme=light]_&]:border-[#64748b]/30 [html[data-theme=light]_&]:!bg-white [html[data-theme=light]_&]:!text-slate-900 [html[data-theme=light]_&]:shadow-md",
              )}
              style={{ visibility: "hidden", opacity: 0 }}
            >
              <div ref={tooltipTitleRef} className="mb-1 font-semibold" />
              <ul
                ref={tooltipListRef}
                className="m-0 max-h-48 list-none space-y-1 overflow-auto p-0"
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-1">
            {model.artists.map((a, i) => {
              if (!a.name) return null;
              const pw = hoverWeek !== null ? (a.plays[hoverWeek] ?? 0) : -1;
              const legendDim = hoverWeek !== null && pw <= 0;
              return (
                <div
                  key={a.name}
                  className={cn(
                    "flex min-w-0 max-w-[11rem] items-center gap-2 text-xs transition-opacity duration-150",
                    legendDim ? "opacity-35" : "opacity-100",
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: model.colors[i] }}
                  />
                  <span
                    className={cn(
                      "min-w-0 truncate",
                      isLightTheme ? "text-neutral-900" : "text-neutral-100",
                    )}
                    title={a.name}
                  >
                    {a.name}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
});
