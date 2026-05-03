import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Analysis, ProgressData } from "../types";
import { api } from "../api/client.ts";
import { ProgressChart } from "../components/ProgressChart.tsx";
import { SymptomTracker } from "../components/SymptomTracker.tsx";

// Wrapper component to fetch and pass progress data to the chart
const ProgressChartWrapper = ({ symptomId }: { symptomId: string; }) => {
  const [progressData, setProgressData] = useState<ProgressData>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);
      try {
        // Backend already returns objects in { date, severity, analysisId } shape
        const { data } = await api.get<ProgressData>(`/analysis/progress/${symptomId}`);
        setProgressData(data);
      } catch (err) {
        console.error("Failed to load progress", err);
        setProgressData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [symptomId]);

  if (loading) return <div className="chart-loading">Loading progress...</div>;
  return <ProgressChart data={progressData} />;
};

const severityLabel = (score: number) => {
  if (score > 75) return "Critical";
  if (score > 45) return "Moderate";
  return "Stable";
};

export const DetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!id) {
        setError("No analysis ID provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch all analyses and find the one with matching ID
        const { data } = await api.get<Analysis[]>("/analysis/history");
        const found = data.find((a) => a._id === id);
        if (found) {
          setAnalysis(found);
        } else {
          setError("Analysis not found");
        }
      } catch (err) {
        console.error("Failed to fetch analysis:", err);
        setError("Failed to load analysis");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  const handleNewAnalysis = (newAnalysis: Analysis) => {
    // Refresh the current analysis or navigate to the new one
    navigate(`/analysis/${newAnalysis._id}`, { replace: true });
    window.location.reload(); // Simple refresh to show updated data
  };

  if (loading) {
    return (
      <div className="shell">
        <div className="glow one" />
        <div className="glow two" />
        <div className="dashboard">
          <div className="loading">Loading analysis...</div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="shell">
        <div className="glow one" />
        <div className="glow two" />
        <div className="dashboard">
          <div className="panel">
            <header>
              <p>Error</p>
              <h2>{error || "Analysis not found"}</h2>
            </header>
            <button onClick={() => navigate("/")} className="auth-submit-btn">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const API_HOST = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const imageFileName = analysis.imagePath.split(/[/\\]/).pop();
  const imageUrl = `${API_HOST.replace(/\/$/, "")}/uploads/${imageFileName}`;

  return (
    <div className="shell">
      <div className="glow one" />
      <div className="glow two" />
      <div className="dashboard">
        <header className="top-bar">
          <button onClick={() => navigate("/")} className="ghost">
            ← Back to Dashboard
          </button>
          <div>
            <p>Analysis Details</p>
          </div>
        </header>

        <div className="detail-page">
          <section className="panel detail-panel">
            <div className="detail-header">
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

            <div className="detail-body">
              <div className="detail-image-section">
                <img 
                  src={imageUrl} 
                  alt="Analysis" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E";
                  }} 
                />
              </div>

              <div className="detail-content">
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
                  <ProgressChartWrapper symptomId={analysis.wound || analysis._id} />
                  <SymptomTracker analysis={analysis} onNewAnalysis={handleNewAnalysis} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

