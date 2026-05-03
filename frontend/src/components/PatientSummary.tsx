import { useState } from 'react';
import { api } from '../api/client';

export const PatientSummary = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/analysis/summary');
      const { totalAnalyses, averageSeverity, providerMix } = res.data;
      
      const text = `Patient Report:
- Total Assessments: ${totalAnalyses}
- Average Severity Score: ${averageSeverity}/10
- Main Provider: ${providerMix?.[0] || 'N/A'}

Overall trend suggests ${totalAnalyses > 5 ? 'regular monitoring' : 'identifying phase'}.`;
      
      setSummary(text);
    } catch (err) {
      console.error(err);
      setError('Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="summary-section">
      {!summary ? (
        <button 
          onClick={generateSummary}
          disabled={loading}
          className="summary-btn"
        >
          {loading ? 'Generating Report...' : 'Generate Doctor Summary'}
        </button>
      ) : (
        <div className="medical-report-card">
          <div className="medical-report-header">
            <h3>Medical Summary</h3>
            <button onClick={() => setSummary(null)} className="close-link">Close Report</button>
          </div>
          <p className="report-body">{summary}</p>
          {error && <p className="tracker-error">{error}</p>}
        </div>
      )}
    </div>
  );
};
