import React from "react";

const HowTo = () => {
  return (
    <div className="card">
      <h2 className="title">How To Play</h2>
      <p className="subtitle">
        Solve the math problem before time runs out!
      </p>

      <ul style={{ textAlign: "left", marginTop: "20px", lineHeight: "1.8" }}>
        <li>✔ Choose a mode</li>
        <li>✔ Select level</li>
        <li>✔ Enter answer using digit pad</li>
        <li>✔ Score high before timer ends</li>
      </ul>
    </div>
  );
};

export default HowTo;
