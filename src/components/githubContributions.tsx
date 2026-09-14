import { useEffect, useState, useRef, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  readGithubContributionsCache,
  subscribeGithubContributions,
  type ContributionDay,
  type ContributionLevel,
  type ContributionWeek,
  type GitHubAPIResponse,
} from "../utils/githubContributionsClient";
import styles from "./githubContributions.module.css";

const LEVEL_BY_ENUM: Record<ContributionLevel, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function levelFor(day: ContributionDay): number {
  if (day.contributionLevel) return LEVEL_BY_ENUM[day.contributionLevel];
  const count = day.contributionCount;
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

function formatContributionDayLabel(day: ContributionDay): string {
  const date = new Date(`${day.date}T12:00:00`);
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const count = day.contributionCount;
  if (count === 0) {
    return `No contributions on ${formattedDate}`;
  }

  return `${count} contribution${count === 1 ? "" : "s"} on ${formattedDate}`;
}

interface ContributionDayCellProps {
  day: ContributionDay;
  level: number;
  onHover: (day: ContributionDay, element: HTMLDivElement) => void;
  onLeave: () => void;
}

const ContributionDayCell = memo(function ContributionDayCell({
  day,
  level,
  onHover,
  onLeave,
}: ContributionDayCellProps) {
  return (
    <div
      className={`${styles.day} ${styles[`contributionLevel${level}`]}`}
      onMouseEnter={(event) => onHover(day, event.currentTarget)}
      onMouseLeave={onLeave}
    />
  );
});

interface GithubContributionsProps {
  initialData?: GitHubAPIResponse;
}

function HeatmapSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonSubtitle} />
      </div>
      <div className={styles.skeletonGraph}>
        <svg
          className={styles.skeletonSvg}
          viewBox="0 0 636 82"
          width="100%"
          height="82"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="contrib-skel-pat" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" rx="2" fill="var(--surface-raised)" stroke="var(--border-subtle)" strokeWidth="1" />
            </pattern>
            <linearGradient id="contrib-skel-shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="var(--shimmer-to-1)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#contrib-skel-pat)" />
          <rect className={styles.skeletonShimmerOverlay} width="100%" height="100%" fill="url(#contrib-skel-shimmer)" />
        </svg>
      </div>
    </div>
  );
}

export default memo(function GithubContributions({
  initialData,
}: GithubContributionsProps) {
  const initialPayload = initialData || readGithubContributionsCache();
  const initialCalendar =
    initialPayload?.data?.user?.contributionsCollection?.contributionCalendar;

  const [weeks, setWeeks] = useState<ContributionWeek[]>(
    initialCalendar?.weeks || [],
  );
  const [totalContributions, setTotalContributions] = useState(
    initialCalendar?.totalContributions || 0,
  );
  const [loading, setLoading] = useState(!initialCalendar);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const graphRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const positionTooltip = useCallback(
    (day: ContributionDay, element: HTMLDivElement) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      tooltip.textContent = formatContributionDayLabel(day);
      setTooltipVisible(true);

      const place = () => {
        const tip = tooltipRef.current;
        if (!tip) return;
        const rect = element.getBoundingClientRect();
        const pad = 8;
        const tooltipWidth = tip.offsetWidth || 220;
        const x = Math.min(
          Math.max(pad + tooltipWidth / 2, rect.left + rect.width / 2),
          window.innerWidth - pad - tooltipWidth / 2,
        );
        const y = rect.top - 8;
        tip.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(place);
      });
    },
    [],
  );

  const hideTooltip = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const hideOnScroll = () => hideTooltip();
    graph.addEventListener("scroll", hideOnScroll, { passive: true });
    window.addEventListener("scroll", hideOnScroll, { passive: true });

    return () => {
      graph.removeEventListener("scroll", hideOnScroll);
      window.removeEventListener("scroll", hideOnScroll);
    };
  }, [hideTooltip, weeks, loading]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.scrollLeft = graphRef.current.scrollWidth;
    }
  }, [weeks, loading]);

  useEffect(() => {
    const applyData = (data: GitHubAPIResponse) => {
      if (data.errors) {
        setError("Failed to load contributions");
      } else if (
        data.data?.user?.contributionsCollection?.contributionCalendar
      ) {
        setWeeks(
          data.data.user.contributionsCollection.contributionCalendar.weeks,
        );
        setTotalContributions(
          data.data.user.contributionsCollection.contributionCalendar
            .totalContributions,
        );
        setError(null);
      } else {
        setError("Unexpected API response");
      }
    };

    const hasInitial = Boolean(initialCalendar);

    return subscribeGithubContributions((snap) => {
      if (snap.data) {
        applyData(snap.data);
        setLoading(false);
        return;
      }
      if (snap.error && !hasInitial) {
        setError("Failed to load contributions");
        setLoading(false);
      } else if (!hasInitial) {
        setLoading(snap.loading);
      }
    });
  }, [initialCalendar, initialData]);

  const summaryLabel =
    totalContributions > 0
      ? `GitHub contribution graph: ${totalContributions} contributions in the last 12 months`
      : "GitHub contribution graph";

  return (
    <div
      data-bento-shell=""
      className={cn(
        "bento-reveal relative p-5 rounded-[var(--radius-card)] border overflow-hidden h-full w-full flex flex-col justify-between",
        "bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-primary)]",
      )}
    >
        {loading ? (
          <HeatmapSkeleton />
        ) : error ? (
          <>
            <div className={styles.header}>
              <h2 className="type-panel-title">GitHub Contributions (Last 12 Months)</h2>
            </div>
            <p className="type-body-sm text-[var(--text-tertiary)] text-center py-4">{error}</p>
          </>
        ) : weeks.length > 0 ? (
          <>
            <div className={styles.header}>
              <h2 className="type-panel-title">GitHub Contributions (Last 12 Months)</h2>
              {totalContributions > 0 && (
                <span className={styles.total}>
                  {totalContributions} contributions in the last year
                </span>
              )}
            </div>
            <div
              className={styles.graph}
              ref={graphRef}
              role="img"
              aria-label={summaryLabel}
            >
              {weeks.map((week: ContributionWeek, weekIndex: number) => (
                <div key={weekIndex} className={styles.week}>
                  {week.contributionDays.map(
                    (day: ContributionDay, dayIndex: number) => (
                      <ContributionDayCell
                        key={dayIndex}
                        day={day}
                        level={levelFor(day)}
                        onHover={positionTooltip}
                        onLeave={hideTooltip}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <h2 className="type-panel-title">GitHub Contributions (Last 12 Months)</h2>
            </div>
            <p className="type-body-sm text-[var(--text-tertiary)] text-center py-4">
              No contribution data available
            </p>
          </>
        )}
        {mounted &&
          createPortal(
            <div
              ref={tooltipRef}
              className={styles.dayTooltip}
              data-visible={tooltipVisible ? "true" : undefined}
              role="tooltip"
              aria-hidden={!tooltipVisible}
            />,
            document.body,
          )}
    </div>
  );
});
