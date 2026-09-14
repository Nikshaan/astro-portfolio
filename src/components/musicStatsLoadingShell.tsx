import { Placeholder } from "./Placeholder";

export const MUSIC_STATS_SHELL =
  "relative box-border flex h-full min-h-0 w-full touch-manipulation flex-col gap-8 pb-4";

export const MUSIC_STATS_UPPER =
  "flex min-h-[272px] w-full flex-col gap-12 px-4 pt-4 pb-4 md:min-h-[248px] md:flex-row md:justify-around md:gap-4";

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
          <div className="flex w-full flex-col items-center gap-2">
            <Placeholder className="h-[1.125rem] w-32 max-w-full" />
            <Placeholder className="h-[1.125rem] w-28 max-w-full" />
            <Placeholder className="h-[1.125rem] w-[7.5rem] max-w-full" />
            <Placeholder className="h-[1.125rem] w-24 max-w-full" />
          </div>
        </div>
        <div className="w-full text-center">
          <p className="type-stats-label mb-3 text-center text-[var(--text-tertiary)]">
            Top artists — last 7 days
          </p>
          <div className="flex w-full flex-col items-center gap-2">
            <Placeholder className="h-[1.125rem] w-36 max-w-full" />
            <Placeholder className="h-[1.125rem] w-32 max-w-full" />
            <Placeholder className="h-[1.125rem] w-28 max-w-full" />
            <Placeholder className="h-[1.125rem] w-32 max-w-full" />
            <Placeholder className="h-[1.125rem] w-24 max-w-full" />
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1" aria-hidden />
      <div className="flex h-[180px] w-full shrink-0 flex-col lg:h-[250px]">
        <p className="type-stats-label mb-3 text-center text-[var(--text-primary)]">
          Daily music scrobbles
        </p>
        <Placeholder className="min-h-0 w-full flex-1 rounded-xl" />
      </div>
    </div>
  );
}

const YEARLY_LEGEND_BAR_WIDTHS = [100, 120, 90, 110, 95, 105, 88, 115, 102, 98];

export function YearlyScrobblesChartSkeletonInner() {
  return (
    <div
      className="box-border flex h-full min-h-0 w-full items-center justify-center"
      aria-hidden
    >
      <Placeholder className="aspect-square h-full max-h-full w-auto rounded-full" />
    </div>
  );
}

export function YearlyScrobblesLegendSkeleton() {
  return (
    <div
      className="flex flex-wrap content-start justify-center gap-x-4 gap-y-2 px-1"
      aria-hidden
    >
      {YEARLY_LEGEND_BAR_WIDTHS.map((w, i) => (
        <div key={i} className="flex min-w-0 max-w-[11rem] items-center gap-2">
          <Placeholder className="h-2 w-2 shrink-0 rounded-full" />
          <Placeholder className="h-[0.875rem]" style={{ width: `${w / 16}rem` }} />
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
      <div className="flex w-full flex-1 min-h-[180px] items-center justify-center overflow-hidden p-3 lg:min-h-[250px]">
        <div className="relative aspect-square h-full max-h-full w-auto max-w-full min-h-0 overflow-hidden [container-type:size] [contain:paint]">
          <YearlyScrobblesChartSkeletonInner />
        </div>
      </div>
      <div className="shrink-0">
        <YearlyScrobblesLegendSkeleton />
      </div>
    </div>
  );
}
