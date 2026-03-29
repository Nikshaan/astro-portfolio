import { useEffect, useState, useRef, memo } from 'react';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import styles from './ScrobbleHeatmap.module.css';

interface HeatmapDay {
  date: string;
  count: number;
}

interface HeatmapData {
  days: HeatmapDay[];
  totalScrobbles: number;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 8) return 2;
  if (count <= 15) return 3;
  return 4;
}

function chunkIntoWeeks(days: HeatmapDay[]): HeatmapDay[][] {
  const firstDate = new Date(days[0]?.date ?? '');
  const startDay = firstDate.getUTCDay();
  const padded: (HeatmapDay | null)[] = [
    ...Array(startDay).fill(null),
    ...days,
  ];
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7).map((d) => d ?? { date: '', count: 0 });
    weeks.push(week);
  }
  return weeks;
}

function getMonthLabels(weeks: HeatmapDay[][]): string[] {
  let lastMonth = -1;
  return weeks.map((week) => {
    const firstReal = week.find((d) => d.date !== '');
    if (!firstReal) return '';
    const month = new Date(firstReal.date).getUTCMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      return MONTH_NAMES[month];
    }
    return '';
  });
}

let cachedHeatmapData: HeatmapData | null = null;
let fetchPromise: Promise<HeatmapData> | null = null;

export default memo(function ScrobbleHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(cachedHeatmapData);
  const [loading, setLoading] = useState(!cachedHeatmapData);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.scrollLeft = graphRef.current.scrollWidth;
    }
  }, [data]);

  useEffect(() => {
    if (cachedHeatmapData) return;

    const load = async () => {
      if (fetchPromise) {
        try {
          const d = await fetchPromise;
          cachedHeatmapData = d;
          setData(d);
        } catch {
          setError('Failed to load heatmap');
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL || '/';
        const apiPath = baseUrl.endsWith('/') ? 'api/music-heatmap' : '/api/music-heatmap';
        fetchPromise = fetch(`${baseUrl}${apiPath}`, {
          headers: { Accept: 'application/json' },
        }).then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<HeatmapData>;
        });

        const d = await fetchPromise;
        cachedHeatmapData = d;
        setData(d);
      } catch {
        setError('Failed to load heatmap');
      } finally {
        setLoading(false);
        fetchPromise = null;
      }
    };

    load();
  }, []);

  if (loading && !data) {
    return (
      <div className={styles.loading}>
        Loading scrobble history…
      </div>
    );
  }

  if ((error && !data) || !data || data.days.length === 0) {
    return (
      <p style={{ color: '#8b949e', textAlign: 'center', padding: '1rem 0', fontSize: '0.875rem' }}>
        Not enough data yet
      </p>
    );
  }

  const weeks = chunkIntoWeeks(data.days);
  const monthLabels = getMonthLabels(weeks);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="relative p-6 rounded-3xl border overflow-hidden w-full flex flex-col justify-between group bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 [.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#1e3a8a]"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } }}
        viewport={{ once: true, amount: 0.1 }}
      >
        <div className={styles.header}>
          <p className="text-lg font-medium">Scrobble Heatmap (Last 12 Months)</p>
          {data.totalScrobbles > 0 && (
            <span className={styles.total}>{data.totalScrobbles.toLocaleString()} scrobbles in the last year</span>
          )}
        </div>

        <div className={styles.wrapper}>
          <div className={styles.dayLabels}>
            {DAY_LABELS.map((label, i) => (
              <div key={i} className={styles.dayLabel}>{label}</div>
            ))}
          </div>

          <div className={styles.graphContainer}>
            <div className={styles.monthLabels}>
              {monthLabels.map((label, i) => (
                <div key={i} className={styles.monthLabel}>{label}</div>
              ))}
            </div>

            <div className={styles.graph} ref={graphRef}>
              {weeks.map((week, wi) => (
                <div key={wi} className={styles.week}>
                  {week.map((day, di) => {
                    const level = getLevel(day.count);
                    return (
                      <div
                        key={di}
                        className={`${styles.day} ${styles[`level${level}`]}`}
                        suppressHydrationWarning
                        title={day.date ? `${day.date}: ${day.count} scrobble${day.count !== 1 ? 's' : ''}` : undefined}
                      >
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, color: '#8b949e' }}>Less</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <div key={l} className={`${styles.day} ${styles[`level${l}`]}`} style={{ width: 11, height: 11, minHeight: 'unset', borderRadius: 2, cursor: 'default' }} />
          ))}
          <span style={{ fontSize: 10, color: '#8b949e' }}>More</span>
        </div>
      </m.div>
    </LazyMotion>
  );
});
