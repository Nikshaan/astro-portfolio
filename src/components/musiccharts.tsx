import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useIsLightTheme from "../hooks/useTheme";

interface ChartData {
  name?: string;
  scrobbles?: number;
}

interface Point {
  x: number;
  y: number;
  v: number;
  name: string;
}

interface Placement {
  left: number;
  top: number;
  arrowLeft: number;
  above: boolean;
}

const W = 300;
const H = 120;
const PAD = 6;
const VIEWPORT_MARGIN = 10;
const TOOLTIP_GAP = 10;

function smoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default memo(function MusicCharts({ data }: { data: ChartData[] }) {
  const isLightTheme = useIsLightTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const hasData = !!data && data.length > 0;

  const { points, maxValue } = useMemo(() => {
    if (!hasData) return { points: [] as Point[], maxValue: 0 };
    const values = data.map((d) => d.scrobbles || 0);
    const max = Math.max(1, ...values);
    const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
    const pts = values.map((v, i) => ({
      x: PAD + i * stepX,
      y: PAD + (H - PAD * 2) * (1 - v / max),
      v,
      name: data[i]?.name || "",
    }));
    return { points: pts, maxValue: max };
  }, [data, hasData]);

  useEffect(() => {
    const dismiss = (e: TouchEvent) => {
      const container = containerRef.current;
      if (!container || !(e.target instanceof Node) || container.contains(e.target)) return;
      setHoverIndex(null);
    };
    document.addEventListener("touchstart", dismiss, true);
    return () => document.removeEventListener("touchstart", dismiss, true);
  }, []);

  useEffect(() => {
    setHoverIndex(null);
  }, [points]);

  useLayoutEffect(() => {
    if (hoverIndex === null || !containerRef.current || !tooltipRef.current) {
      setPlacement(null);
      return;
    }
    const p = points[hoverIndex];
    if (!p) {
      setPlacement(null);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const px = containerRect.left + (p.x / W) * containerRect.width;
    const py = containerRect.top + (p.y / H) * containerRect.height;
    const ttRect = tooltipRef.current.getBoundingClientRect();

    const above = py - ttRect.height - TOOLTIP_GAP >= VIEWPORT_MARGIN;
    const top = above ? py - ttRect.height - TOOLTIP_GAP : py + TOOLTIP_GAP;

    const minLeft = VIEWPORT_MARGIN;
    const maxLeft = Math.max(minLeft, window.innerWidth - ttRect.width - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(px - ttRect.width / 2, minLeft), maxLeft);
    const arrowLeft = Math.min(Math.max(px - left, 10), Math.max(ttRect.width - 10, 10));

    setPlacement({ left, top, arrowLeft, above });
  }, [hoverIndex, points]);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container || points.length === 0) return;
      const rect = container.getBoundingClientRect();
      const frac = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      const idx = Math.round(Math.min(Math.max(frac, 0), 1) * (points.length - 1));
      setHoverIndex(idx);
    },
    [points],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => updateFromClientX(e.clientX),
    [updateFromClientX],
  );
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      if (touch) updateFromClientX(touch.clientX);
    },
    [updateFromClientX],
  );
  const hideTooltip = useCallback(() => setHoverIndex(null), []);

  if (!hasData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[var(--text-tertiary)] type-body-sm">Chart data loading...</div>
      </div>
    );
  }

  const strokeColor = isLightTheme ? "#6D4AFF" : "#A78BFA";
  const fillColor = isLightTheme
    ? "rgba(109, 74, 255, 0.14)"
    : "rgba(167, 139, 250, 0.16)";
  const gridColor = isLightTheme ? "#E7E5E4" : "#262626";
  const textColor = isLightTheme ? "#57534E" : "#A3A3A3";

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L${points[points.length - 1].x},${H - PAD} L${points[0].x},${H - PAD} Z`;

  const summary = points
    .map((p) => `${p.name}: ${p.v} scrobble${p.v === 1 ? "" : "s"}`)
    .join(", ");

  const active = hoverIndex !== null ? points[hoverIndex] : null;
  const yAxisTicks = [
    { f: 0, value: maxValue },
    { f: 0.5, value: Math.round(maxValue / 2) },
    { f: 1, value: 0 },
  ];

  return (
    <div className="h-full w-full touch-manipulation flex flex-col">
      <div className="flex flex-1 min-h-0 gap-1.5">
        <div className="relative w-6 shrink-0 sm:w-7">
          {yAxisTicks.map((tick) => (
            <span
              key={tick.f}
              className="type-caption absolute right-0 tabular-nums"
              style={{
                top: `${tick.f * 100}%`,
                color: textColor,
                transform: tick.f === 0 ? "none" : tick.f === 1 ? "translateY(-100%)" : "translateY(-50%)",
              }}
            >
              {tick.value}
            </span>
          ))}
        </div>
        <div ref={containerRef} className="relative w-full flex-1 min-h-0">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="w-full h-full"
            role="img"
            aria-label={`Daily scrobbles: ${summary}`}
          >
            {[0, 0.5, 1].map((f) => (
              <line
                key={`h${f}`}
                x1={PAD}
                y1={PAD + f * (H - PAD * 2)}
                x2={W - PAD}
                y2={PAD + f * (H - PAD * 2)}
                stroke={gridColor}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {points.map((p, i) => (
              <line
                key={`v${i}`}
                x1={p.x}
                y1={PAD}
                x2={p.x}
                y2={H - PAD}
                stroke={gridColor}
                strokeWidth={1}
                opacity={0.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={areaPath} fill={fillColor} stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {active && (
              <line
                x1={active.x}
                y1={PAD}
                x2={active.x}
                y2={H - PAD}
                stroke={strokeColor}
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0.7}
                vectorEffect="non-scaling-stroke"
                style={{ transition: "opacity 120ms ease" }}
              />
            )}
          </svg>
          {points.map((p, i) => (
            <div
              key={i}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${(p.x / W) * 100}%`,
                top: `${(p.y / H) * 100}%`,
                width: hoverIndex === i ? 10 : 6,
                height: hoverIndex === i ? 10 : 6,
                backgroundColor: strokeColor,
                border: hoverIndex === i ? "1.5px solid #fff" : "none",
                boxShadow: hoverIndex === i ? "0 1px 4px rgba(0,0,0,0.25)" : "none",
                transform: "translate(-50%, -50%)",
                transition: "width 120ms ease, height 120ms ease, box-shadow 120ms ease",
              }}
            />
          ))}
          <div
            className="absolute inset-0 cursor-default"
            onMouseMove={handleMouseMove}
            onMouseLeave={hideTooltip}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={hideTooltip}
          />
        </div>
      </div>
      <div className="flex gap-1.5 pt-1 shrink-0">
        <div className="w-6 shrink-0 sm:w-7" aria-hidden />
        <div className="flex flex-1 justify-between px-1">
          {points.map((p, i) => (
            <span
              key={i}
              className="type-caption transition-colors"
              style={{ color: hoverIndex === i ? strokeColor : textColor }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
      {typeof document !== "undefined" &&
        active &&
        createPortal(
          <div
            ref={tooltipRef}
            className="pointer-events-none fixed z-[10000] rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1.5 shadow-lg whitespace-nowrap"
            style={{
              left: placement?.left ?? -9999,
              top: placement?.top ?? -9999,
              opacity: placement ? 1 : 0,
              transition: "opacity 100ms ease",
            }}
          >
            {placement && (
              <div
                className="absolute h-2 w-2 rotate-45 border-[var(--border-subtle)] bg-[var(--surface-raised)]"
                style={{
                  left: placement.arrowLeft - 4,
                  ...(placement.above
                    ? { bottom: -5, borderRight: "1px solid", borderBottom: "1px solid" }
                    : { top: -5, borderLeft: "1px solid", borderTop: "1px solid" }),
                }}
              />
            )}
            <p className="type-caption font-bold text-[var(--text-primary)]">
              {active.name}
            </p>
            <p className="type-caption text-[var(--text-secondary)]">
              {active.v} scrobble{active.v === 1 ? "" : "s"}
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
});
