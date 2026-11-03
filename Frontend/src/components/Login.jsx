import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/apiClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const requestedPath = location.state?.from;
  const destination = typeof requestedPath === "string" && (requestedPath.startsWith("/game") || requestedPath === "/leaderboard") ? requestedPath : "/game";

  useEffect(() => () => inFlight.current?.abort(), []);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setPending(true);
    setError("");
    try {
      const { data } = await apiRequest("/api/auth/login", {
        method: "POST", signal: controller.signal,
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (controller.signal.aborted) return;
      if (!data?.token || !data?.user) throw new Error("The server returned an invalid login response.");
      login(data.user, data.token);
      navigate(destination, { replace: true });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || "Unable to connect. Please try again.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
      if (inFlight.current === controller) inFlight.current = null;
    }
  };

  if (isAuthenticated) return <Navigate to={destination} replace />;
  return (
    <main className="min-h-screen flex items-center justify-center pt-24 pb-10 px-4">
      <div className="card-container">
        <h1 className="text-3xl font-bold text-center mb-8 text-cyan-300">Welcome Back</h1>
        {error && <p role="alert" className="bg-red-500/15 border border-red-400/50 text-red-200 p-3 rounded-lg mb-6">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-6" aria-busy={pending}>
          <div>
            <label htmlFor="login-email" className="block text-slate-300 text-sm mb-2">Email Address</label>
            <input id="login-email" name="email" type="email" autoComplete="username" maxLength={254} className="input-field text-left" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={pending} />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-slate-300 text-sm mb-2">Password</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" className="input-field text-left" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={pending} />
          </div>
          <button type="submit" disabled={pending} className="w-full btn-primary">{pending ? "Signing In…" : "Start Game"}</button>
        </form>
        <p className="mt-6 text-center text-slate-300 text-sm">New player? <Link to="/signup" className="text-cyan-300 font-bold">Create Account</Link></p>
      </div>
    </main>
  );
}
