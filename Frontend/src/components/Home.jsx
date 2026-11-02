import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const Home = () => {
  const location = useLocation();
  const [contactFeedback, setContactFeedback] = useState("");

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactFeedback("✓ Message Sent Successfully! We will get back to you soon.");
    e.target.reset();
    setTimeout(() => setContactFeedback(""), 5000);
  };

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } else if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section id="top" className="relative h-screen flex items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="mb-6 inline-block">
            <span className="text-6xl animate-bounce">🎮</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 text-transparent bg-clip-text animate-pulse">
            Enter the Ultimate Gaming World
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Test your math skills in real-time, challenge your friends, and climb the leaderboard in the most exciting digit game arena. 
            <span className="block mt-2 text-cyan-300">⚡ Lightning-fast gameplay • 🏆 Competitive ranking • 🎯 Progressive difficulty</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="btn-primary inline-block text-lg px-10 py-4 hover:scale-105 transform transition">
              🚀 Play Now
            </Link>
            <a href="#features" className="btn-secondary inline-block text-lg px-10 py-4 hover:scale-105 transform transition">
              Learn More ↓
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-black/50 to-black/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 text-transparent bg-clip-text">
            🌟 Game Features
          </h2>
          <p className="text-center text-gray-400 mb-16 text-lg">Experience gaming like never before</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Dynamic Modes", icon: "⚔️", desc: "Addition, Subtraction, Multiplication, Division & Fractions." },
              { title: "Leaderboard System", icon: "🏆", desc: "Compete for the top spot globally across all modes." },
              { title: "Secure Login", icon: "🔒", desc: "JWT authenticated user profiles and match history." },
              { title: "Real-Time Gameplay", icon: "⚡", desc: "Instant feedback, timers, and fast-paced action." }
            ].map((feature, idx) => (
              <div key={idx} className="group relative card-container text-center cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2 text-cyan-300">{feature.title}</h3>
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-black/40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "10K+", label: "Active Players" },
              { number: "50K+", label: "Questions Solved" },
              { number: "24/7", label: "Availability" },
              { number: "100%", label: "Fun Guaranteed" }
            ].map((stat, idx) => (
              <div key={idx} className="p-4">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 text-transparent bg-clip-text">
                  {stat.number}
                </div>
                <div className="text-gray-400 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
            About ViemIt
          </h2>
          <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 rounded-xl p-8">
            <p className="text-lg text-gray-300 leading-relaxed mb-4">
              🎓 <strong>ViemIt</strong> is a premier platform designed for math enthusiasts and gamers alike. We combine educational value with competitive fun, creating an environment where learning meets gaming.
            </p>
            <p className="text-lg text-gray-400 leading-relaxed">
              Our mission is to make numbers fun again through interactive challenges, personalized difficulty levels, and a vibrant community of players worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-black/50 scroll-mt-20">
        <div className="max-w-lg mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 text-transparent bg-clip-text">
            Get in Touch
          </h2>
          <p className="text-center text-gray-400 mb-8">We would love to hear from you!</p>

          <form onSubmit={handleContactSubmit} className="card-container space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2 text-left">Your Name</label>
              <input
                type="text"
                placeholder="Alex Morgan"
                required
                className="input-field text-left"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2 text-left">Your Email</label>
              <input
                type="email"
                placeholder="alex@example.com"
                required
                className="input-field text-left"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2 text-left">Your Message</label>
              <textarea
                placeholder="How can we help?"
                rows="4"
                required
                className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 focus:outline-none transition-all"
              ></textarea>
            </div>
            
            {contactFeedback && (
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500 text-green-300 text-sm text-center">
                {contactFeedback}
              </div>
            )}
            
            <button type="submit" className="w-full btn-primary text-lg mt-2">
              📨 Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/80 border-t border-cyan-500/20 py-8 text-center text-gray-400">
        <p>© 2026 ViemIt - Where Numbers Meet Fun. All rights reserved.</p>
        <div className="mt-4 space-x-4">
          <a href="#top" className="hover:text-cyan-400 transition">Back to Top</a>
          <span>•</span>
          <a href="#features" className="hover:text-cyan-400 transition">Features</a>
          <span>•</span>
          <a href="#contact" className="hover:text-cyan-400 transition">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
