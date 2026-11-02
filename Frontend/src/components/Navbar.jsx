import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const closeMobileMenu = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate("/login");
  };

  const scrollToSection = (id) => {
    closeMobileMenu();
    if (location.pathname !== "/") {
      navigate("/#" + id);
    } else {
      navigate("#" + id);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => element.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  };

  return (
    <nav className="fixed w-full top-0 left-0 z-50 bg-gradient-to-b from-black/90 to-black/70 backdrop-blur-xl border-b border-cyan-500/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => scrollToSection("top")} 
            className="flex-shrink-0 cursor-pointer outline-none hover:scale-105 transition-transform"
          >
            <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 text-transparent bg-clip-text">
              🎮 ViemIt
            </span>
          </button>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-2">
            <button 
              onClick={() => scrollToSection("top")} 
              className="nav-link px-3 py-2 rounded-md hover:bg-cyan-500/10"
            >
              🏠 Home
            </button>
            <button 
              onClick={() => scrollToSection("features")} 
              className="nav-link px-3 py-2 rounded-md hover:bg-cyan-500/10"
            >
              ⭐ Features
            </button>
            <button 
              onClick={() => scrollToSection("about")} 
              className="nav-link px-3 py-2 rounded-md hover:bg-cyan-500/10"
            >
              ℹ️ About
            </button>
            <button 
              onClick={() => scrollToSection("contact")} 
              className="nav-link px-3 py-2 rounded-md hover:bg-cyan-500/10"
            >
              ✉️ Contact
            </button>

            {isAuthenticated ? (
              <div className="border-l border-cyan-500/30 pl-4 ml-2 flex items-center space-x-2">
                <Link 
                  to="/game" 
                  className="nav-link px-3 py-2 rounded-md hover:bg-cyan-500/10"
                >
                  🎮 Play
                </Link>
                <Link 
                  to="/leaderboard" 
                  className="px-3 py-2 rounded-md text-cyan-300 font-bold hover:bg-purple-500/20"
                >
                  🏆 Leaderboard
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="px-4 py-2 rounded-md text-red-300 hover:text-red-200 hover:bg-red-500/10 font-bold transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            ) : (
              <div className="border-l border-cyan-500/30 pl-4 ml-2 flex items-center space-x-3">
                <Link 
                  to="/login" 
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white hover:text-cyan-300 transition-colors hover:bg-cyan-500/10"
                >
                  🔑 Login
                </Link>
                <Link 
                  to="/signup" 
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                >
                  ✨ Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-cyan-300 hover:text-cyan-200 focus:outline-none p-2 rounded-md hover:bg-cyan-500/10 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-gradient-to-b from-black/95 to-black/80 backdrop-blur-xl border-t border-cyan-500/30 animate-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button 
              onClick={() => scrollToSection("top")} 
              className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-cyan-300 hover:bg-cyan-500/10 w-full text-left transition-colors"
            >
              🏠 Home
            </button>
            <button 
              onClick={() => scrollToSection("features")} 
              className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-cyan-300 hover:bg-cyan-500/10 w-full text-left transition-colors"
            >
              ⭐ Features
            </button>
            <button 
              onClick={() => scrollToSection("about")} 
              className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-cyan-300 hover:bg-cyan-500/10 w-full text-left transition-colors"
            >
              ℹ️ About
            </button>
            <button 
              onClick={() => scrollToSection("contact")} 
              className="block px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-cyan-300 hover:bg-cyan-500/10 w-full text-left transition-colors"
            >
              ✉️ Contact
            </button>

            <div className="border-t border-cyan-500/20 mt-3 pt-3">
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/game" 
                    onClick={closeMobileMenu} 
                    className="block px-4 py-3 rounded-lg text-base font-medium text-cyan-300 hover:bg-cyan-500/10 w-full text-left transition-colors"
                  >
                    🎮 Play Game
                  </Link>
                  <Link 
                    to="/leaderboard" 
                    onClick={closeMobileMenu} 
                    className="block px-4 py-3 rounded-lg text-base font-medium text-purple-300 hover:bg-purple-500/10 w-full text-left transition-colors"
                  >
                    🏆 Leaderboard
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="block px-4 py-3 rounded-lg text-base font-medium text-red-300 hover:bg-red-500/10 w-full text-left transition-colors"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-2">
                  <Link 
                    to="/login" 
                    onClick={closeMobileMenu} 
                    className="py-3 px-4 rounded-lg text-center font-bold text-white hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  >
                    🔑 Login
                  </Link>
                  <Link 
                    to="/signup" 
                    onClick={closeMobileMenu} 
                    className="py-3 px-4 rounded-lg text-center font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                  >
                    ✨ Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
