import { useEffect, useState, useRef } from 'react';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import styles from './githubContributions.module.css';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ContributionDay {
  contributionCount: number;
  date: string;
  color: string;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

interface ContributionsCollection {
  contributionCalendar: ContributionCalendar;
}

interface User {
  contributionsCollection: ContributionsCollection;
}

interface GitHubAPIResponse {
  data: {
    user: User;
  };
  errors?: Array<{ message: string }>;
}

interface GithubContributionsProps {
  initialData?: GitHubAPIResponse;
}

export default function GithubContributions({ initialData }: GithubContributionsProps) {
  const [weeks, setWeeks] = useState<ContributionWeek[]>(
    initialData?.data?.user?.contributionsCollection?.contributionCalendar?.weeks || []
  );
  const [totalContributions, setTotalContributions] = useState(
    initialData?.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions || 0
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
        const baseUrl = import.meta.env.BASE_URL || '/';
        const apiPath = baseUrl.endsWith('/') ? 'api/github-contributions' : '/api/github-contributions';
        const response = await fetch(`${baseUrl}${apiPath}`);

        if (!response.ok) {
          setError('Failed to load contributions');
          setLoading(false);
          return;
        }

        const data: GitHubAPIResponse = await response.json();

        if (data.errors) {
          setError('Failed to load contributions');
        } else if (data.data?.user?.contributionsCollection?.contributionCalendar) {
          setWeeks(data.data.user.contributionsCollection.contributionCalendar.weeks);
          setTotalContributions(data.data.user.contributionsCollection.contributionCalendar.totalContributions);
        } else {
          setError('Unexpected API response');
        }
      } catch (err) {
        setError('Failed to load contributions');
      } finally {
        setLoading(false);
      }
    };

    if (!initialData && !loading) {
      fetchContributions();
    }

    const interval = setInterval(fetchContributions, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [initialData]);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={cn(
          "relative p-6 rounded-3xl border overflow-hidden w-full flex flex-col justify-between group transition-colors github-card-hover",
          "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 shadow-sm",
          "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#1e3a8a]"
        )}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: "easeOut",
            delay: 0.1
          }
        }}
        viewport={{ once: true, margin: "-50px" }}
      >
        <div className={styles.header}>
          <p className='text-lg font-medium'>GitHub Contributions (Last 12 Months)</p>
          {totalContributions > 0 && (
            <span className={styles.total}>{totalContributions} contributions in the last year</span>
          )}
        </div>
        {loading ? (
          <div className={styles.loading}>Loading contributions...</div>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : weeks.length > 0 ? (
          <div className={styles.graph} ref={graphRef}>
            {weeks.map((week: ContributionWeek, weekIndex: number) => (
              <div key={weekIndex} className={styles.week}>
                {week.contributionDays.map((day: ContributionDay, dayIndex: number) => {
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
                      style={{ backgroundColor: day.color || '#161b22' }}
                      title={`${day.date}: ${day.contributionCount} contributions`}
                      data-tooltip-placement="bottom"
                      suppressHydrationWarning
                    ></div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'red' }}>No contribution data available</p>
        )}
      </m.div>
    </LazyMotion>
  );
}
