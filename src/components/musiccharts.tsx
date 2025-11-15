import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import CustomTooltip from './CustomTooltip';

interface ChartData {
    name?: string;
    scrobbles?: number;
}

export default function MusicCharts({ data }: { data: ChartData[] }) {
    const [isLightTheme, setIsLightTheme] = useState(false);

    useEffect(() => {
        // Check initial theme
        const checkTheme = () => {
            const theme = document.documentElement.getAttribute('data-theme');
            setIsLightTheme(theme === 'light');
        };

        checkTheme();

        // Listen for theme changes
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
    const fillColor = isLightTheme ? '#93c5fd' : '#571388';  
    const gridColor = isLightTheme ? '#e5e7eb' : '#374151';
    const textColor = isLightTheme ? '#000000' : '#ffffff';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={data}
                margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} />
                <YAxis stroke={textColor} />
                <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={{ fill: 'transparent' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="scrobbles" 
                    stroke={strokeColor} 
                    fill={fillColor}
                    fillOpacity={0.6}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
