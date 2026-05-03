import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { api } from "../api/client.ts";
import type { Wound, TrackRequest, WoundProgress } from "../types";
import { WoundCard } from "../components/WoundCard.tsx";
import { SeverityGraph } from "../components/SeverityGraph.tsx";
import { CameraPanel } from "../components/CameraPanel.tsx";
import { AIConsultChat } from "../components/AIConsultChat.tsx";
import { socket } from "../api/socket";

export const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [trackRequests, setTrackRequests] = useState<TrackRequest[]>([]);
  const [selectedWound, setSelectedWound] = useState<Wound | null>(null);
  const [woundProgress, setWoundProgress] = useState<WoundProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewWound, setShowNewWound] = useState(false);
  const [showUpdateWound, setShowUpdateWound] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const hasFetched = useRef(false);

  // Redirect only if strictly doctor role AND not dual role/preferred patient
  useEffect(() => {
    const isDual = user?.roles?.includes("patient") && user?.roles?.includes("doctor");
    if (user && user.role === "doctor" && !isDual) {
      navigate("/doctor-dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSwitchToDoctor = () => {
    localStorage.setItem("wound-preferred-mode", "doctor");
    navigate("/doctor-dashboard");
  };

  // Connect to socket for notifications


  const fetchWounds = useCallback(async () => {
    try {
      const res = await api.get<Wound[]>("/patient/wounds");
      setWounds(res.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error("Access denied - Please login again");
      } else {
        console.error("Failed to fetch wounds:", error);
      }
    }
  }, []);

  const fetchTrackRequests = useCallback(async () => {
    try {
      const res = await api.get<TrackRequest[]>("/patient/track-requests");
      setTrackRequests(res.data);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        console.error("Failed to fetch track requests:", error);
      }
    }
  }, []);

  // Connect to socket for notifications
  useEffect(() => {
    if (!user) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join_patient_room", user._id);

    const handleTrackRequest = () => {
        fetchTrackRequests();
    };

    socket.on("track_request", handleTrackRequest);

    return () => {
      socket.off("track_request", handleTrackRequest);
    };
  }, [user, fetchTrackRequests]);

  const fetchWoundProgress = useCallback(async (woundId: string) => {
    try {
      const res = await api.get<WoundProgress>(`/patient/wounds/${woundId}/progress`);
      setWoundProgress(res.data);
    } catch (error) {
      console.error("Failed to fetch wound progress:", error);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple fetches
    if (hasFetched.current) return;
    hasFetched.current = true;

    const hydrate = async () => {
      setLoading(true);
      await Promise.all([fetchWounds(), fetchTrackRequests()]);
      setLoading(false);
    };
    hydrate();
  }, [fetchWounds, fetchTrackRequests]);

  const handleSelectWound = (wound: Wound) => {
    setSelectedWound(wound);
    fetchWoundProgress(wound._id);
  };

  const handleRespondToRequest = async (requestId: string, accept: boolean) => {
    try {
      await api.post(`/patient/track-requests/${requestId}/respond`, { accept });
      fetchTrackRequests();
    } catch (error) {
      console.error("Failed to respond to request:", error);
    }
  };

  const handleWoundCreated = () => {
    setShowNewWound(false);
    fetchWounds();
  };

  const handleWoundUpdated = async () => {
    // Refetch wounds list
    await fetchWounds();
    
    // If a wound is selected, update it with fresh data
    if (selectedWound) {
      try {
        const res = await api.get<{ wound: Wound }>(`/patient/wounds/${selectedWound._id}`);
        setSelectedWound(res.data.wound);
        fetchWoundProgress(selectedWound._id);
      } catch (error) {
        console.error("Failed to refresh selected wound:", error);
      }
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 70) return "#ef4444";
    if (severity >= 40) return "#f59e0b";
    return "#22c55e";
  };

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  return (
    <div className="patient-dashboard">
      <header className="top-bar">
        <div>
          <p>Hello</p>
          <strong>{user?.name}</strong>
          <span className="role-badge patient">Patient</span>
          {(user?.roles?.includes("doctor") || user?.role === "doctor") && (
            <button 
              onClick={handleSwitchToDoctor} 
              className="mode-switch-btn doctor-mode"
            >
              <span className="switch-icon">👨‍⚕️</span>
              <span className="switch-text">Switch to Doctor</span>
            </button>
          )}
        </div>
        <button onClick={logout} className="ghost">
          Logout
        </button>
      </header>

      {/* Track Requests Notification */}
      {trackRequests.length > 0 && (
        <div className="track-requests-banner">
          <h3>🔔 You have {trackRequests.length} tracking request(s) from doctors</h3>
          {trackRequests.map((req) => (
            <div key={req._id} className="request-card">
              <div className="request-info">
                <strong>{req.doctor.name}</strong>
                <p>{req.message || "Would like to track your wound data"}</p>
              </div>
              <div className="request-actions">
                <button
                  className="accept-btn"
                  onClick={() => handleRespondToRequest(req._id, true)}
                >
                  Accept
                </button>
                <button
                  className="reject-btn"
                  onClick={() => handleRespondToRequest(req._id, false)}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <main className="dashboard-content">
        {/* Wounds List */}
        <section className="wounds-section">
          <div className="section-header">
            <h2>🩹 My Wounds ({wounds.length})</h2>
            {wounds.length > 0 && (
              <button className="primary-btn" onClick={() => setShowNewWound(true)}>
                + Add New Wound
              </button>
            )}
          </div>

          {wounds.length === 0 ? (
            <div className="empty-state">
              <p>No wound data yet</p>
              <button className="primary-btn" onClick={() => setShowNewWound(true)}>
                Take First Wound Photo
              </button>
            </div>
          ) : (
            <div className="wounds-grid">
              {wounds.map((wound) => (
                <WoundCard
                  key={wound._id}
                  wound={wound}
                  isSelected={selectedWound?._id === wound._id}
                  onClick={() => handleSelectWound(wound)}
                  onUpdate={handleWoundUpdated}
                  onDelete={() => {
                    fetchWounds();
                    if (selectedWound?._id === wound._id) {
                      setSelectedWound(null);
                      setWoundProgress(null);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Selected Wound Details */}
        {selectedWound && (
          <section className="wound-details">
            <h2>{selectedWound.name}</h2>
            <div className="severity-display">
              <span
                className="severity-score"
                style={{ color: getSeverityColor(selectedWound.currentSeverity) }}
              >
                {selectedWound.currentSeverity}
              </span>
              <span className="severity-label">Severity Score</span>
            </div>

            {woundProgress && (
              <SeverityGraph progress={woundProgress.progress} />
            )}

            <div className="wound-actions">
              {selectedWound.status === "healed" ? (
                <div className="healed-notice">
                  ✅ Wound is healed - No further photo updates needed
                </div>
              ) : (
                <button
                  className="update-btn"
                  onClick={() => setShowUpdateWound(true)}
                >
                  📷 Update Wound Photo
                </button>
              )}
              <button
                className="consult-btn"
                onClick={() => setShowAIChat(true)}
              >
                🤖 AI Consultation
              </button>
            </div>
          </section>
        )}
      </main>

      {/* New Wound Modal */}
      {showNewWound &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowNewWound(false)}>
            <div className="modal modal-fullscreen" onClick={(e) => e.stopPropagation()}>
              <h2>Add New Wound</h2>
              <CameraPanel
                mode="new"
                onAnalysisComplete={handleWoundCreated}
                onCancel={() => setShowNewWound(false)}
              />
            </div>
          </div>,
          document.body
        )}

      {/* AI Chat Modal */}
      {showAIChat &&
        selectedWound &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowAIChat(false)}>
            <div className="modal chat-modal" onClick={(e) => e.stopPropagation()}>
              <AIConsultChat
                woundId={selectedWound._id}
                onClose={() => setShowAIChat(false)}
              />
            </div>
          </div>,
          document.body
        )}

      {/* Update Wound Modal */}
      {showUpdateWound &&
        selectedWound &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowUpdateWound(false)}>
            <div className="modal modal-fullscreen" onClick={(e) => e.stopPropagation()}>
              <h2>Update Wound Photo: {selectedWound.name}</h2>
              <CameraPanel
                mode="update"
                woundId={selectedWound._id}
                onAnalysisComplete={() => {
                  fetchWounds();
                  handleSelectWound(selectedWound);
                  setShowUpdateWound(false);
                }}
                onCancel={() => setShowUpdateWound(false)}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
