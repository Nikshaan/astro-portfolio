import type { CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type PlaceholderProps = {
  className?: string;
  style?: CSSProperties;
  as?: "div" | "span";
};

export function Placeholder({
  className,
  style,
  as: Comp = "div",
}: PlaceholderProps) {
  return (
    <Comp
      className={cn("skel rounded-[var(--radius-control)]", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

const GENRE_CHIP_SLOTS = [
  { name: "w-[7ch]", show: "inline-flex" },
  { name: "w-[9ch]", show: "inline-flex" },
  { name: "w-[8ch]", show: "hidden sm:inline-flex" },
  { name: "w-[6ch]", show: "hidden md:inline-flex" },
  { name: "w-[10ch]", show: "hidden lg:inline-flex" },
] as const;

export function GenreStreakPlaceholder() {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 md:px-6 md:py-3",
        "justify-between sm:justify-start",
      )}
      aria-hidden="true"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 type-body-sm">
        {GENRE_CHIP_SLOTS.map((chip, i) => (
          <span
            key={i}
            className={cn(
              chip.show,
              "min-w-0 max-w-full items-baseline gap-1.5",
            )}
          >
            <Placeholder className="inline-block h-[0.65rem] w-[0.65rem] shrink-0 translate-y-[-1px] rounded-full" />
            <Placeholder className={cn("inline-block h-[1lh]", chip.name)} />
            <Placeholder className="inline-block h-[1lh] w-[4.5ch]" />
          </span>
        ))}
      </div>
      <div
        className="hidden h-[1.125rem] w-px shrink-0 self-center bg-[var(--border-subtle)] sm:block"
      />
      <div className="flex w-full shrink-0 items-center gap-2 border-t border-[var(--border-subtle)] pt-2 sm:w-auto sm:border-t-0 sm:pt-0 type-body-sm">
        <span
          className="not-italic text-[var(--text-primary)]"
          aria-hidden="true"
        >
          ♪
        </span>
        <Placeholder className="h-[1lh] w-[22ch] max-w-full font-bold" />
      </div>
    </div>
  );
}

const INDIA_SILHOUETTE =
  "M128 97L127 99L125 93L129 92L132 87L119 86L118 81L110 77L111 79L108 81L113 86L108 89L112 91L114 105L112 104L109 107L108 103L107 106L102 108L103 112L99 116L92 119L89 124L77 133L78 135L66 141L65 169L61 170L60 175L62 175L57 176L54 181L49 180L30 137L26 117L28 112L25 105L28 103L26 102L23 109L17 112L6 103L13 101L16 97L9 100L2 95L6 91L18 91L16 83L9 76L14 69L16 71L22 70L37 50L36 45L41 43L37 39L31 38L30 28L34 25L26 20L26 17L29 14L41 12L52 22L60 19L67 21L66 27L62 32L60 31L63 40L61 42L57 41L59 49L61 48L71 55L67 58L67 65L80 72L88 72L93 77L108 79L108 72L111 68L114 76L130 76L127 70L133 70L136 65L140 65L143 61L147 63L153 61L151 63L154 64L152 67L158 68L155 71L157 74L152 73L146 78L141 94L136 93L135 104L132 104L131 94L128 97Z";

export function IndiaMapPlaceholder({
  className,
  framed = false,
  label = "Travels",
}: {
  className?: string;
  framed?: boolean;
  label?: string | null;
}) {
  const body = (
    <>
      {label ? (
        <span className="absolute top-4 left-4 z-10 type-bento-eyebrow text-[var(--text-tertiary)]">
          {label}
        </span>
      ) : null}
      <svg
        viewBox="0 0 160 200"
        className="pointer-events-none absolute inset-0 box-border h-full w-full p-4 skel-pulse"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path
          d={INDIA_SILHOUETTE}
          fill="var(--shimmer-from)"
          stroke="var(--border-strong)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );

  if (!framed) {
    return <div className={cn("absolute inset-0", className)}>{body}</div>;
  }

  return (
    <div
      className={cn(
        "relative h-full min-h-[184px] w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-card)]",
        className,
      )}
    >
      {body}
    </div>
  );
}

const LINE_CHART_W = 300;
const LINE_CHART_H = 120;
const LINE_CHART_PAD_X = 16;
const LINE_CHART_PAD_Y = 14;
const LINE_CHART_INNER_H = LINE_CHART_H - LINE_CHART_PAD_Y * 2;
const LINE_CHART_X = [16, 63, 110, 157, 204, 251, 284];
const LINE_CHART_Y_TICKS = [0, 0.5, 1];
const LINE_CHART_D =
  "M16 78C48 58 80 92 112 64C144 38 176 72 208 50C240 32 268 60 284 46";
const LINE_CHART_AREA = `${LINE_CHART_D}L284 106L16 106Z`;

export function LineChartPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col" aria-hidden="true">
      <div className="flex min-h-0 flex-1 gap-1.5">
        <div className="relative w-6 shrink-0 type-caption sm:w-7">
          {LINE_CHART_Y_TICKS.map((f) => (
            <Placeholder
              key={f}
              className="absolute right-0 h-[1lh] w-[2ch]"
              style={{
                top: `${((LINE_CHART_PAD_Y + f * LINE_CHART_INNER_H) / LINE_CHART_H) * 100}%`,
                transform: "translateY(-50%)",
              }}
            />
          ))}
        </div>
        <svg
          viewBox={`0 0 ${LINE_CHART_W} ${LINE_CHART_H}`}
          preserveAspectRatio="none"
          className="h-full min-h-0 w-full flex-1 overflow-visible skel-pulse"
        >
          {LINE_CHART_Y_TICKS.map((f) => {
            const y = LINE_CHART_PAD_Y + f * LINE_CHART_INNER_H;
            return (
              <line
                key={f}
                x1={LINE_CHART_PAD_X}
                y1={y}
                x2={LINE_CHART_W - LINE_CHART_PAD_X}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          <path d={LINE_CHART_AREA} fill="var(--shimmer-from)" />
          <path
            d={LINE_CHART_D}
            fill="none"
            stroke="var(--shimmer-to)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="flex shrink-0 gap-1.5 pt-1.5">
        <div className="w-6 shrink-0 sm:w-7" />
        <div className="relative h-5 flex-1 type-caption">
          {LINE_CHART_X.map((x) => (
            <Placeholder
              key={x}
              className="absolute h-[1lh] w-[2.2ch] -translate-x-1/2"
              style={{ left: `${(x / LINE_CHART_W) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const RADIAL_CX = 340;
const RADIAL_CY = 340;
const RADIAL_R_OUTER = 308;
const RADIAL_RING_W = 21;
const RADIAL_RING_GAP = 3;
const RADIAL_N_WEEKS = 52;
const RADIAL_N_RINGS = 10;
const RADIAL_GAP_DEG = 1.3;
const RADIAL_SWEEP_DEG =
  (360 - RADIAL_N_WEEKS * RADIAL_GAP_DEG) / RADIAL_N_WEEKS;
const RADIAL_SWEEP_RAD = (RADIAL_SWEEP_DEG * Math.PI) / 180;
const RADIAL_GAP_RAD = (RADIAL_GAP_DEG * Math.PI) / 180;
const RADIAL_STRIDE_RAD = RADIAL_SWEEP_RAD + RADIAL_GAP_RAD;

function svgCoord(n: number): string {
  return n.toFixed(3);
}

const RADIAL_RING_RADII = Array.from({ length: RADIAL_N_RINGS }, (_, ring) => {
  const ro = RADIAL_R_OUTER - ring * (RADIAL_RING_W + RADIAL_RING_GAP);
  return svgCoord(ro - RADIAL_RING_W / 2);
});

const RADIAL_INNER_R =
  RADIAL_R_OUTER -
  (RADIAL_N_RINGS - 1) * (RADIAL_RING_W + RADIAL_RING_GAP) -
  RADIAL_RING_W;

const RADIAL_GAP_LINES = Array.from({ length: RADIAL_N_WEEKS }, (_, w) => {
  const a =
    -Math.PI / 2 + w * RADIAL_STRIDE_RAD + RADIAL_SWEEP_RAD + RADIAL_GAP_RAD / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {
    x1: svgCoord(RADIAL_CX + RADIAL_INNER_R * c),
    y1: svgCoord(RADIAL_CY + RADIAL_INNER_R * s),
    x2: svgCoord(RADIAL_CX + RADIAL_R_OUTER * c),
    y2: svgCoord(RADIAL_CY + RADIAL_R_OUTER * s),
  };
});

export function RadialChartPlaceholder() {
  return (
    <svg
      viewBox="0 0 680 680"
      className="block h-full w-full skel-pulse"
      aria-hidden="true"
    >
      <circle
        cx={RADIAL_CX}
        cy={RADIAL_CY}
        r={RADIAL_INNER_R - 10}
        fill="var(--surface-raised)"
      />
      {RADIAL_RING_RADII.map((r) => (
        <circle
          key={r}
          cx={RADIAL_CX}
          cy={RADIAL_CY}
          r={r}
          fill="none"
          stroke="var(--shimmer-from)"
          strokeWidth={RADIAL_RING_W}
        />
      ))}
      {RADIAL_GAP_LINES.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="var(--surface-card)"
          strokeWidth="2.4"
        />
      ))}
    </svg>
  );
}
