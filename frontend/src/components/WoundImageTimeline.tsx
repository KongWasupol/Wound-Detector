import { useState } from "react";

interface TimelineImage {
  id: string;
  imagePath: string;
  date: string;
  severity: number;
  summary?: string;
}

interface WoundImageTimelineProps {
  images: TimelineImage[];
  onImageClick?: (image: TimelineImage) => void;
}

export const WoundImageTimeline = ({ images, onImageClick }: WoundImageTimelineProps) => {
  const [selectedIndex, setSelectedIndex] = useState(images.length - 1);
  const API_HOST = import.meta.env.VITE_API_URL || "http://localhost:4000";

  if (!images || images.length === 0) {
    return (
      <div className="wound-timeline empty">
        <p>📷 No images yet</p>
      </div>
    );
  }

  const currentImage = images[selectedIndex];

  const getSeverityColor = (severity: number) => {
    if (severity >= 70) return "#ef4444";
    if (severity >= 40) return "#f59e0b";
    return "#22c55e";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getImageUrl = (path: string) => {
    if (!path) return "/placeholder.png";
    if (path.startsWith("http")) return path;
    
    // Handle full Windows paths like "D:\...\uploads\wound-xxx.png"
    // or relative paths like "uploads/wound-xxx.png"
    let filename = path;
    
    // Extract just the filename if it's a full path
    if (path.includes("\\") || path.includes("/")) {
      const parts = path.split(/[/\\]/);
      filename = parts[parts.length - 1];
    }
    
    return `${API_HOST}/uploads/${filename}`;
  };

  return (
    <div className="wound-timeline">
      <div className="wt-main-image">
        <img
          src={getImageUrl(currentImage.imagePath)}
          alt={`Wound - ${formatDate(currentImage.date)}`}
          onClick={() => onImageClick?.(currentImage)}
        />
        <div className="wt-image-info">
          <span className="wt-date">{formatDate(currentImage.date)}</span>
          <span
            className="wt-severity"
            style={{ backgroundColor: getSeverityColor(currentImage.severity) }}
          >
            {currentImage.severity}
          </span>
        </div>
      </div>

      {images.length > 1 && (
        <>
          <div className="wt-navigation">
            <button
              className="wt-nav-btn"
              disabled={selectedIndex === 0}
              onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
            >
              ← Previous
            </button>
            <span className="wt-position">
              {selectedIndex + 1} / {images.length}
            </span>
            <button
              className="wt-nav-btn"
              disabled={selectedIndex === images.length - 1}
              onClick={() => setSelectedIndex((i) => Math.min(images.length - 1, i + 1))}
            >
              Next →
            </button>
          </div>

          <div className="wt-thumbnails">
            {images.map((img, index) => (
              <div
                key={img.id}
                className={`wt-thumb ${index === selectedIndex ? "selected" : ""}`}
                onClick={() => setSelectedIndex(index)}
              >
                <img src={getImageUrl(img.imagePath)} alt="" />
                <div
                  className="wt-thumb-indicator"
                  style={{ backgroundColor: getSeverityColor(img.severity) }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {currentImage.summary && (
        <div className="wt-summary">
          <h5>📋 AI Summary</h5>
          <p>{currentImage.summary}</p>
        </div>
      )}
    </div>
  );
};
