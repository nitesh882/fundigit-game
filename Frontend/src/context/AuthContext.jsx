/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authRequest } from "@/lib/apiClient";

const AuthContext = createContext(null);

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
};

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => ({ user: null, loading: Boolean(localStorage.getItem("token")), error: "" }));
  const [verification, setVerification] = useState(0);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setState({ user: null, loading: false, error: "" });
  }, []);

  const login = useCallback((user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setState({ user, loading: false, error: "" });
  }, []);

  useEffect(() => {
    window.addEventListener("auth:expired", logout);
    const onStorage = (event) => {
      if ((event.key === "token" && !event.newValue) || (event.key === null && !localStorage.getItem("token"))) logout();
      else if (event.key === "token") {
        setState({ user: null, loading: true, error: "" });
        setVerification((value) => value + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth:expired", logout);
      window.removeEventListener("storage", onStorage);
    };
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;
    const controller = new AbortController();
    const verify = async () => {
      try {
        const { data } = await authRequest("/api/auth/me", { signal: controller.signal });
        if (controller.signal.aborted || localStorage.getItem("token") !== token) return;
        localStorage.setItem("user", JSON.stringify(data));
        setState({ user: data, loading: false, error: "" });
      } catch (error) {
        if (controller.signal.aborted || error.name === "AbortError" || localStorage.getItem("token") !== token) return;
        if (error.status === 401 || !localStorage.getItem("token")) logout();
        else setState({ user: null, loading: false, error: "Unable to verify your session. Check the backend connection and retry." });
      }
    };
    void verify();
    return () => controller.abort();
  }, [logout, verification]);

  return (
    <AuthContext.Provider value={{ ...state, isAuthenticated: Boolean(state.user), login, logout }}>
      {state.loading ? (
        <main className="min-h-screen flex items-center justify-center px-4" aria-live="polite">Checking your session…</main>
      ) : state.error ? (
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="card-container text-center space-y-5">
            <p role="alert">{state.error}</p>
            <button className="btn-primary" onClick={() => {
              setState((current) => ({ ...current, loading: true, error: "" }));
              setVerification((value) => value + 1);
            }}>Retry Connection</button>
            <button className="btn-secondary ml-3" onClick={logout}>Sign Out</button>
          </div>
        </main>
      ) : children}
    </AuthContext.Provider>
  );
}
