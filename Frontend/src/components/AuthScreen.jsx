import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";

export default function AuthScreen({ onLogin, onGuest }) {
  const tab = "login";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Fill in all fields");
      return;
    }

    setError("");

    try {
      const { data } = await apiRequest(`/api/auth/${tab}`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin({ username, token: data.token });

    } catch (err) {
      setError(err.message || "Server not running");
    }
  };
  return (
    <div className="card">
      <div className="title">Fun Digit</div>

      <input
        placeholder="Username"
        value={username}
        onChange={(e)=>setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />

      <div>{error}</div>

      <button onClick={submit}>
        {tab==="login"?"Login":"Signup"}
      </button>

      <button onClick={onGuest}>Guest</button>
    </div>
  );
}
