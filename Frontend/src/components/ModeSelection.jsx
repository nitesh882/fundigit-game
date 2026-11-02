import { useNavigate } from "react-router-dom";


const ModeSelection = () => {
  const navigate = useNavigate();


  const modes = [
    { 
      id: "add", 
      label: "Addition", 
      icon: "➕",
      description: "Combine numbers together",
      hint: "Perfect for beginners"
    },
    { 
      id: "sub", 
      label: "Subtraction", 
      icon: "➖",
      description: "Find the difference",
      hint: "Build your skills"
    },
    { 
      id: "mul", 
      label: "Multiplication", 
      icon: "✖️",
      description: "Multiply your way to victory",
      hint: "Intermediate challenge"
    },
    { 
      id: "div", 
      label: "Division", 
      icon: "➗",
      description: "Split and conquer",
      hint: "Advanced difficulty"
    },
    {
      id: "fraction",
      label: "Fractions",
      icon: "½",
      description: "Add and subtract fractions",
      hint: "Work with numerators and denominators"
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-10">
      <div className="w-full max-w-4xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 text-transparent bg-clip-text">
            🎮 Choose Your Game Mode
          </h1>
          <p className="text-gray-400 text-lg">Select a game mode and prepare for an exciting challenge!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {modes.map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/game/level/${m.id}`)}
              className="group relative cursor-pointer"
            >
              <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-2 border-cyan-500/30 rounded-xl p-6 transition-all duration-300 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/50 hover:-translate-y-2">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 text-center">
                  {m.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-cyan-300 text-center">
                  {m.label}
                </h3>
                <p className="text-gray-400 text-sm text-center mb-3">
                  {m.description}
                </p>
                <div className="text-xs text-gray-500 text-center bg-cyan-900/20 rounded py-2 px-3">
                  {m.hint}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg text-gray-300 hover:text-white transition-all duration-300"
          >
            ← Back to Home
          </button>
        </div>

        {/* How to Play Hint */}
        <div className="mt-12 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6 text-center">
          <p className="text-gray-300">
            💡 <strong>Tip:</strong> Start with Addition if you're new to the game. Difficulty increases with each mode!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;
