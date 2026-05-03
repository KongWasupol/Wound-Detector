import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

interface TrackRequest {
  _id: string;
  patient: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: "pending" | "accepted" | "rejected";
  message?: string;
  createdAt: string;
}

interface TrackRequestsPanelProps {
  onRefresh?: () => void;
}

export const TrackRequestsPanel = ({ onRefresh }: TrackRequestsPanelProps) => {
  const [requests, setRequests] = useState<TrackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get<TrackRequest[]>("/doctor/track-requests");
      setRequests(res.data);
    } catch (error) {
      console.error("Failed to fetch track requests:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCancelRequest = async (requestId: string) => {
    try {
      await api.delete(`/doctor/track-requests/${requestId}`);
      fetchRequests();
      onRefresh?.();
    } catch (error) {
      console.error("Failed to cancel request:", error);
    }
  };

  const filteredRequests = requests.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="tr-status-badge pending">⏳ Pending</span>;
      case "accepted":
        return <span className="tr-status-badge accepted">✓ Accepted</span>;
      case "rejected":
        return <span className="tr-status-badge rejected">✕ Rejected</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  if (loading) {
    return (
      <div className="track-requests-panel">
        <div className="tr-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="track-requests-panel">
      <div className="tr-header">
        <h3>📤 Sent Track Requests</h3>
        <div className="tr-stats">
          <span className="tr-stat pending">{pendingCount} Pending</span>
          <span className="tr-stat accepted">{acceptedCount} Accepted</span>
          <span className="tr-stat rejected">{rejectedCount} Rejected</span>
        </div>
      </div>

      <div className="tr-filters">
        {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
          <button
            key={f}
            className={`tr-filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" && "All"}
            {f === "pending" && "Pending"}
            {f === "accepted" && "Accepted"}
            {f === "rejected" && "Rejected"}
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="tr-empty">
          <p>No track requests</p>
        </div>
      ) : (
        <div className="tr-list">
          {filteredRequests.map((request) => (
            <div key={request._id} className={`tr-item ${request.status}`}>
              <img
                src={request.patient.avatar || "/default-avatar.png"}
                alt={request.patient.name}
                className="tr-avatar"
              />
              <div className="tr-info">
                <strong>{request.patient.name}</strong>
                <p>{request.patient.email}</p>
                <span className="tr-date">{formatDate(request.createdAt)}</span>
              </div>
              <div className="tr-actions">
                {getStatusBadge(request.status)}
                {request.status === "pending" && (
                  <button
                    className="tr-cancel-btn"
                    onClick={() => handleCancelRequest(request._id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
