import { useState } from "react";
import type { Analysis } from "../types.ts";
import { api } from "../api/client.ts";
import { useCamera } from "../hooks/useCamera.ts";

type Props = {
  analysis: Analysis;
  onNewAnalysis: (analysis: Analysis) => void;
};

export const SymptomTracker = ({ analysis, onNewAnalysis }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [inputMode, setInputMode] = useState<"camera" | "upload">("upload");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { videoRef, ready, start, capture, error: cameraError } = useCamera();

  const uploadImage = async (imageBlob: Blob | File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", imageBlob);
      if (notes) formData.append("notes", notes);
      formData.append("symptomId", analysis.symptomId || analysis._id);
      formData.append("model", analysis.model || "gpt-4o");

      const { data } = await api.post<Analysis>("/analysis/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onNewAnalysis(data);
      setShowForm(false);
      setNotes("");
      setPreview(null);
      setSelectedFile(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload follow-up");
    } finally {
      setUploading(false);
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
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    const img = capture();
    if (img) {
      setPreview(img);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!preview) {
      setError("Please select or capture an image first.");
      return;
    }

    if (inputMode === "camera") {
      const blob = await (await fetch(preview)).blob();
      await uploadImage(blob);
    } else {
      if (selectedFile) {
        await uploadImage(selectedFile);
      } else {
        setError("Please select an image first.");
      }
    }
  };

  return (
    <div className="symptom-tracker">
      <button
        type="button"
        onClick={() => {
          setShowForm(!showForm);
          if (!showForm) {
            setInputMode("upload");
            setPreview(null);
            setSelectedFile(null);
          }
        }}
        className="track-symptom-btn"
      >
        {showForm ? "Cancel" : "Track Follow-up Symptom"}
      </button>

      {showForm && (
        <div className="tracker-form">
          <div className="input-mode-selector">
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
          </div>

          {inputMode === "camera" ? (
            <div className="tracker-camera">
              <div className="camera-wrapper-small">
                <video ref={videoRef} autoPlay playsInline muted />
                {!ready && <span className="camera-overlay">Click "Activate Camera" to start</span>}
                {cameraError && <span className="camera-error">{cameraError}</span>}
              </div>
              <div className="camera-controls">
                <button type="button" onClick={start} className="ghost" disabled={uploading}>
                  {ready ? "Restart Camera" : "Activate Camera"}
                </button>
                <button
                  type="button"
                  onClick={handleCameraCapture}
                  disabled={!ready || uploading}
                  className="capture-btn"
                >
                  Take Photo
                </button>
              </div>
              {preview && (
                <div className="preview-card-small">
                  <img src={preview} alt="Preview" />
                </div>
              )}
            </div>
          ) : (
            <>
              <label className="file-upload-label">
                <span>Choose Image File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="file-input"
                />
                <div className="file-upload-button">
                  {uploading ? "Processing..." : "Choose Image from Device"}
                </div>
              </label>
              {preview && (
                <div className="preview-card-small">
                  <img src={preview} alt="Preview" />
                </div>
              )}
            </>
          )}

          <label>
            <span>Follow-up Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe any changes or new symptoms..."
              rows={3}
              disabled={uploading}
            />
          </label>
          
          {preview && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={uploading}
              className="track-symptom-btn"
              style={{ marginTop: "1rem", width: "100%" }}
            >
              {uploading ? "Analyzing…" : "Send to AI"}
            </button>
          )}
          
          {error && <p className="tracker-error">{error}</p>}
        </div>
      )}
    </div>
  );
};

