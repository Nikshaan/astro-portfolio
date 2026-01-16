import { Line } from 'react-chartjs-2';
import { useState, useEffect, useMemo, memo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    type TooltipItem
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler
);

interface ChartData {
    name?: string;
    scrobbles?: number;
}

export default memo(function MusicCharts({ data }: { data: ChartData[] }) {
    const [isLightTheme, setIsLightTheme] = useState(false);

    useEffect(() => {
        const checkTheme = () => {
            const theme = document.documentElement.getAttribute('data-theme');
            setIsLightTheme(theme === 'light');
        };

        checkTheme();

        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        return () => observer.disconnect();
    }, []);

    if (!data || data.length === 0) {
        return (
            <div className='w-full h-full flex items-center justify-center'>
                <div className="text-gray-400 text-sm">Chart data loading...</div>
            </div>
        );
    }

    const strokeColor = isLightTheme ? '#3b82f6' : '#ac46fd';
    const fillColor = isLightTheme ? 'rgba(147, 197, 253, 0.6)' : 'rgba(87, 19, 136, 0.6)';
    const gridColor = isLightTheme ? '#bfdbfe' : '#374151';
    const textColor = isLightTheme ? '#1e3a8a' : '#ffffff';

    const chartData = useMemo(() => ({
        labels: data.map(item => item.name || ''),
        datasets: [
            {
                label: 'Scrobbles',
                data: data.map(item => item.scrobbles || 0),
                borderColor: strokeColor,
                backgroundColor: fillColor,
                fill: true,
                tension: 0.4,

                pointRadius: 0,

                pointHoverRadius: 4,
                pointHoverBackgroundColor: strokeColor,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            },
        ],
    }), [data, strokeColor, fillColor]);

    const [initialAnimationComplete, setInitialAnimationComplete] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setInitialAnimationComplete(true);
        }, 2200);
        return () => clearTimeout(timer);
    }, []);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: strokeColor,
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                    label: function (context: TooltipItem<'line'>) {
                        return `Scrobbles: ${context.parsed.y}`;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: {
                    color: gridColor,
                    drawBorder: false,
                },
                ticks: {
                    color: textColor,
                },
            },
            y: {
                grid: {
                    color: gridColor,
                    drawBorder: false,
                },
                ticks: {
                    color: textColor,
                },
                beginAtZero: true,
            },
        },
        animations: {
            y: {
                duration: initialAnimationComplete ? 0 : 2000,
                easing: 'easeOutQuart' as const,
            },
        },
    }), [gridColor, textColor, strokeColor, initialAnimationComplete]);

    return (
        <div className="w-full h-full">
            <Line data={chartData} options={options} />
        </div>
    );
})
