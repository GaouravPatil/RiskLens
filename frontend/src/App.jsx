import { useEffect, useState } from "react";
import { getRisks } from "./services/api";
import "./App.css";

function App() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRisks();
  }, []);

  const loadRisks = async () => {
    try {
      setLoading(true);

      const data = await getRisks();

      setRisks(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load risks");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="app">Loading risks...</div>;
  }

  if (error) {
    return <div className="app error">{error}</div>;
  }

  return (
    <div className="app">
      <header>
        <h1>RiskLens</h1>
        <p>Risk Monitoring Dashboard</p>
      </header>

      <main>
        <div className="dashboard-header">
          <h2>Risk Events</h2>
          <span>{risks.length} events</span>
        </div>

        {risks.length === 0 ? (
          <div className="empty">
            No risk events found.
          </div>
        ) : (
          <div className="risk-list">
            {risks.map((risk) => (
              <div className="risk-card" key={risk.risk_id}>
                <div>
                  <h3>{risk.risk_code}</h3>
                  <p>
                    {risk.risk_type} · Entity #{risk.entity_id}
                  </p>
                </div>

                <div className="risk-score">
                  <strong>{risk.risk_score}</strong>
                  <span>Score</span>
                </div>

                <div className={`severity ${risk.severity}`}>
                  {risk.severity}
                </div>

                <div className={`status ${risk.status}`}>
                  {risk.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;