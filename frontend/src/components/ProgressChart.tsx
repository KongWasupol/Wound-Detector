import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { ProgressData } from "../types.ts";

type Props = {
  data: ProgressData;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const ProgressChart = ({ data }: Props) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No progress data available</p>
        <span>Track follow-up symptoms to see progress</span>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    severity: Math.round(item.severity),
    fullDate: item.date,
  }));

  return (
    <div className="progress-chart">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="severityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7b5bff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7b5bff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="date"
            stroke="#9ea7ff"
            style={{ fontSize: "0.75rem" }}
            tick={{ fill: "#9ea7ff" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#9ea7ff"
            style={{ fontSize: "0.75rem" }}
            tick={{ fill: "#9ea7ff" }}
            label={{ value: "Severity", angle: -90, position: "insideLeft", fill: "#9ea7ff" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(4, 5, 30, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              color: "#f5f7ff",
            }}
            labelStyle={{ color: "#c8ceff" }}
          />
          <Area
            type="monotone"
            dataKey="severity"
            stroke="#7b5bff"
            strokeWidth={2}
            fill="url(#severityGradient)"
            dot={{ fill: "#7b5bff", r: 4 }}
            activeDot={{ r: 6, fill: "#43d6ff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="chart-stats">
        {data.length > 1 && (
          <>
            <div className="chart-stat">
              <span>First</span>
              <strong>{Math.round(data[0].severity)}</strong>
            </div>
            <div className="chart-stat">
              <span>Latest</span>
              <strong>{Math.round(data[data.length - 1].severity)}</strong>
            </div>
            <div className="chart-stat">
              <span>Change</span>
              <strong className={data[data.length - 1].severity < data[0].severity ? "positive" : "negative"}>
                {data[data.length - 1].severity < data[0].severity ? "↓" : "↑"} {Math.abs(Math.round(data[data.length - 1].severity - data[0].severity))}
              </strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

