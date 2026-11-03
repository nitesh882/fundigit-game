import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const sections = [["/#top", "Home"], ["/#features", "Features"], ["/#how-to-play", "How to Play"], ["/#about", "About"]];

export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef(null);
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const signOut = () => {
    logout();
    close();
    navigate("/login");
  };

  const links = (mobile = false) => (
    <>
      {sections.map(([to, label]) => <Link key={to} to={to} onClick={close} className={mobile ? "rounded-lg px-4 py-3 text-slate-200 hover:bg-cyan-500/10" : "nav-link rounded-lg px-3 py-2 hover:bg-cyan-500/10"}>{label}</Link>)}
      {isAuthenticated ? (
        <>
          <Link to="/game" onClick={close} className="rounded-lg px-4 py-3 font-bold text-cyan-200 hover:bg-cyan-500/10">Play</Link>
          <Link to="/leaderboard" onClick={close} className="rounded-lg px-4 py-3 font-bold text-cyan-200 hover:bg-cyan-500/10">Leaderboard</Link>
          <button type="button" onClick={signOut} className="rounded-lg px-4 py-3 text-left font-bold text-red-200 hover:bg-red-500/10">Logout</button>
        </>
      ) : (
        <>
          <Link to="/login" onClick={close} className="rounded-lg px-4 py-3 font-bold text-cyan-100 hover:bg-cyan-500/10">Login</Link>
          <Link to="/signup" onClick={close} className="rounded-lg bg-cyan-400 px-4 py-2 text-center font-bold text-slate-950">Create Account</Link>
        </>
      )}
    </>
  );

  return (
    <nav aria-label="Main navigation" className="fixed inset-x-0 top-0 z-50 border-b border-cyan-500/20 bg-slate-950/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" onClick={close} className="shrink-0 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-2xl font-bold text-transparent">🎮 ViemIt</Link>
        <div className="hidden items-center gap-1 lg:flex">{links()}</div>
        <button ref={toggleRef} type="button" aria-label={isOpen ? "Close menu" : "Open menu"} aria-expanded={isOpen} aria-controls="mobile-navigation" onClick={() => setIsOpen((open) => !open)} className="rounded-lg border border-cyan-500/30 px-3 py-2 font-bold text-cyan-100 lg:hidden">{isOpen ? "✕" : "☰"}</button>
      </div>
      {isOpen && <div id="mobile-navigation" className="flex max-h-[calc(100svh-4rem)] flex-col gap-1 overflow-y-auto border-t border-cyan-500/20 bg-slate-950 px-4 py-3 lg:hidden">{links(true)}</div>}
    </nav>
  );
}
