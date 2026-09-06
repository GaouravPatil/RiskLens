import { useEffect, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Activity,
  Clock,
  X,
} from "lucide-react";

import { getRisks, getRisk } from "./services/api";
import "./App.css";

function App() {
  const [risks, setRisks] = useState([]);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRisks();
  }, []);

  const loadRisks = async () => {
    try {
      setLoading(true);

      const data = await getRisks();

      setRisks(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to connect to RiskLens API.");
    } finally {
      setLoading(false);
    }
  };

  const openRisk = async (riskId) => {
    try {
      setDetailsLoading(true);

      const data = await getRisk(riskId);

      setSelectedRisk(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load risk details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const critical = risks.filter(
    (risk) => risk.severity?.toLowerCase() === "critical"
  ).length;

  const high = risks.filter(
    (risk) => risk.severity?.toLowerCase() === "high"
  ).length;

  const open = risks.filter(
    (risk) => risk.status?.toLowerCase() === "open"
  ).length;

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">
        <div>
          <h1>RiskLens</h1>
          <p>Transaction Risk Intelligence Platform</p>
        </div>

        <button onClick={loadRisks}>
          Refresh
        </button>
      </header>


      {/* MAIN */}

      <main>

        {/* STAT CARDS */}

        <section className="stats">

          <div className="stat-card">
            <Activity size={24} />

            <div>
              <span>Total Risks</span>
              <strong>{risks.length}</strong>
            </div>
          </div>


          <div className="stat-card">
            <ShieldAlert size={24} />

            <div>
              <span>Critical</span>
              <strong>{critical}</strong>
            </div>
          </div>


          <div className="stat-card">
            <AlertTriangle size={24} />

            <div>
              <span>High Risk</span>
              <strong>{high}</strong>
            </div>
          </div>


          <div className="stat-card">
            <Clock size={24} />

            <div>
              <span>Open</span>
              <strong>{open}</strong>
            </div>
          </div>

        </section>


        {/* RISK TABLE */}

        <section className="panel">

          <div className="panel-header">

            <div>
              <h2>Risk Events</h2>
              <p>Detected transaction risks</p>
            </div>

          </div>


          {loading && (
            <div className="message">
              Loading risk events...
            </div>
          )}


          {error && (
            <div className="message error">
              {error}
            </div>
          )}


          {!loading && !error && risks.length === 0 && (
            <div className="message">
              No risk events detected.
            </div>
          )}


          {!loading && risks.length > 0 && (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>Risk ID</th>
                    <th>Risk Code</th>
                    <th>Entity</th>
                    <th>Risk Type</th>
                    <th>Score</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>

                </thead>


                <tbody>

                  {risks.map((risk) => (

                    <tr
                      key={risk.risk_id}
                      onClick={() => openRisk(risk.risk_id)}
                      className="risk-row"
                    >

                      <td>
                        {risk.risk_id}
                      </td>

                      <td>
                        {risk.risk_code}
                      </td>

                      <td>
                        {risk.entity_type}
                      </td>

                      <td>
                        {risk.risk_type}
                      </td>

                      <td>
                        <strong>
                          {risk.risk_score}
                        </strong>
                      </td>

                      <td>

                        <span
                          className={`badge ${risk.severity?.toLowerCase()}`}
                        >
                          {risk.severity}
                        </span>

                      </td>

                      <td>

                        <span className="status">
                          {risk.status}
                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* RISK DETAILS */}

        {selectedRisk && (

          <section className="details-panel">

            <div className="details-header">

              <div>
                <h2>Risk Investigation</h2>

                <p>
                  {selectedRisk.risk_code}
                </p>
              </div>


              <button
                className="close-button"
                onClick={() => setSelectedRisk(null)}
              >
                <X size={20} />
              </button>

            </div>


            {detailsLoading ? (

              <div className="message">
                Loading risk details...
              </div>

            ) : (

              <div className="details-content">


                {/* RISK OVERVIEW */}

                <div className="risk-overview">

                  <div>
                    <span>Risk Score</span>

                    <strong className="large-score">
                      {selectedRisk.risk_score}
                    </strong>
                  </div>


                  <div>
                    <span>Severity</span>

                    <span
                      className={`badge ${selectedRisk.severity?.toLowerCase()}`}
                    >
                      {selectedRisk.severity}
                    </span>
                  </div>


                  <div>
                    <span>Status</span>

                    <span className="status">
                      {selectedRisk.status}
                    </span>
                  </div>


                  <div>
                    <span>Entity</span>

                    <strong>
                      {selectedRisk.entity_type}
                    </strong>
                  </div>

                </div>


                {/* TRANSACTION */}

                <div className="detail-section">

                  <h3>Transaction</h3>

                  <div className="detail-grid">

                    <div>
                      <span>Entity ID</span>
                      <strong>
                        {selectedRisk.entity_id}
                      </strong>
                    </div>

                    <div>
                      <span>Risk Code</span>
                      <strong>
                        {selectedRisk.risk_code}
                      </strong>
                    </div>

                    <div>
                      <span>Risk Type</span>
                      <strong>
                        {selectedRisk.risk_type}
                      </strong>
                    </div>

                    <div>
                      <span>Detected At</span>
                      <strong>
                        {selectedRisk.detected_at
                          ? new Date(
                            selectedRisk.detected_at
                          ).toLocaleString()
                          : "N/A"}
                      </strong>
                    </div>

                  </div>

                </div>


                {/* AI SUMMARY */}

                <div className="detail-section">

                  <h3>Risk Explanation</h3>

                  <div className="summary">

                    {selectedRisk.ai_summary ||
                      "No AI explanation available."}

                  </div>

                </div>


                {/* EVIDENCE */}

                <div className="detail-section">

                  <h3>Risk Evidence</h3>


                  {selectedRisk.evidence?.length === 0 ? (

                    <div className="message">
                      No evidence available.
                    </div>

                  ) : (

                    <div className="evidence-list">

                      {selectedRisk.evidence?.map(
                        (evidence) => (

                          <div
                            className="evidence-card"
                            key={evidence.evidence_id}
                          >

                            <div>

                              <strong>
                                {evidence.metric_name}
                              </strong>

                              <p>
                                {evidence.description}
                              </p>

                            </div>


                            <strong className="evidence-value">
                              {evidence.metric_value}
                            </strong>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              </div>

            )}

          </section>

        )}

      </main>

    </div>
  );
}

export default App;