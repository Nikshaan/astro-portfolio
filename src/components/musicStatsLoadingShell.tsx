import {
  LineChartPlaceholder,
  Placeholder,
  RadialChartPlaceholder,
} from "./Placeholder";

export const MUSIC_STATS_SHELL =
  "relative box-border flex h-full min-h-0 w-full touch-manipulation flex-col gap-8 pb-4";

export const MUSIC_STATS_UPPER =
  "flex min-h-[272px] w-full flex-col gap-12 px-4 pt-4 pb-4 md:min-h-[248px] md:flex-row md:justify-around md:gap-4";

const STAT_ROWS = [
  "Play count",
  "Track count",
  "Artist count",
  "Album count",
] as const;

const ARTIST_NAME_WIDTHS = ["w-[11ch]", "w-[9ch]", "w-[13ch]", "w-[8ch]", "w-[10ch]"] as const;

export function MusicStatsLoadingShell() {
  return (
    <div className={MUSIC_STATS_SHELL} aria-hidden="true">
      <div
        className={`${MUSIC_STATS_UPPER} shrink-0 items-center rounded-2xl bg-[var(--surface-raised)]/40 md:items-start`}
      >
        <div className="w-full text-center">
          <p className="type-stats-label mb-3 text-center text-[var(--text-tertiary)]">
            Total music scrobbles
          </p>
          <div className="flex w-full flex-col items-center gap-2 type-body-sm">
            {STAT_ROWS.map((label) => (
              <p key={label}>
                <span className="font-bold text-[var(--text-tertiary)]">
                  {label}:
                </span>{" "}
                <Placeholder as="span" className="inline-block h-[1lh] w-[5ch] align-baseline" />
              </p>
            ))}
          </div>
        </div>
        <div className="w-full text-center">
          <p className="type-stats-label mb-3 text-center text-[var(--text-tertiary)]">
            Top artists — last 7 days
          </p>
          <div className="type-body-sm">
            {ARTIST_NAME_WIDTHS.map((nameWidth, i) => (
              <div
                key={i}
                className="mb-2 flex h-full w-full flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2"
              >
                <div className="flex items-center gap-2">
                  <Placeholder className={`h-[1lh] max-w-full ${nameWidth}`} />
                  <span className="flex items-center gap-1">
                    <span className="text-[var(--text-tertiary)]">plays:</span>
                    <Placeholder className="h-[1lh] w-[3ch]" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1" aria-hidden />
      <div className="flex h-[180px] w-full shrink-0 flex-col lg:h-[250px]">
        <p className="type-stats-label mb-3 text-center text-[var(--text-primary)]">
          Daily music scrobbles
        </p>
        <div className="min-h-0 w-full flex-1">
          <LineChartPlaceholder />
        </div>
      </div>
    </div>
  );
}

const YEARLY_LEGEND_NAME_WIDTHS = [
  "w-[10ch]",
  "w-[12ch]",
  "w-[8ch]",
  "w-[11ch]",
  "w-[9ch]",
  "w-[13ch]",
  "w-[7ch]",
  "w-[10ch]",
  "w-[12ch]",
  "w-[9ch]",
] as const;

export function YearlyScrobblesChartSkeletonInner() {
  return <RadialChartPlaceholder />;
}

export function YearlyScrobblesLegendSkeleton() {
  return (
    <div
      className="flex flex-wrap content-start justify-center gap-x-4 gap-y-2 px-1 type-caption"
      aria-hidden
    >
      {YEARLY_LEGEND_NAME_WIDTHS.map((width, i) => (
        <div key={i} className="flex min-w-0 max-w-[11rem] items-center gap-2">
          <Placeholder className="h-2 w-2 shrink-0 rounded-full" />
          <Placeholder className={`h-[1lh] max-w-full ${width}`} />
        </div>
      ))}
    </div>
  );
}

export function YearlyScrobblesLoadingShell() {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col gap-3 pb-1"
      aria-hidden
    >
      <div className="flex w-full flex-1 min-h-0 items-center justify-center overflow-hidden px-0 py-1 sm:p-2 lg:min-h-[250px] lg:p-3">
        <div className="relative mx-auto aspect-square w-[min(100%,24rem,72svh)] min-h-0 overflow-hidden [contain:paint] lg:h-full lg:w-auto lg:max-h-full lg:max-w-full">
          <YearlyScrobblesChartSkeletonInner />
        </div>
      </div>
      <div className="shrink-0">
        <YearlyScrobblesLegendSkeleton />
      </div>
    </div>
  );
}
