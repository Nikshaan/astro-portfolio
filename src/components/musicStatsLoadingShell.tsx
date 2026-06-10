export const MUSIC_STATS_SHELL =
  "relative box-border flex h-full min-h-0 w-full touch-manipulation flex-col gap-8 pb-4";

export const MUSIC_STATS_UPPER =
  "flex min-h-[272px] w-full flex-col gap-12 px-4 pt-4 pb-4 md:min-h-[248px] md:flex-row md:justify-around md:gap-4";

export function MusicStatsLoadingShell() {
  return (
    <div
      className={`music-stats-loading ${MUSIC_STATS_SHELL}`}
      aria-hidden="true"
    >
      <div
        className={`${MUSIC_STATS_UPPER} shrink-0 animate-pulse rounded-2xl`}
        style={{
          background:
            "linear-gradient(90deg, var(--shimmer-from-1, #1f1f1f) 25%, var(--shimmer-to-1, #2a2a2a) 50%, var(--shimmer-from-1, #1f1f1f) 75%)",
          backgroundSize: "800px 100%",
          animation: "musicShimmer 1.6s infinite linear",
        }}
      >
        <div className="flex w-full flex-col items-center gap-3">
          <div className="music-stats-skel-strong h-4 w-36 rounded" />
          {[120, 100, 110, 100].map((w, i) => (
            <div
              key={i}
              className="music-stats-skel-soft h-[1.125rem] rounded-md"
              style={{ width: w }}
            />
          ))}
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          <div className="music-stats-skel-strong h-4 w-44 rounded" />
          {[140, 120, 110, 130, 100].map((w, i) => (
            <div
              key={i}
              className="music-stats-skel-soft h-[1.125rem] rounded-md"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1" aria-hidden />
      <div className="flex h-[180px] w-full shrink-0 flex-col lg:h-[250px]">
        <div
          className="mx-auto mb-3 h-4 w-40 animate-pulse rounded"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--shimmer-from, #2a2a2a) 25%, var(--shimmer-to, #3a3a3a) 50%, var(--shimmer-from, #2a2a2a) 75%)",
            backgroundSize: "800px 100%",
            animation: "musicShimmer 1.6s infinite linear",
          }}
        />
        <div
          className="min-h-0 flex-1 animate-pulse rounded-xl"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--shimmer-from-2, #1a1a1a) 25%, var(--shimmer-to-2, #232323) 50%, var(--shimmer-from-2, #1a1a1a) 75%)",
            backgroundSize: "800px 100%",
            animation: "musicShimmer 1.6s 0.1s infinite linear",
          }}
        />
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
      <div
        className="max-h-full max-w-full shrink-0 animate-pulse rounded-full"
        style={{
          width: "min(100cqmin, 100%)",
          height: "min(100cqmin, 100%)",
          backgroundImage:
            "linear-gradient(90deg, var(--shimmer-from-2, #1a1a1a) 25%, var(--shimmer-to-2, #232323) 50%, var(--shimmer-from-2, #1a1a1a) 75%)",
          backgroundSize: "800px 100%",
          animation: "musicShimmer 1.6s infinite linear",
        }}
      />
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
          <div className="music-stats-skel-strong h-2 w-2 shrink-0 rounded-full" />
          <div
            className="music-stats-skel-soft h-[0.875rem] rounded-md"
            style={{ width: w }}
          />
        </div>
      ))}
    </div>
  );
}

export function YearlyScrobblesLoadingShell() {
  return (
    <div
      className="yearly-scrobbles-loading flex h-full min-h-0 w-full flex-col gap-3 pb-1"
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
