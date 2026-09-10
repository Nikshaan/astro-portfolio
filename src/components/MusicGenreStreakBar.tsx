import { memo, useMemo } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useMusicStatsLive } from "../hooks/useMusicStatsLive";
import type { GenreEntry, MusicStatsData } from "../utils/musicStatsClient";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function sliceGenrePayload(full: MusicStatsData) {
  return {
    listeningStreak: full.listeningStreak,
    genreData: full.genreData,
  };
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const GENRE_PALETTE = [
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
];

export default memo(function MusicGenreStreakBar() {
  const { data: fullData, loading } = useMusicStatsLive();

  const data = useMemo(
    () => (fullData ? sliceGenrePayload(fullData) : null),
    [fullData],
  );

  const streak = data?.listeningStreak ?? 0;
  const genreData = data?.genreData ?? [];
  const total = genreData.reduce((s, d) => s + d.count, 0);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 md:px-6 md:py-3",
        "justify-between sm:justify-start",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        {loading ? (
          <div
            className="h-3 w-full max-w-md rounded"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--shimmer-from) 25%, var(--shimmer-to) 50%, var(--shimmer-from) 75%)",
              backgroundSize: "400px 100%",
              animation: "genreStreakShimmer 1.6s infinite linear",
            }}
            aria-hidden="true"
          />
        ) : genreData.length > 0 ? (
          genreData.map((d: GenreEntry, i: number) => {
            const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
            return (
              <span
                key={d.genre}
                className="inline-flex min-w-0 max-w-full items-baseline gap-1.5 type-body-sm text-[var(--text-primary)]"
              >
                <span
                  className="shrink-0 text-[0.65rem] leading-none opacity-90"
                  style={{ color: GENRE_PALETTE[i % GENRE_PALETTE.length] }}
                  aria-hidden="true"
                >
                  ●
                </span>
                <span className="min-w-0 truncate">{capitalise(d.genre)}</span>
                <span className="shrink-0 tabular-nums text-[var(--text-secondary)]">
                  — {pct}%
                </span>
              </span>
            );
          })
        ) : (
          <span className="type-body-sm text-[var(--text-tertiary)]">
            Not enough genre data yet
          </span>
        )}
      </div>
      <div
        className="hidden h-[1.125rem] w-px shrink-0 self-center bg-[var(--border-subtle)] sm:block"
        aria-hidden="true"
      />
      <div className="flex w-full shrink-0 items-center gap-2 border-t border-[var(--border-subtle)] pt-2 sm:w-auto sm:border-t-0 sm:pt-0">
        <span
          className="type-body-sm not-italic text-[var(--text-primary)]"
          aria-hidden="true"
        >
          ♪
        </span>
        {loading ? (
          <div
            className="h-3 w-32 rounded"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--shimmer-from) 25%, var(--shimmer-to) 50%, var(--shimmer-from) 75%)",
              backgroundSize: "400px 100%",
              animation: "genreStreakShimmer 1.6s infinite linear",
            }}
            aria-hidden="true"
          />
        ) : streak > 0 ? (
          <span className="type-body-sm font-bold text-[var(--text-primary)]">
            {streak} day listening streak
          </span>
        ) : (
          <span className="type-caption text-[var(--text-tertiary)]">No streak yet</span>
        )}
      </div>
    </div>
  );
});
