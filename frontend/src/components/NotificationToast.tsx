import { useEffect, useState } from "react";
import { socket } from "../api/socket.ts";
import { useAuth } from "../context/AuthContext.tsx";

type Notification = {
  id: string;
  patientName: string;
  analysisId: string;
  severity: number;
};

export const NotificationToast = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Check for clinician role (or doctor/researcher if needed)
    if (user?.role === "doctor") {
      socket.connect();
      socket.emit("join_doctor_room");

      socket.on("analysis_created", (data: Omit<Notification, "id">) => {
        const newNotification = { ...data, id: Date.now().toString() };
        setNotifications((prev) => [...prev, newNotification]);

        // Auto-dismiss after 8 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
        }, 8000);
      });
    }

    return () => {
      socket.off("analysis_created");
      socket.disconnect();
    };
  }, [user]);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((n) => (
        <div key={n.id} className="notification-toast">
          <div className="notification-dot" />
          <div className="notification-content">
            <p className="notification-title">New Analysis Uploaded</p>
            <p className="notification-body">
              Patient <strong>{n.patientName}</strong> just submitted a scan.
            </p>
            <p className={`notification-meta ${n.severity > 7 ? 'high' : n.severity > 4 ? 'medium' : 'low'}`}>
              Severity Score: {n.severity}/10
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
