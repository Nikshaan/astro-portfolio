import { useEffect, useState, useRef, memo, useCallback } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  fetchGithubContributionsData,
  readGithubContributionsCache,
  type ContributionDay,
  type ContributionWeek,
  type GitHubAPIResponse,
} from "../utils/githubContributionsClient";
import styles from "./githubContributions.module.css";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  const label = formatContributionDayLabel(day);

  return (
    <div
      className={`${styles.day} ${styles[`contributionLevel${level}`]}`}
      aria-label={label}
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
        {Array.from({ length: 53 }).map((_, wi) => (
          <div key={wi} className={styles.skeletonWeek}>
            {Array.from({ length: 7 }).map((_, di) => (
              <div key={di} className={styles.skeletonDay} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(function GithubContributions({
  initialData,
}: GithubContributionsProps) {
  const [weeks, setWeeks] = useState<ContributionWeek[]>(
    initialData?.data?.user?.contributionsCollection?.contributionCalendar
      ?.weeks || [],
  );
  const [totalContributions, setTotalContributions] = useState(
    initialData?.data?.user?.contributionsCollection?.contributionCalendar
      ?.totalContributions || 0,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const graphRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const positionTooltip = useCallback(
    (day: ContributionDay, element: HTMLDivElement) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      tooltip.textContent = formatContributionDayLabel(day);

      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top - 8;

      tooltip.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      tooltip.dataset.visible = "true";
    },
    [],
  );

  const hideTooltip = useCallback(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    delete tooltip.dataset.visible;
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

    const fetchContributions = async (force = false) => {
      try {
        const data = await fetchGithubContributionsData(
          force ? { force: true } : undefined,
        );
        applyData(data);
      } catch {
        setError("Failed to load contributions");
      } finally {
        setLoading(false);
      }
    };

    const cached = readGithubContributionsCache();
    if (cached) {
      applyData(cached);
      setLoading(false);
    }

    void fetchContributions();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchContributions(true);
      }
    }, 60 * 60 * 1000);

    const onVis = () => {
      if (document.visibilityState === "visible") void fetchContributions(true);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [initialData]);

  const summaryLabel =
    totalContributions > 0
      ? `GitHub contribution graph: ${totalContributions} contributions in the last 12 months`
      : "GitHub contribution graph";

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        data-bento-shell=""
        className={cn(
          "relative p-5 rounded-[var(--radius-card)] border overflow-hidden h-full w-full flex flex-col justify-between",
          "bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-primary)]",
        )}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } }}
        viewport={{ once: true, amount: 0.2, margin: "80px 0px -10% 0px" }}
      >
        {loading ? (
          <HeatmapSkeleton />
        ) : error ? (
          <>
            <div className={styles.header}>
              <h3 className="type-panel-title">GitHub Contributions (Last 12 Months)</h3>
            </div>
            <p className="type-body-sm text-[var(--text-tertiary)] text-center py-4">{error}</p>
          </>
        ) : weeks.length > 0 ? (
          <>
            <div className={styles.header}>
              <h3 className="type-panel-title">GitHub Contributions (Last 12 Months)</h3>
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
                    (day: ContributionDay, dayIndex: number) => {
                      const count = day.contributionCount;
                      let level = 0;
                      if (count > 0 && count <= 3) level = 1;
                      else if (count > 3 && count <= 6) level = 2;
                      else if (count > 6 && count <= 9) level = 3;
                      else if (count > 9) level = 4;

                      return (
                        <ContributionDayCell
                          key={dayIndex}
                          day={day}
                          level={level}
                          onHover={positionTooltip}
                          onLeave={hideTooltip}
                        />
                      );
                    },
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <h3 className="type-panel-title">GitHub Contributions (Last 12 Months)</h3>
            </div>
            <p className="type-body-sm text-[var(--text-tertiary)] text-center py-4">
              No contribution data available
            </p>
          </>
        )}
        <div
          ref={tooltipRef}
          className={styles.dayTooltip}
          role="tooltip"
          aria-hidden="true"
        />
      </m.div>
    </LazyMotion>
  );
});
