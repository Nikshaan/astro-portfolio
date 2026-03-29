import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type TooltipItem } from 'chart.js';
import { memo, useEffect, useState } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface GenreEntry {
  genre: string;
  count: number;
}

const PURPLE_PALETTE = ['#7c3aed', '#9333ea', '#a855f7', '#c084fc', '#e879f9'];
const BLUE_PALETTE = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default memo(function GenreDonut({ data }: { data: GenreEntry[] }) {
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsLightTheme(document.documentElement.getAttribute('data-theme') === 'light');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', paddingTop: '0.5rem' }}>
        Not enough data yet
      </p>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const labels = data.map((d) => capitalise(d.genre));
  const counts = data.map((d) => d.count);

  const palette = isLightTheme ? BLUE_PALETTE : PURPLE_PALETTE;

  const chartData = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: palette,
        borderColor: isLightTheme ? '#bfdbfe' : '#1a0529',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.85)',
        titleColor: '#fff',
        bodyColor: isLightTheme ? '#bfdbfe' : '#c4b5fd',
        borderColor: isLightTheme ? '#3b82f6' : '#9333ea',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) => {
            const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
            return ` ${pct}%`;
          },
        },
      },
    },
    animation: { animateRotate: true, duration: 800 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 0, justifyContent: 'space-evenly' }}>
      <div style={{ flex: '0 0 55%', maxHeight: '55%', minHeight: 0, position: 'relative' }}>
        <Doughnut data={chartData} options={options} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', gap: '6px 14px' }}>
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={d.genre} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: palette[i], flexShrink: 0 }} />
              <span style={{ color: isLightTheme ? '#1e3a8a' : '#d8b4fe' }}>{capitalise(d.genre)}</span>
              <span style={{ color: '#8b949e', fontWeight: 500 }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
