import { useEffect, useState, useRef, memo } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  fetchGithubContributionsData,
  type ContributionDay,
  type ContributionWeek,
  type GitHubAPIResponse,
} from "../utils/githubContributionsClient";
import styles from "./githubContributions.module.css";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.scrollLeft = graphRef.current.scrollWidth;
    }
  }, [weeks, loading]);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const data = await fetchGithubContributionsData();

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
        } else {
          setError("Unexpected API response");
        }
      } catch {
        setError("Failed to load contributions");
      } finally {
        setLoading(false);
      }
    };

    if (!initialData) {
      fetchContributions();
    }

    const interval = setInterval(fetchContributions, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [initialData]);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={cn(
          "relative p-6 rounded-3xl border overflow-hidden w-full flex flex-col justify-between group me-card-hover",
          "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 shadow-sm",
          "[html[data-theme=light]_&]:!bg-[#dbeafe]",
        )}
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          },
        }}
      >
        {loading ? (
          <HeatmapSkeleton />
        ) : error ? (
          <>
            <div className={styles.header}>
              <h3 className={cn("type-panel-title text-neutral-900 dark:text-neutral-100")}>
                GitHub Contributions (Last 12 Months)
              </h3>
            </div>
            <p className="type-body-sm text-neutral-400 text-center py-4">{error}</p>
          </>
        ) : weeks.length > 0 ? (
          <>
            <div className={styles.header}>
              <h3 className={cn("type-panel-title text-neutral-900 dark:text-neutral-100")}>
                GitHub Contributions (Last 12 Months)
              </h3>
              {totalContributions > 0 && (
                <span className={styles.total}>
                  {totalContributions} contributions in the last year
                </span>
              )}
            </div>
            <div className={styles.graph} ref={graphRef}>
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
                        <div
                          key={dayIndex}
                          className={`${styles.day} ${styles[`contributionLevel${level}`]}`}
                          style={{ backgroundColor: day.color || "#161b22" }}
                          title={`${day.date}: ${day.contributionCount} contributions`}
                          data-tooltip-placement="bottom"
                          suppressHydrationWarning
                        ></div>
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
              <h3 className={cn("type-panel-title text-neutral-900 dark:text-neutral-100")}>
                GitHub Contributions (Last 12 Months)
              </h3>
            </div>
            <p className="type-body-sm text-neutral-400 text-center py-4">
              No contribution data available
            </p>
          </>
        )}
      </m.div>
    </LazyMotion>
  );
});
