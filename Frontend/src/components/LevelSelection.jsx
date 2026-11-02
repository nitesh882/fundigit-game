import { useNavigate, useParams } from "react-router-dom";


const LevelSelection = () => {
  const navigate = useNavigate();
  const { mode } = useParams();


  const levels = [
    { 
      id: "easy", 
      label: "Easy", 
      icon: "🌱",
      description: "Perfect for warming up",
      difficulty: "▶ ○ ○",
      time: "30 seconds"
    },
    { 
      id: "medium", 
      label: "Medium", 
      icon: "🔥",
      description: "Test your skills",
      difficulty: "▶ ▶ ○",
      time: "20 seconds"
    },
    { 
      id: "hard", 
      label: "Hard", 
      icon: "⚡",
      description: "Ultimate challenge",
      difficulty: "▶ ▶ ▶",
      time: "10 seconds"
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-10">
      <div className="w-full max-w-3xl px-4">
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">
            {mode === 'add' && '➕'}
            {mode === 'sub' && '➖'}
            {mode === 'mul' && '✖️'}
            {mode === 'div' && '➗'}
            {mode === 'fraction' && '½'}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 text-transparent bg-clip-text capitalize">
            {mode === 'fraction' ? 'Fractions' : mode} Mode
          </h1>
          <p className="text-gray-400 text-lg">Choose your difficulty level</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {levels.map((l) => (
            <div
              key={l.id}
              onClick={() => navigate(`/game/play/${mode}/${l.id}`)}
              className="group relative cursor-pointer"
            >
              <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-2 border-cyan-500/30 rounded-xl p-6 transition-all duration-300 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/50 hover:-translate-y-2">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 text-center">
                  {l.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-cyan-300 text-center">
                  {l.label}
                </h3>
                <p className="text-gray-400 text-sm text-center mb-4">
                  {l.description}
                </p>
                <div className="space-y-2">
                  <div className="text-xs text-gray-400">
                    <span className="font-semibold">Difficulty:</span> {l.difficulty}
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className="font-semibold">⏱️ Time/Question:</span> {l.time}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-cyan-500/20">
                  <button className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all duration-300">
                    Play Now →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mb-8">
          <button
            onClick={() => navigate("/game")}
            className="px-8 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg text-gray-300 hover:text-white transition-all duration-300"
          >
            ← Back to Game Modes
          </button>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-purple-300">💡 Pro Tips:</h3>
          <ul className="text-gray-300 text-sm space-y-2">
            <li>✓ Each level has 10 questions to answer</li>
            <li>✓ Your score increases with each correct answer</li>
            <li>✓ Try all levels to find your sweet spot</li>
            <li>✓ Complete levels to unlock achievements</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LevelSelection;
