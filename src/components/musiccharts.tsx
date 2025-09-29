import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomTooltip from './CustomTooltip';

interface ChartData {
    name?: string;
    scrobbles?: number;
}

export default function MusicCharts({ data }: { data: ChartData[] }) {
    if (!data || data.length === 0) {
        return (
            <div className='w-full h-full flex items-center justify-center'>
                <div className="text-gray-400 text-sm">Chart data loading...</div>
            </div>
        );
    }

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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={{ fill: 'transparent' }}
                />
                <Area type="monotone" dataKey="scrobbles" stroke="#ac46fd" fill="#571388" />
            </AreaChart>
        </ResponsiveContainer>
    );
}
