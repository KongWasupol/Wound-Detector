import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";

export const RoleSelectionPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSelectMode = (mode: "patient" | "doctor") => {
    localStorage.setItem("wound-preferred-mode", mode);
    if (mode === "doctor") {
      navigate("/doctor-dashboard");
    } else {
      navigate("/patient-dashboard");
    }
  };

  return (
    <div className="role-selection-page shell">
      <div className="glow one" />
      <div className="glow two" />
      
      <div className="role-selection-container">
        <header className="rs-header">
           <h1>Welcome, {user?.name}</h1>
           <p>Please select your usage mode</p>
        </header>

        <div className="role-cards">
          <button 
            className="role-card patient"
            onClick={() => handleSelectMode("patient")}
          >
            <div className="role-icon">🩹</div>
            <h2>Patient Mode</h2>
            <p>Track and manage your wounds</p>
          </button>

          <button 
            className="role-card doctor"
            onClick={() => handleSelectMode("doctor")}
          >
            <div className="role-icon">👨‍⚕️</div>
            <h2>Doctor Mode</h2>
            <p>Monitor and track your patients</p>
          </button>
        </div>

        <button onClick={logout} className="ghost logout-btn">
          Logout
        </button>
      </div>

      <style>{`
        .role-selection-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          color: white;
        }

        .role-selection-container {
          z-index: 10;
          text-align: center;
          width: 100%;
          max-width: 800px;
          padding: 2rem;
        }

        .rs-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(to right, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .rs-header p {
          color: #9ca3af;
          font-size: 1.1rem;
          margin-bottom: 3rem;
        }

        .role-cards {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3rem;
        }

        .role-card {
           background: rgba(17, 24, 39, 0.7);
           border: 1px solid rgba(255, 255, 255, 0.1);
           border-radius: 24px;
           padding: 3rem 2rem;
           width: 300px;
           cursor: pointer;
           transition: all 0.3s ease;
           display: flex;
           flex-direction: column;
           align-items: center;
           backdrop-filter: blur(12px);
        }

        .role-card:hover {
           transform: translateY(-5px);
           border-color: rgba(255, 255, 255, 0.2);
           box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .role-card.patient:hover {
           background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(17, 24, 39, 0.9));
           border-color: #22c55e;
        }

        .role-card.doctor:hover {
           background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(17, 24, 39, 0.9));
           border-color: #a855f7;
        }

        .role-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }

        .role-card h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: white;
        }

        .role-card p {
          color: #9ca3af;
          font-size: 0.9rem;
        }

        .logout-btn {
          opacity: 0.6;
        }
        .logout-btn:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};
