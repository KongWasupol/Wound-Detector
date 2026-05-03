import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext.tsx";

export const AuthPanel = () => {
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const API_HOST = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const handleGoogleLogin = () => {
    window.location.href = `${API_HOST.replace(/\/$/, "")}/api/auth/google`;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
    } catch (err) {
      console.error("[AuthPanel] Login/Register error:", err);
      const defaultError = mode === "login" 
        ? "Invalid email or password. Please try again." 
        : "Registration failed. Please check your information and try again.";
      setError(err instanceof Error ? err.message : defaultError);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-headline">
        <p>Wound Detector</p>
        <h1>{mode === "login" ? "Welcome Back" : "Get Started"}</h1>
        <span>{mode === "login" ? "Sign in to continue your analysis" : "Create your account to start analyzing"}</span>
      </div>

      <div className="google-auth-section">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="google-login-btn"
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 18 18" style={{ marginRight: "0.75rem" }}>
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.585-5.04-3.716H.957v2.332C2.438 15.983 5.482 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.96 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.172.282-1.712V4.956H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.044l3.003-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.956L3.96 7.288C4.67 5.157 6.653 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "register" && (
          <label>
            <span>Full Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Enter your full name"
              required
              autoComplete="name"
            />
          </label>
        )}
        <label>
          <span>Email Address</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="your.email@example.com"
            required
            autoComplete="email"
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            minLength={6}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            placeholder={mode === "login" ? "Enter your password" : "At least 6 characters"}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {mode === "register" && (
            <small className="input-hint">Must be at least 6 characters long</small>
          )}
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Sign In"
            : "Create Account"}
        </button>
      </form>

      <div className="auth-toggle">
        <span>{mode === "login" ? "Don't have an account?" : "Already have an account?"}</span>
        <button
          type="button"
          onClick={() => {
            setMode((prev) => (prev === "login" ? "register" : "login"));
            setError(null);
            setForm({ name: "", email: "", password: "" });
          }}
        >
          {mode === "login" ? "Sign Up" : "Sign In"}
        </button>
      </div>
    </div>
  );
};

