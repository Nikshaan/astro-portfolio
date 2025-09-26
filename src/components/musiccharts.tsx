import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import CustomTooltip from './CustomTooltip';

interface data {
    name?: string;
    scrobbles?: number;
}

export default function MusicCharts({ data }: { data: data[] }) {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDimensions({ width: 800, height: 240 });
        }, 100);
        
        return () => clearTimeout(timer);
    }, []);

    if (!data || data.length === 0 || dimensions.width === 0) {
        return (
            <div className='w-full h-full pr-10 select-none flex items-center justify-center'>
                <div className="text-gray-400 text-sm">Loading chart data...</div>
            </div>
        );
    }
    
    return (
        <div className='w-full h-full pr-10 lg:px-20 select-none'>
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                <AreaChart
                    width={dimensions.width}
                    height={dimensions.height}
                    data={data}
                    tabIndex={-1}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                        content={<CustomTooltip />}
                        wrapperStyle={{
                            outline: 'none',
                            border: 'none',
                            padding: '0',
                            backgroundColor: 'transparent'
                        }}
                        cursor={{ fill: 'transparent' }}
                    />
                    <Area type="monotone" dataKey="scrobbles" stroke="#ac46fd" fill="#571388" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
