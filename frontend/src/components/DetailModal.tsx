import { useEffect, useState } from "react";
import type { Analysis, ProgressData } from "../types.ts";
import { api } from "../api/client.ts";
import { ProgressChart } from "./ProgressChart.tsx";
import { SymptomTracker } from "./SymptomTracker.tsx";

type Props = {
  analysis: Analysis | null;
  onClose: () => void;
};

const severityLabel = (score: number) => {
  if (score > 75) return "Critical";
  if (score > 45) return "Moderate";
  return "Stable";
};

export const DetailModal = ({ analysis, onClose }: Props) => {
  const [progressData, setProgressData] = useState<ProgressData>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (analysis) {
      loadProgress();
    }
  }, [analysis]);

  const loadProgress = async () => {
    if (!analysis) return;
    setLoadingProgress(true);
    try {
      const symptomId = analysis.symptomId || analysis._id;
      const { data } = await api.get<ProgressData[]>(`/analysis/progress/${symptomId}`);
      // Transform the data to match ProgressChart format
      const transformedData = data.map((item: any) => ({
        date: item.createdAt,
        severity: item.severityScore,
        analysisId: item._id,
      }));
      setProgressData(transformedData);
    } catch (err) {
      console.error("Failed to load progress", err);
      setProgressData([]);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleNewAnalysis = () => {
    loadProgress();
  };

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (analysis) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [analysis]);

  if (!analysis) return null;

  const API_HOST = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const imageFileName = analysis.imagePath.split(/[/\\]/).pop();
  const imageUrl = `${API_HOST.replace(/\/$/, "")}/uploads/${imageFileName}`;

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="modal-header">
          <div>
            <span className={`provider ${analysis.provider}`}>OpenAI Vision</span>
            {analysis.model && (
              <span className="model-badge">{analysis.model}</span>
            )}
          </div>
          <span className="timestamp">
            {new Date(analysis.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="modal-body">
          <div className="modal-image-section">
            <img src={imageUrl} alt="Analysis" onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E";
            }} />
          </div>

          <div className="modal-details">
            <div className="detail-section">
              <h3>Summary</h3>
              <p>{analysis.summary}</p>
            </div>

            {analysis.notes && (
              <div className="detail-section">
                <h3>Clinician Notes</h3>
                <p>{analysis.notes}</p>
              </div>
            )}

            <div className="detail-section">
              <h3>Severity Assessment</h3>
              <div className="severity">
                <div className="severity-bar">
                  <span style={{ width: `${analysis.severityScore}%` }} />
                </div>
                <div>
                  <strong>{Math.round(analysis.severityScore)} </strong>
                  <small>{severityLabel(analysis.severityScore)}</small>
                </div>
              </div>
            </div>

            {analysis.insights && analysis.insights.length > 0 && (
              <div className="detail-section">
                <h3>Detailed Insights</h3>
                <ul className="insights">
                  {analysis.insights.map((insight, idx) => (
                    <li key={idx}>
                      <strong>{insight.label}</strong>
                      <span>{insight.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="detail-section">
                <h3>Recommendations</h3>
                <div className="recommendations">
                  {analysis.recommendations.map((rec, idx) => (
                    <span key={idx}>{rec}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-section">
              <h3>Symptom Progress</h3>
              {loadingProgress ? (
                <div className="chart-loading">Loading progress data...</div>
              ) : (
                <ProgressChart data={progressData} />
              )}
              <SymptomTracker analysis={analysis} onNewAnalysis={handleNewAnalysis} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

