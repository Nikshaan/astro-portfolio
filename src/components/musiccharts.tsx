import { Line } from "react-chartjs-2";
import { useState, useEffect, useMemo, memo } from "react";
import useIsLightTheme from "../hooks/useTheme";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  type TooltipItem,
  type ChartOptions,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
);

interface ChartData {
  name?: string;
  scrobbles?: number;
}

export default memo(function MusicCharts({ data }: { data: ChartData[] }) {
  const isLightTheme = useIsLightTheme();

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[var(--text-tertiary)] type-body-sm">Chart data loading...</div>
      </div>
    );
  }

  const strokeColor = isLightTheme ? "#6D4AFF" : "#A78BFA";
  const fillColor = isLightTheme
    ? "rgba(109, 74, 255, 0.14)"
    : "rgba(167, 139, 250, 0.16)";
  const gridColor = isLightTheme ? "#E7E5E4" : "#262626";
  const textColor = isLightTheme ? "#57534E" : "#A3A3A3";

  const chartData = useMemo(
    () => ({
      labels: data.map((item) => item.name || ""),
      datasets: [
        {
          label: "Scrobbles",
          data: data.map((item) => item.scrobbles || 0),
          borderColor: strokeColor,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.4,

          pointRadius: 0,

          pointHoverRadius: 4,
          pointHoverBackgroundColor: strokeColor,
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
      ],
    }),
    [data, strokeColor, fillColor],
  );

  const [initialAnimationComplete, setInitialAnimationComplete] =
    useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialAnimationComplete(true);
    }, 950);
    return () => clearTimeout(timer);
  }, []);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      events: [
        "mousemove",
        "mouseout",
        "click",
        "touchstart",
        "touchend",
      ] as ChartOptions<"line">["events"],
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: strokeColor,
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function (context: TooltipItem<"line">) {
              return `Scrobbles: ${context.parsed.y}`;
            },
          },
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
          duration: initialAnimationComplete ? 0 : 900,
          easing: "easeOutQuart" as const,
        },
      },
    }),
    [gridColor, textColor, strokeColor, initialAnimationComplete],
  );

  return (
    <div className="h-full w-full touch-manipulation">
      <Line data={chartData} options={options} />
    </div>
  );
});
