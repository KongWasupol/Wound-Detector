import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { api } from "../api/client.ts";
import type { PatientWithStatus, Wound, WoundProgress, Analysis } from "../types";
import { SeverityGraph } from "../components/SeverityGraph.tsx";
import { DoctorStatsCard } from "../components/DoctorStatsCard.tsx";
import { TrackRequestsPanel } from "../components/TrackRequestsPanel.tsx";
import { WoundImageTimeline } from "../components/WoundImageTimeline.tsx";
import { socket } from "../api/socket";

type SeverityFilter = "all" | "critical" | "warning" | "improving";
type SortOption = "severity" | "name" | "wounds";

export const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStatus | null>(null);
  const [patientWounds, setPatientWounds] = useState<Wound[]>([]);
  const [selectedWound, setSelectedWound] = useState<Wound | null>(null);
  const [woundProgress, setWoundProgress] = useState<WoundProgress | null>(null);
  const [woundAnalyses, setWoundAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showTrackRequests, setShowTrackRequests] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("severity");
  const [patientToRemove, setPatientToRemove] = useState<PatientWithStatus | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const hasFetched = useRef(false);

  // Redirect only  // Redirect if not doctor role
  useEffect(() => {
    // If user has doctor role (in roles array or legacy role), they can be here.
    // We rely on ProtectedRoute to block unauthorized access, so we might not need strict redirect here
    // unless strict role enforcement is needed.
    const isDoctor = (user?.roles && user.roles.includes("doctor")) || user?.role === "doctor";
    if (user && !isDoctor) {
      navigate("/patient-dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSwitchToPatient = () => {
    localStorage.setItem("wound-preferred-mode", "patient");
    navigate("/patient-dashboard");
  };



  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get<PatientWithStatus[]>("/doctor/patients");
      setPatients(res.data);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        console.error("Failed to fetch patients:", error);
      }
    }
  }, []);

  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await api.get(`/doctor/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error("Failed to search patients:", error);
    }
    setSearching(false);
  }, []);

  // Connect to socket for notifications
  useEffect(() => {
    if (!user) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join_doctor_room");

    const handleUpdate = () => fetchPatients();

    socket.on("wound_created", handleUpdate);
    socket.on("wound_updated", handleUpdate);
    socket.on("track_request_response", handleUpdate);

    return () => {
      socket.off("wound_created", handleUpdate);
      socket.off("wound_updated", handleUpdate);
      socket.off("track_request_response", handleUpdate);
    };
  }, [user, fetchPatients]);

  const fetchPatientWounds = useCallback(async (patientId: string) => {
    try {
      const res = await api.get<Wound[]>(`/doctor/patients/${patientId}/wounds`);
      setPatientWounds(res.data);
    } catch (error) {
      console.error("Failed to fetch wounds:", error);
    }
  }, []);

  const fetchWoundDetails = useCallback(async (patientId: string, woundId: string) => {
    try {
      const [progressRes, detailsRes] = await Promise.all([
        api.get<WoundProgress>(`/doctor/patients/${patientId}/wounds/${woundId}/progress`),
        api.get<{ wound: Wound; analyses: Analysis[] }>(`/doctor/patients/${patientId}/wounds/${woundId}`),
      ]);
      setWoundProgress(progressRes.data);
      setWoundAnalyses(detailsRes.data.analyses || []);
    } catch (error) {
      console.error("Failed to fetch wound details:", error);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple fetches
    if (hasFetched.current) return;
    hasFetched.current = true;

    const hydrate = async () => {
      setLoading(true);
      await fetchPatients();
      setLoading(false);
    };
    hydrate();
  }, [fetchPatients]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchPatients(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchPatients]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = patients.length;
    const critical = patients.filter((p) => p.highestSeverity >= 70).length;
    const warning = patients.filter((p) => p.highestSeverity >= 40 && p.highestSeverity < 70).length;
    const improving = patients.filter((p) => p.highestSeverity < 40).length;
    const avgSeverity = total > 0 ? Math.round(patients.reduce((sum, p) => sum + p.highestSeverity, 0) / total) : 0;
    return { total, critical, warning, improving, avgSeverity };
  }, [patients]);

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    // Apply filter
    switch (severityFilter) {
      case "critical":
        result = result.filter((p) => p.highestSeverity >= 70);
        break;
      case "warning":
        result = result.filter((p) => p.highestSeverity >= 40 && p.highestSeverity < 70);
        break;
      case "improving":
        result = result.filter((p) => p.highestSeverity < 40);
        break;
    }

    // Apply sort
    switch (sortOption) {
      case "severity":
        result.sort((a, b) => b.highestSeverity - a.highestSeverity);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "wounds":
        result.sort((a, b) => b.activeWoundsCount - a.activeWoundsCount);
        break;
    }

    return result;
  }, [patients, severityFilter, sortOption]);

  // Prepare timeline images
  const timelineImages = useMemo(() => {
    return woundAnalyses.map((analysis) => ({
      id: analysis._id,
      imagePath: analysis.imagePath,
      date: analysis.createdAt,
      severity: analysis.severityScore,
      summary: analysis.summary,
    }));
  }, [woundAnalyses]);

  const handleSelectPatient = (patient: PatientWithStatus) => {
    setSelectedPatient(patient);
    setSelectedWound(null);
    setWoundProgress(null);
    setWoundAnalyses([]);
    fetchPatientWounds(patient._id);
  };

  const handleSelectWound = (wound: Wound) => {
    if (!selectedPatient) return;
    setSelectedWound(wound);
    fetchWoundDetails(selectedPatient._id, wound._id);
  };

  const handleRequestTrack = async (patientId: string) => {
    try {
      await api.post("/doctor/request-track", { patientId });
      searchPatients(searchQuery);
    } catch (error) {
      console.error("Failed to request track:", error);
    }
  };

  const handleRemovePatient = (patient: PatientWithStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setPatientToRemove(patient);
  };

  const confirmRemovePatient = async () => {
    if (!patientToRemove) return;
    setIsRemoving(true);
    try {
      await api.delete(`/doctor/patients/${patientToRemove._id}`);
      fetchPatients();
      if (selectedPatient?._id === patientToRemove._id) {
        setSelectedPatient(null);
        setPatientWounds([]);
        setSelectedWound(null);
        setWoundProgress(null);
      }
      setPatientToRemove(null);
    } catch (error) {
      console.error("Failed to remove patient:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 70) return "#ef4444";
    if (severity >= 40) return "#f59e0b";
    return "#22c55e";
  };

  const getSeverityLabel = (severity: number) => {
    if (severity >= 70) return "Critical";
    if (severity >= 40) return "Needs Monitoring";
    return "Improving";
  };

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  return (
    <div className="doctor-dashboard">
      <header className="top-bar">
        <div>
          <p>Hello</p>
          <strong>Dr. {user?.name}</strong>
          <span className="role-badge doctor">Doctor</span>
          {(user?.roles?.includes("patient") || user?.role === "patient") && (
            <button 
              onClick={handleSwitchToPatient} 
              className="mode-switch-btn patient-mode"
            >
              <span className="switch-icon">🩹</span>
              <span className="switch-text">Switch to Patient</span>
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            onClick={() => setShowTrackRequests(!showTrackRequests)}
            className="ghost notification-badge"
          >
            📤 Track Requests
          </button>
          <button onClick={logout} className="ghost">
            Logout
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="doctor-stats-grid">
        <DoctorStatsCard
          icon="👥"
          label="All Patients"
          value={stats.total}
          color="purple"
          suffix=" patients"
        />
        <DoctorStatsCard
          icon="🚨"
          label="Critical"
          value={stats.critical}
          color="red"
          suffix=" patients"
        />
        <DoctorStatsCard
          icon="⚠️"
          label="Needs Monitoring"
          value={stats.warning}
          color="yellow"
          suffix=" patients"
        />
        <DoctorStatsCard
          icon="💚"
          label="Improving"
          value={stats.improving}
          color="green"
          suffix=" patients"
        />
      </div>

      {/* Track Requests Panel */}
      {showTrackRequests && <TrackRequestsPanel onRefresh={fetchPatients} />}

      {/* Search Section */}
      <section className="search-section">
        <h3>🔍 Search Patients</h3>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        {searching && <p className="searching">Searching...</p>}

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((patient) => (
              <div key={patient._id} className="search-result-item">
                <div className="patient-info">
                  <img
                    src={patient.avatar || "/default-avatar.png"}
                    alt={patient.name}
                    className="avatar"
                  />
                  <div>
                    <strong>{patient.name}</strong>
                    <p>{patient.email}</p>
                  </div>
                </div>
                <div>
                  {patient.trackingStatus === "tracking" ? (
                    <span className="status-badge tracking">Tracking</span>
                  ) : patient.trackingStatus === "pending" ? (
                    <span className="status-badge pending">Pending Response</span>
                  ) : (
                    <button
                      className="track-btn"
                      onClick={() => handleRequestTrack(patient._id)}
                    >
                      Request to Track
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <main className="dashboard-content">
        {/* Patients List - Sorted by Severity */}
        <section className="patients-section">
          <h2>👥 Tracked Patients ({filteredPatients.length})</h2>

          {/* Filter & Sort Controls */}
          <div className="doctor-controls">
            <div className="filter-group">
              <label>Filter:</label>
              {(["all", "critical", "warning", "improving"] as const).map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${f === "critical" ? "danger" : f === "warning" ? "warning" : f === "improving" ? "success" : ""} ${severityFilter === f ? "active" : ""}`}
                  onClick={() => setSeverityFilter(f)}
                >
                  {f === "all" && "All"}
                  {f === "critical" && "🚨 Critical"}
                  {f === "warning" && "⚠️ Monitor"}
                  {f === "improving" && "💚 Improving"}
                </button>
              ))}
            </div>
            <div className="sort-group">
              <label>Sort by:</label>
              <select
                className="sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
              >
                <option value="severity">Severity</option>
                <option value="name">Name</option>
                <option value="wounds">Number of Wounds</option>
              </select>
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="empty-state">
              <p>No patients match the criteria</p>
              {severityFilter !== "all" && (
                <button className="ghost" onClick={() => setSeverityFilter("all")}>
                  View All
                </button>
              )}
            </div>
          ) : (
            <div className="patients-list">
              {filteredPatients.map((patient, index) => (
                <div
                  key={patient._id}
                  className={`patient-card enhanced ${selectedPatient?._id === patient._id ? "selected" : ""} ${patient.highestSeverity >= 70 ? "critical" : ""}`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="rank">{index + 1}</div>
                  <img
                    src={patient.avatar || "/default-avatar.png"}
                    alt={patient.name}
                    className="avatar"
                  />
                  <div className="patient-info">
                    <strong>{patient.name}</strong>
                    <p>{patient.activeWoundsCount} wounds to care for</p>
                  </div>
                  <div className="severity-badge" style={{ backgroundColor: getSeverityColor(patient.highestSeverity) }}>
                    <span className="score">{patient.highestSeverity}</span>
                    <span className="label">{getSeverityLabel(patient.highestSeverity)}</span>
                  </div>
                  <button
                    className="tr-cancel-btn"
                    onClick={(e) => handleRemovePatient(patient, e)}
                    title="Stop Tracking"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Selected Patient Details */}
        {selectedPatient && (
          <section className="patient-details">
            <h2>{selectedPatient.name}</h2>
            <p>Email: {selectedPatient.email}</p>

            {/* Patient Summary Panel */}
            <div className="patient-summary-panel">
              <div className="psp-header">
                <h4>📊 Summary</h4>
              </div>
              <div className="psp-stats">
                <div className="psp-stat">
                  <span className="psp-stat-value primary">{patientWounds.length}</span>
                  <span className="psp-stat-label">All Wounds</span>
                </div>
                <div className="psp-stat">
                  <span className="psp-stat-value danger">
                    {patientWounds.filter((w) => w.status === "worsening").length}
                  </span>
                  <span className="psp-stat-label">Worsening</span>
                </div>
                <div className="psp-stat">
                  <span className="psp-stat-value warning">
                    {patientWounds.filter((w) => w.status === "active").length}
                  </span>
                  <span className="psp-stat-label">Under Treatment</span>
                </div>
                <div className="psp-stat">
                  <span className="psp-stat-value success">
                    {patientWounds.filter((w) => w.status === "healed").length}
                  </span>
                  <span className="psp-stat-label">Healed</span>
                </div>
              </div>
            </div>

            <h3>🩹 All Wounds</h3>
            <div className="wounds-list">
              {patientWounds.map((wound) => (
                <div
                  key={wound._id}
                  className={`wound-item ${selectedWound?._id === wound._id ? "selected" : ""}`}
                  onClick={() => handleSelectWound(wound)}
                >
                  <div className="wound-name">{wound.name}</div>
                  <div
                    className="wound-severity"
                    style={{ color: getSeverityColor(wound.currentSeverity) }}
                  >
                    {wound.currentSeverity}
                  </div>
                  <div className={`wound-status ${wound.status}`}>
                    {wound.status === "active" && "Under Treatment"}
                    {wound.status === "healed" && "Healed"}
                    {wound.status === "worsening" && "Worsening"}
                  </div>
                </div>
              ))}
            </div>

            {/* Wound Progress */}
            {selectedWound && woundProgress && (
              <div className="wound-progress">
                <h3>📊 Progress of {selectedWound.name}</h3>
                <SeverityGraph progress={woundProgress.progress} />

                {/* Image Timeline */}
                {timelineImages.length > 0 && (
                  <>
                    <h4 style={{ margin: "1.5rem 0 0.5rem", fontSize: "0.95rem" }}>
                      📸 Image Timeline
                    </h4>
                    <WoundImageTimeline images={timelineImages} />
                  </>
                )}

                {/* AI Insights */}
                {woundAnalyses.length > 0 && woundAnalyses[0].insights && (
                  <div className="ai-insights-panel">
                    <div className="aip-header">
                      <span>🤖</span>
                      <h4>AI Insights (Latest)</h4>
                    </div>
                    <div className="aip-content">
                      {woundAnalyses[0].insights.slice(0, 3).map((insight, i) => (
                        <div key={i} className="aip-item">
                          <span className="aip-item-icon">•</span>
                          <span>
                            <strong>{insight.label}:</strong> {insight.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Remove Patient Confirmation Modal */}
      {patientToRemove &&
        createPortal(
          <div className="modal-overlay" onClick={() => setPatientToRemove(null)}>
            <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>⚠️ Stop Tracking Patient</h3>
              <p>Are you sure you want to stop tracking this patient?</p>
              <p className="wound-name-display">{patientToRemove.name}</p>
              <p className="warning-text">You can request to track again later</p>
              <div className="modal-actions">
                <button
                  className="confirm-delete-btn"
                  onClick={confirmRemovePatient}
                  disabled={isRemoving}
                >
                  {isRemoving ? "Removing..." : "✕ Stop Tracking"}
                </button>
                <button
                  className="cancel-outline-btn"
                  onClick={() => setPatientToRemove(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
