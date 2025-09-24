interface data {
    name?: string;
    scrobbles?: number;
}

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MusicCharts ({ data }: { data: data[] }) {
    // console.log(data)
    
    return(
        <div className='w-full h-full pr-10 select-none'>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    width={500}
                    height={100}
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
                    <Tooltip />
                    <Area type="monotone" dataKey="scrobbles" stroke="#ac46fd" fill="#571388" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
  );
}