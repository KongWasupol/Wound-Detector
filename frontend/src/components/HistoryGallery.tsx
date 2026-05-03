import { useNavigate } from "react-router-dom";
import type { Analysis } from "../types.ts";

type Props = {
  analyses: Analysis[];
};

const severityLabel = (score: number) => {
  if (score > 75) return "Critical";
  if (score > 45) return "Moderate";
  return "Stable";
};

export const HistoryGallery = ({ analyses }: Props) => {
  const navigate = useNavigate();

  if (!analyses.length) {
    return (
      <section className="panel history-panel">
        <header>
          <p>Signal Queue</p>
          <h2>Recent Analytics</h2>
        </header>
        <div className="empty-state">
          <p>No scans yet</p>
          <span>Capture an image to start building evidence.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="panel history-panel">
      <header>
        <p>Signal Queue</p>
        <h2>Recent Analytics</h2>
      </header>
      <div className="history-grid">
        {analyses.map((item) => (
          <article 
            key={item._id} 
            className="analysis-card clickable"
            onClick={() => navigate(`/analysis/${item._id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/analysis/${item._id}`);
              }
            }}
          >
            <div className="analysis-header">
              <div>
                <span className={`provider ${item.provider}`}>OpenAI Vision</span>
                {item.model && (
                  <span className="model-badge">{item.model}</span>
                )}
              </div>
              <span className="timestamp">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="analysis-summary">{item.summary}</p>

            <div className="severity">
              <div className="severity-bar">
                <span style={{ width: `${item.severityScore}%` }} />
              </div>
              <div>
                <strong>{Math.round(item.severityScore)} </strong>
                <small>{severityLabel(item.severityScore)}</small>
              </div>
            </div>

            <ul className="insights">
              {item.insights?.slice(0, 3).map((insight) => (
                <li key={insight.label}>
                  <strong>{insight.label}</strong>
                  <span>{insight.detail}</span>
                </li>
              ))}
            </ul>

            <div className="recommendations">
              {item.recommendations?.slice(0, 2).map((rec) => (
                <span key={rec}>{rec}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

