import '../styles/CustomTooltip.css';

interface TooltipPayload {
  value: number;
  name?: string;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip text-black text-sm">
        <p className="value">{`Scrobbles: ${payload[0].value}`}</p>
      </div>
    );
  }

  return null;
};

export default CustomTooltip;