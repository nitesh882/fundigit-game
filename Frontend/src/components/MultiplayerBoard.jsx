import { useState } from "react";

function MultiplayerBoard() {
  const [p1, setP1] = useState(0);
  const [p2, setP2] = useState(0);
  const [num1, setNum1] = useState(5);
  const [num2, setNum2] = useState(3);

  const correct = num1 + num2;
  const nextQuestion = () => {
    setNum1(Math.floor(Math.random() * 9) + 1);
    setNum2(Math.floor(Math.random() * 9) + 1);
  };

  return (
    <div className="card">
      <h2>{num1} + {num2}</h2>
      <p>Correct Answer: {correct}</p>
      <button onClick={() => setP1(p1 + 1)}>Player 1 Correct</button>
      <button onClick={() => setP2(p2 + 1)}>Player 2 Correct</button>
      <button onClick={nextQuestion}>Next Question</button>

      <h3>Player 1: {p1}</h3>
      <h3>Player 2: {p2}</h3>
    </div>
  );
}

export default MultiplayerBoard;
