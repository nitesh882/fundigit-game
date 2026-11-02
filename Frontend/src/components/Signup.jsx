import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/apiClient";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    try {
      console.log("Sending signup request...", { username, email });
      const { data } = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
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
          Create Your Account
        </h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg mb-6 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Username</label>
            <input
              type="text"
              className="input-field text-left"
              placeholder="ProGamer123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

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

          <button type="submit" className="w-full btn-primary mt-6">
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-gaming-primary hover:text-gaming-secondary font-bold">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
