import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useIsLightTheme from "../hooks/useTheme";

interface ChartData {
  name?: string;
  scrobbles?: number;
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
}

const W = 300;
const H = 120;
const PAD = 6;

export default memo(function MusicCharts({ data }: { data: ChartData[] }) {
  const isLightTheme = useIsLightTheme();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismiss = (e: TouchEvent) => {
      const overlay = overlayRef.current;
      if (!overlay || !(e.target instanceof Node) || overlay.contains(e.target)) return;
      setTooltip(null);
    };
    document.addEventListener("touchstart", dismiss, true);
    return () => document.removeEventListener("touchstart", dismiss, true);
  }, []);

  if (!data || data.length === 0) {
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

  const values = data.map((d) => d.scrobbles || 0);
  const max = Math.max(1, ...values);
  const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;

  const points = values.map((v, i) => ({
    x: PAD + i * stepX,
    y: PAD + (H - PAD * 2) * (1 - v / max),
    v,
    name: data[i]?.name || "",
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${H - PAD} L${points[0].x},${H - PAD} Z`;

  const summary = points
    .map((p) => `${p.name}: ${p.v} scrobble${p.v === 1 ? "" : "s"}`)
    .join(", ");

  const showTooltip = useCallback(
    (e: React.SyntheticEvent<HTMLDivElement>, index: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const p = points[index];
      setTooltip({
        index,
        x: rect.left + rect.width / 2,
        y: rect.top + (p.y / H) * rect.height,
      });
    },
    [points],
  );

  const hideTooltip = useCallback(() => setTooltip(null), []);

  const active = tooltip ? points[tooltip.index] : null;

  return (
    <div className="h-full w-full touch-manipulation flex flex-col">
      <div className="relative w-full flex-1 min-h-0">
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
              vectorEffect="non-scaling-stroke"
            />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={tooltip?.index === i ? 4.5 : 3}
              fill={strokeColor}
              stroke={tooltip?.index === i ? "#fff" : "none"}
              strokeWidth={tooltip?.index === i ? 1.5 : 0}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div ref={overlayRef} className="absolute inset-0 flex">
          {points.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-full cursor-default"
              onMouseEnter={(e) => showTooltip(e, i)}
              onMouseMove={(e) => showTooltip(e, i)}
              onMouseLeave={hideTooltip}
              onTouchStart={(e) => showTooltip(e, i)}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between px-1 pt-1 shrink-0">
        {points.map((p, i) => (
          <span
            key={i}
            className="type-caption transition-colors"
            style={{ color: tooltip?.index === i ? strokeColor : textColor }}
          >
            {p.name}
          </span>
        ))}
      </div>
      {typeof document !== "undefined" &&
        active &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[10000] -translate-x-1/2 -translate-y-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1.5 shadow-lg whitespace-nowrap"
            style={{ left: tooltip!.x, top: tooltip!.y - 8 }}
          >
            <p className="type-caption font-medium text-[var(--text-primary)]">
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
