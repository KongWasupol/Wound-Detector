import { createContext, useContext, useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { api, setAuthHeader } from "../api/client.ts";

type User = {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  roles?: string[];
  avatar?: string;
};

type AuthContextShape = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

const storageKey = "wound-auth";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored).user : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : null;

    // Ensure axios has the auth header synchronously on first load
    if (parsed?.token) {
      setAuthHeader(parsed.token);
    }

    return parsed?.token ?? null;
  });
  const [loading, setLoading] = useState(false);

  // Handle OAuth callback from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    const userParam = urlParams.get("user");

    if (tokenParam && userParam && !token) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        
        // Save to localStorage immediately (synchronously) before any redirect
        localStorage.setItem(storageKey, JSON.stringify({ token: tokenParam, user: userData }));
        
        // Set auth header immediately
        setAuthHeader(tokenParam);
        
        // Update state
        setToken(tokenParam);
        setUser(userData);
        
        // Get base path (e.g., /wound-detector from /wound-detector/auth/callback)
        const currentPath = window.location.pathname;
        const basePath = currentPath.replace(/\/auth\/callback.*$/, '') || '/';
        
        // Clean URL without full page reload - React will handle the state update
        window.history.replaceState({}, "", basePath);
      } catch (err) {
        console.error("Failed to parse OAuth callback", err);
        // Redirect to base path on error
        const currentPath = window.location.pathname;
        const basePath = currentPath.replace(/\/auth\/callback.*$/, '') || '/';
        window.location.replace(basePath);
      }
    }
  }, [token]);

  useEffect(() => {
    setAuthHeader(token);
    if (token && user) {
      localStorage.setItem(storageKey, JSON.stringify({ token, user }));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [token, user]);

  const handleAuth = async (endpoint: "login" | "register", body: object) => {
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/${endpoint}`, body);
      setUser(data.user);
      setToken(data.token);
    } catch (err: any) {
      // Log error for debugging
      console.error(`[auth] ${endpoint} error:`, err);
      
      // Check for network errors
      if (!err.response) {
        throw new Error("Unable to connect to server. Please check your connection.");
      }
      
      // Use default error messages for better UX
      const defaultMessage = endpoint === "login" 
        ? "Invalid email or password. Please try again." 
        : "Registration failed. Please check your information and try again.";
      
      throw new Error(defaultMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(storageKey);
    delete api.defaults.headers.common.Authorization;
  };

  // Add interceptor to handle 401s
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const value = useMemo<AuthContextShape>(
    () => ({
      user,
      token,
      loading,
      login: (payload) => handleAuth("login", payload),
      register: (payload) => handleAuth("register", payload),
      logout,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

