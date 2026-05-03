import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ProgressPoint } from "../types";

interface SeverityGraphProps {
  progress: ProgressPoint[];
}

export const SeverityGraph = ({ progress }: SeverityGraphProps) => {
  if (!progress || progress.length === 0) {
    return (
      <div className="severity-graph empty">
        <p>No progress data yet</p>
      </div>
    );
  }

  const formattedData = progress.map((point) => {
    const date = new Date(point.date);
    return {
      ...point,
      date: date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
      }) + " " + date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  });

  const getSeverityColor = (severity: number) => {
    if (severity >= 70) return "#ef4444";
    if (severity >= 40) return "#f59e0b";
    return "#22c55e";
  };

  const latestSeverity = progress[progress.length - 1]?.severity || 0;
  const firstSeverity = progress[0]?.severity || 0;
  const trend = firstSeverity - latestSeverity;

  return (
    <div className="severity-graph">
      <div className="graph-header">
        <h4>📊 Progress Chart</h4>
        <div className="trend-indicator">
          {trend > 0 ? (
            <span className="improving">↓ Improved by {trend.toFixed(0)} points</span>
          ) : trend < 0 ? (
            <span className="worsening">↑ Worsened by {Math.abs(trend).toFixed(0)} points</span>
          ) : (
            <span className="stable">→ Stable</span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={formattedData} margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tick={{ fill: '#94a3b8' }} padding={{ left: 10, right: 10 }} />
          <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px",
              color: "#f8fafc",
              padding: "10px 14px",
            }}
            formatter={(value: number) => {
              const label = value >= 70 ? "🔴 Critical" : value >= 40 ? "🟠 Monitor" : "🟢 Safe";
              return [`${value} points (${label})`, "Severity"];
            }}
            labelFormatter={(label) => `📅 ${label}`}
          />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" label="Critical" />
          <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="5 5" label="Monitor" />
          <Line
            type="monotone"
            dataKey="severity"
            stroke={getSeverityColor(latestSeverity)}
            strokeWidth={3}
            dot={{ fill: getSeverityColor(latestSeverity), strokeWidth: 2 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="graph-legend">
        <div className="legend-item">
          <span className="dot danger" />
          <span>Critical (≥70)</span>
        </div>
        <div className="legend-item">
          <span className="dot warning" />
          <span>Monitor (40-69)</span>
        </div>
        <div className="legend-item">
          <span className="dot safe" />
          <span>Improving (&lt;40)</span>
        </div>
      </div>
    </div>
  );
};
