import { useState, useEffect } from "react";
import type { Analysis, ProgressData } from "../types.ts";
import { api } from "../api/client.ts";
import { ProgressChart } from "./ProgressChart.tsx";

type Props = {
  analysis: Analysis | null;
};

export const ResultMarquee = ({ analysis }: Props) => {
  const [progressData, setProgressData] = useState<ProgressData>([]);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (analysis) {
      loadProgress();
    }
  }, [analysis]);

  const loadProgress = async () => {
    if (!analysis) return;
    try {
      const symptomId = analysis.symptomId || analysis._id;
      const { data } = await api.get<ProgressData>(`/analysis/progress/${symptomId}`);
      setProgressData(data);
      setShowProgress(data.length > 1);
    } catch (err) {
      console.error("Failed to load progress", err);
    }
  };

  if (!analysis) return null;
  
  return (
    <section className="panel marquee-panel">
      <div className="marquee-content">
        <div>
          <p>Latest Signal</p>
          <h3>{analysis.summary}</h3>
        </div>
        <div className="marquee-radial">
          <span>Severity</span>
          <strong>{Math.round(analysis.severityScore)}</strong>
        </div>
        <ul>
          {analysis.recommendations.slice(0, 3).map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
      {progressData.length > 1 && (
        <div className="marquee-progress">
          <button
            type="button"
            onClick={() => setShowProgress(!showProgress)}
            className="progress-toggle"
          >
            {showProgress ? "Hide" : "Show"} Progress Chart
          </button>
          {showProgress && <ProgressChart data={progressData} />}
        </div>
      )}
    </section>
  );
};

