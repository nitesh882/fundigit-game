import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Home from "@/components/Home";
import Login from "@/components/Login";
import Signup from "@/components/Signup";
import PrivateRoute from "@/components/PrivateRoute";
import ModeSelection from "@/components/ModeSelection";
import LevelSelection from "@/components/LevelSelection";
import GameBoard from "@/components/GameBoard";
import Leaderboard from "@/components/Leaderboard";
import NotFound from "@/components/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/game" element={<ModeSelection />} />
            <Route path="/game/level/:mode" element={<LevelSelection />} />
            <Route path="/game/play/:mode/:level" element={<GameBoard />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
