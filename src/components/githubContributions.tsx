import { useEffect, useState } from 'react';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

  useEffect(() => {
    if (initialData) return;

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

    fetchContributions();
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
            duration: 0.5,
            ease: "easeOut"
          }
        }}
        viewport={{ once: true, margin: "-50px" }}
      >
        <div className="header">
          <h3>GitHub Contributions (Last 12 Months)</h3>
          {totalContributions > 0 && (
            <span className="total">{totalContributions} contributions in the last year</span>
          )}
        </div>
        {loading ? (
          <div className="loading">Loading contributions...</div>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : weeks.length > 0 ? (
          <div className="graph">
            {weeks.map((week: ContributionWeek, weekIndex: number) => (
              <div key={weekIndex} className="week">
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
                      className={`day contribution-level-${level}`}
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

        <style>{`
        .contributions-container {
          margin-top: 0;
          width: 100%;
          padding: 0 1rem;
        }

        @media (min-width: 640px) {
          .contributions-container {
            margin-top: 0;
          }
        }

        @media (min-width: 1024px) {
          .contributions-container {
            margin-top: 0;
            padding: 0;
          }
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: white;
        }

        [data-theme="light"] .header h3 {
          color: black;
        }

        .header .total {
          font-size: 0.875rem;
          color: #8b949e;
        }

        [data-theme="light"] .header .total {
          color: #57606a;
        }

        .loading {
          color: #8b949e;
          padding: 2rem 0;
          text-align: center;
        }

        [data-theme="light"] .loading {
          color: #57606a;
        }

        .graph {
          display: flex;
          gap: 2px;
          overflow-x: auto;
          padding: 0.5rem 0;
          scrollbar-width: thin;
          scrollbar-color: #30363d #0d1117;
          width: 100%;
          justify-content: stretch;
        }

        [data-theme="light"] .graph {
          scrollbar-color: #d0d7de #ffffff;
        }

        .graph::-webkit-scrollbar {
          height: 8px;
        }

        .graph::-webkit-scrollbar-track {
          background: #0d1117;
        }

        [data-theme="light"] .graph::-webkit-scrollbar-track {
          background: #f6f8fa;
        }

        .graph::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }

        [data-theme="light"] .graph::-webkit-scrollbar-thumb {
          background: #d0d7de;
        }

        .graph::-webkit-scrollbar {
          display: none;
        }

        .graph {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .week {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .day {
          width: 100%;
          aspect-ratio: 1;
          min-height: 10px;
          border-radius: 2px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .day:hover {
          transform: scale(1.2);
          outline: 1px solid rgba(255, 255, 255, 0.2);
        }

        [data-theme="light"] .day:hover {
          outline: 1px solid rgba(0, 0, 0, 0.2);
        }

        [data-theme="light"] .contribution-level-0 {
          background-color: #eff6ff !important;
        }

        [data-theme="light"] .contribution-level-1 {
          background-color: #bfdbfe !important;
        }

        [data-theme="light"] .contribution-level-2 {
          background-color: #60a5fa !important;
        }

        [data-theme="light"] .contribution-level-3 {
          background-color: #3b82f6 !important;
        }

        [data-theme="light"] .contribution-level-4 {
          background-color: #1e40af !important;
        }

        @media (min-width: 640px) {
          .graph {
            gap: 2px;
          }
          
          .week {
            gap: 2px;
          }

          .day {
            min-height: 11px;
          }
        }

        @media (min-width: 1024px) {
          .header h3 {
            font-size: 1.5rem;
          }

          .header .total {
            font-size: 1rem;
          }

          .graph {
            gap: 3px;
          }

          .week {
            gap: 3px;
          }

          .day {
            min-height: 12px;
          }
        }

        [data-theme="light"] .github-card-hover:hover {
            border-color: #3b82f6 !important;
        }
        .github-card-hover:hover {
            border-color: #c084fc !important;
        }
      `}</style>
      </m.div>
    </LazyMotion>
  );
}
