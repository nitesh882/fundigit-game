import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/apiClient";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(null);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => () => inFlight.current?.abort(), []);

  const handleSignup = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setPending(true);
    setError("");
    try {
      const { data } = await apiRequest("/api/auth/signup", {
        method: "POST", signal: controller.signal,
        body: JSON.stringify({ username: username.trim(), email: email.trim().toLowerCase(), password }),
      });
      if (controller.signal.aborted) return;
      if (!data?.token || !data?.user) throw new Error("The server returned an invalid signup response.");
      login(data.user, data.token);
      navigate("/game", { replace: true });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || "Unable to connect. Please try again.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
      if (inFlight.current === controller) inFlight.current = null;
    }
  };

  if (isAuthenticated) return <Navigate to="/game" replace />;
  return (
    <main className="min-h-screen flex items-center justify-center pt-24 pb-10 px-4">
      <div className="card-container">
        <h1 className="text-3xl font-bold text-center mb-8 text-cyan-300">Create Your Account</h1>
        {error && <p role="alert" className="bg-red-500/15 border border-red-400/50 text-red-200 p-3 rounded-lg mb-6">{error}</p>}
        <form onSubmit={handleSignup} className="space-y-4" aria-busy={pending}>
          <div>
            <label htmlFor="signup-username" className="block text-slate-300 text-sm mb-2">Username</label>
            <input id="signup-username" name="username" type="text" autoComplete="nickname" minLength={3} maxLength={30} className="input-field text-left" value={username} onChange={(event) => setUsername(event.target.value)} required disabled={pending} />
          </div>
          <div>
            <label htmlFor="signup-email" className="block text-slate-300 text-sm mb-2">Email Address</label>
            <input id="signup-email" name="email" type="email" autoComplete="username" maxLength={254} className="input-field text-left" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={pending} />
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-slate-300 text-sm mb-2">Password</label>
            <input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} aria-describedby="password-hint" className="input-field text-left" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={pending} />
            <p id="password-hint" className="mt-2 text-xs text-slate-400">Use at least 8 characters (up to 72 UTF-8 bytes).</p>
          </div>
          <button type="submit" disabled={pending} className="w-full btn-primary mt-6">{pending ? "Creating Account…" : "Sign Up"}</button>
        </form>
        <p className="mt-6 text-center text-slate-300 text-sm">Already have an account? <Link to="/login" className="text-cyan-300 font-bold">Login here</Link></p>
      </div>
    </main>
  );
}
