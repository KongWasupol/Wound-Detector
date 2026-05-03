import { useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client.ts";
import { CameraPanel } from "./CameraPanel.tsx";
import type { Wound } from "../types";

interface WoundCardProps {
  wound: Wound;
  isSelected: boolean;
  onClick: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

export const WoundCard = ({ wound, isSelected, onClick, onUpdate, onDelete }: WoundCardProps) => {
  const [isUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getSeverityColor = (severity: number) => {
    if (severity >= 70) return "#ef4444";
    if (severity >= 40) return "#f59e0b";
    return "#22c55e";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Under Treatment";
      case "healed": return "Healed";
      case "worsening": return "Worsening";
      default: return status;
    }
  };

  const getWoundTypeLabel = (type: string) => {
    switch (type) {
      case "cut": return "Cut";
      case "burn": return "Burn";
      case "scratch": return "Scratch";
      case "bruise": return "Bruise";
      default: return "Other";
    }
  };

  const getWoundTypeIcon = (type: string) => {
    switch (type) {
      case "cut": return "🔪";
      case "burn": return "🔥";
      case "scratch": return "💅";
      case "bruise": return "💜";
      default: return "🩹";
    }
  };

  const handleUpdateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUpdateModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/patient/wounds/${wound._id}`);
      setShowDeleteConfirm(false);
      onDelete?.();
    } catch (error) {
      console.error("Failed to delete wound:", error);
    }
    setIsDeleting(false);
  };

  const API_HOST = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const imageSrc = wound.latestImagePath
    ? `${API_HOST}/${wound.latestImagePath.replace(/\\/g, "/")}`
    : "/wound-placeholder.png";

  return (
    <>
      <div
        className={`wound-card-mobile ${isSelected ? "selected" : ""}`}
        onClick={onClick}
      >
        <div className="wound-card-header">
          <img src={imageSrc} alt={wound.name} className="wound-thumb" />
          <div className="wound-header-info">
            <h3>{wound.name}</h3>
            <span className={`wound-type-badge type-${wound.woundType || 'other'}`}>
              {getWoundTypeIcon(wound.woundType)} {getWoundTypeLabel(wound.woundType)}
            </span>
          </div>
          <div className="wound-severity-circle" style={{ borderColor: getSeverityColor(wound.currentSeverity) }}>
            <span style={{ color: getSeverityColor(wound.currentSeverity) }}>{wound.currentSeverity}</span>
          </div>
        </div>

        <div className="wound-card-body">
          <div className="wound-status-row">
            <span className={`status-pill ${wound.status}`}>{getStatusLabel(wound.status)}</span>
            <span className="update-date">
              Updated: {new Date(wound.lastUpdated).toLocaleDateString("en-US")}
            </span>
          </div>
        </div>

        <div className="wound-card-actions">
          {wound.status !== "healed" ? (
            <button className="action-btn update" onClick={handleUpdateClick} disabled={isUpdating}>
              📷 {isUpdating ? "..." : "Update"}
            </button>
          ) : (
            <span className="healed-badge">✅ Healed</span>
          )}
          <button className="action-btn delete" onClick={handleDeleteClick} disabled={isDeleting}>
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
            <div className="modal modal-fullscreen" onClick={(e) => e.stopPropagation()}>
              <h2>Update Wound Photo: {wound.name}</h2>
              <CameraPanel
                mode="update"
                woundId={wound._id}
                onAnalysisComplete={() => {
                  onUpdate();
                  setShowUpdateModal(false);
                }}
                onCancel={() => setShowUpdateModal(false)}
              />
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation */}
      {showDeleteConfirm &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>⚠️ Confirm Deletion</h3>
              <p>Delete this wound and all its history?</p>
              <p className="wound-name-display">{wound.name}</p>
              <p className="warning-text">This action cannot be undone</p>
              <div className="modal-actions">
                <button className="confirm-delete-btn" onClick={handleConfirmDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "🗑️ Confirm Delete"}
                </button>
                <button className="cancel-outline-btn" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
