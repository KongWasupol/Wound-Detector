import { useState } from "react";
import type { FormEvent } from "react";
import { useCamera } from "../hooks/useCamera.ts";
import { api } from "../api/client.ts";
import type { Analysis } from "../types.ts";

type CameraPanelProps = {
  onAnalysisComplete: (analysis: Analysis) => void;
  mode?: "standalone" | "new" | "update";
  woundId?: string;
  onCancel?: () => void;
};

export const CameraPanel = ({ onAnalysisComplete, mode = "standalone", woundId, onCancel }: CameraPanelProps) => {
  const { videoRef, ready, start, capture, error } = useCamera();
  const [inputMode, setInputMode] = useState<"camera" | "upload">("camera");
  const [notes, setNotes] = useState("");
  const [woundName, setWoundName] = useState("");
  const [model, setModel] = useState<"gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo">("gpt-4o");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleCapture = () => {
    const img = capture();
    if (img) {
      setPreview(img);
      setStatus("Snapshot locked. Ready for analysis.");
    }
  };

  const uploadImage = async (imageBlob: Blob | File) => {
    setUploading(true);
    setStatus("Routing image through secure uplink...");
    const formData = new FormData();
    formData.append("image", imageBlob);
    if (notes) formData.append("notes", notes);
    formData.append("model", model);

    try {
      let response;
      if (mode === "new") {
        // Create new wound with optional name
        const generatedName = woundName.trim() || `Wound ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        formData.append("name", generatedName);
        response = await api.post("/patient/wounds", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (mode === "update" && woundId) {
        // Update existing wound
        response = await api.post(`/patient/wounds/${woundId}/update`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Standard analysis (standalone)
        response = await api.post<Analysis>("/analysis/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      onAnalysisComplete(response.data);
      setPreview(null);
      setSelectedFile(null);
      setNotes("");
      setWoundName("");
      setStatus("Analysis complete. Scroll to see fresh intel.");
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : "Upload failed. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!preview) {
      setStatus(inputMode === "camera" ? "Capture an image first." : "Select an image first.");
      return;
    }
    
    if (inputMode === "camera") {
      const blob = await (await fetch(preview)).blob();
      await uploadImage(blob);
    } else {
      if (selectedFile) {
        await uploadImage(selectedFile);
      } else {
        setStatus("Please select an image first.");
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      setStatus("Image selected. Ready to analyze.");
    };
    reader.readAsDataURL(file);
  };

  const isModal = mode === "new";

  return (
    <div className={isModal ? "camera-panel-compact" : "panel camera-panel"}>
      {!isModal && (
        <header>
          <p>Capture Bay</p>
          <h2>Image Analysis</h2>
        </header>
      )}

      <div className="input-mode-selector">
        <button
          type="button"
          onClick={() => {
            setInputMode("camera");
            if (!ready) start();
          }}
          className={inputMode === "camera" ? "active" : ""}
        >
          📷 Use Camera
        </button>
        <button
          type="button"
          onClick={() => {
            setInputMode("upload");
            setPreview(null);
            setSelectedFile(null);
          }}
          className={inputMode === "upload" ? "active" : ""}
        >
          📁 Upload Image
        </button>
      </div>

      <div className="camera-section">
        {inputMode === "camera" ? (
          <>
            <div className="camera-wrapper">
              <video ref={videoRef} autoPlay playsInline muted />
              {!ready && <div className="camera-overlay"><span>Need access to camera</span></div>}
              {error && <div className="camera-error"><span>{error}</span></div>}
            </div>
            <button type="button" onClick={start} className="ghost" style={{ width: "100%", marginBottom: "1rem" }}>
              {ready ? "Restart feed" : "Activate camera"}
            </button>
          </>
        ) : (
          <div className="upload-wrapper">
            <label className="file-upload-label-large">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="file-input"
              />
              <div className="file-upload-area">
                <div className="file-upload-icon">📁</div>
                <p>{uploading ? "Processing..." : "Click to choose image"}</p>
                <span>JPG, PNG supported</span>
              </div>
            </label>
            {preview && (
              <div className="preview-card">
                <img src={preview} alt="Preview" />
                <div>
                  <p>Image Ready</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="analysis-form">
        <div className="provider-infobar simple">
          <span>AI Model</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo")}
            className="model-selector"
          >
            <option value="gpt-4o">GPT-4o (Default)</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
        </div>

        {mode === "new" && (
          <label>
            <span style={{ fontSize: "0.9rem", color: "#c8ceff", marginBottom: "0.5rem", display: "block" }}>
              Wound Name
            </span>
            <input
              type="text"
              placeholder="e.g. Left arm cut (auto-generates if empty)"
              value={woundName}
              onChange={(e) => setWoundName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(15, 23, 42, 0.8)",
                color: "#f8fafc",
                fontSize: "0.95rem",
                marginBottom: "0.75rem",
              }}
            />
          </label>
        )}

        <label>
          <span style={{ fontSize: "0.9rem", color: "#c8ceff", marginBottom: "0.5rem", display: "block" }}>
            Add Notes (Optional)
          </span>
          <textarea
            placeholder="Describe the wound or symptoms..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
          />
        </label>

        {preview && inputMode === "camera" && (
          <div className="preview-card-compact">
            <img src={preview} alt="Preview" />
            <p>Snapshot Ready</p>
          </div>
        )}

        <div className="capture-actions">
          {inputMode === "camera" && (
            <button type="button" onClick={handleCapture} className="ghost">
              Take Photo
            </button>
          )}
          <button type="submit" disabled={uploading || !preview} className="primary-submit-btn">
            {uploading ? "Analyzing..." : "Analyze Wound"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="cancel-text-btn">
              Cancel
            </button>
          )}
        </div>
      </form>

      {status && <p className="status-line center">{status}</p>}
    </div>
  );
};

