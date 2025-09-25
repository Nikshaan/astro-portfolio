import '../styles/CustomTooltip.css';

const CustomTooltip = ({ active, payload }) => {
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