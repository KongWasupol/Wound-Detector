import { useEffect, useState, useRef } from "react";

interface StatsCardProps {
  icon: string;
  label: string;
  value: number;
  color: "purple" | "cyan" | "green" | "red" | "yellow";
  suffix?: string;
  trend?: {
    direction: "up" | "down" | "stable";
    value: number;
  };
}

export const DoctorStatsCard = ({
  icon,
  label,
  value,
  color,
  suffix = "",
  trend,
}: StatsCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Animated counter effect
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplayValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  const colorStyles = {
    purple: {
      gradient: "linear-gradient(135deg, rgba(123, 91, 255, 0.2), rgba(123, 91, 255, 0.05))",
      border: "rgba(123, 91, 255, 0.3)",
      text: "#cbb5ff",
      glow: "rgba(123, 91, 255, 0.4)",
    },
    cyan: {
      gradient: "linear-gradient(135deg, rgba(51, 208, 255, 0.2), rgba(51, 208, 255, 0.05))",
      border: "rgba(51, 208, 255, 0.3)",
      text: "#7dd5ff",
      glow: "rgba(51, 208, 255, 0.4)",
    },
    green: {
      gradient: "linear-gradient(135deg, rgba(81, 207, 102, 0.2), rgba(81, 207, 102, 0.05))",
      border: "rgba(81, 207, 102, 0.3)",
      text: "#51cf66",
      glow: "rgba(81, 207, 102, 0.4)",
    },
    red: {
      gradient: "linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(255, 107, 107, 0.05))",
      border: "rgba(255, 107, 107, 0.3)",
      text: "#ff6b6b",
      glow: "rgba(255, 107, 107, 0.4)",
    },
    yellow: {
      gradient: "linear-gradient(135deg, rgba(255, 212, 59, 0.2), rgba(255, 212, 59, 0.05))",
      border: "rgba(255, 212, 59, 0.3)",
      text: "#ffd43b",
      glow: "rgba(255, 212, 59, 0.4)",
    },
  };

  const style = colorStyles[color];

  return (
    <div
      ref={containerRef}
      className="doctor-stats-card"
      style={{
        background: style.gradient,
        borderColor: style.border,
        boxShadow: `0 8px 32px ${style.glow}`,
      }}
    >
      <div className="stats-icon" style={{ color: style.text }}>
        {icon}
      </div>
      <div className="stats-content">
        <span className="stats-label">{label}</span>
        <span className="stats-value" style={{ color: style.text }}>
          {displayValue}
          {suffix}
        </span>
        {trend && (
          <span className={`stats-trend ${trend.direction}`}>
            {trend.direction === "up" && "↑"}
            {trend.direction === "down" && "↓"}
            {trend.direction === "stable" && "→"}
            {" "}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
};
