import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/apiClient";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      console.log("Sending login request...", { email });
      const { data } = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      login(data.user, data.token);
      navigate("/game");
    } catch (err) {
      setError(err.message || "Failed to connect to server");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 px-4">
      <div className="card-container">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gaming-primary to-gaming-secondary text-transparent bg-clip-text">
          Welcome Back
        </h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg mb-6 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Email Address</label>
            <input
              type="email"
              className="input-field text-left"
              placeholder="gamer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Password</label>
            <input
              type="password"
              className="input-field text-left"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="w-full btn-primary mt-4">
            Start Game
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          New player?{" "}
          <Link to="/signup" className="text-gaming-primary hover:text-gaming-secondary font-bold">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
