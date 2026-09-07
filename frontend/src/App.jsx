import { useEffect, useState } from "react";
import { getRisks, getRisk, getRiskSummary, updateRiskStatus } from "./services/api";
import "./App.css";


function App() {
  const [risks, setRisks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadRisks();
  }, []);

  const loadRisks = async () => {
    try {
      setLoading(true);
      setError("");

      const [riskData, summaryData] = await Promise.all([
        getRisks(),
        getRiskSummary(),
      ]);

      setRisks(riskData);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRiskClick = async (riskId) => {
    try {
      setDetailLoading(true);
      setError("");

      const data = await getRisk(riskId);

      setSelectedRisk(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load risk details");
    } finally {
      setDetailLoading(false);
    }
  };

  const openRisk = async (riskId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/risks/${riskId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch risk details");
      }

      const data = await response.json();

      setSelectedRisk(data);
    } catch (error) {
      console.error("Error loading risk details:", error);
    }
  };

  const closeDetails = () => {
    setSelectedRisk(null);
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedRisk) return;

    try {
      setUpdatingStatus(true);
      setError("");

      const updatedRisk = await updateRiskStatus(
        selectedRisk.risk_id,
        status,
        1
      );

      setSelectedRisk(updatedRisk);

      await loadRisks();
    } catch (err) {
      console.error(err);
      setError("Failed to update risk status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const severityCounts = risks.reduce(
    (acc, risk) => {
      const severity = risk.severity?.toLowerCase();

      if (severity === "critical") acc.critical++;
      if (severity === "high") acc.high++;
      if (severity === "medium") acc.medium++;
      if (severity === "low") acc.low++;

      return acc;
    },
    {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
  );

  const openCount = risks.filter(
    (risk) => risk.status?.toLowerCase() === "open"
  ).length;

  /* ================================
    Dashboard Metrics
    ================================ */

  const totalRisks = summary?.total_risks ?? 0;
  const criticalRisks = summary?.critical_risks ?? 0;
  const highRisks = summary?.high_risks ?? 0;
  const mediumRisks = summary?.medium_risks ?? 0;
  const openRisks = summary?.open_risks ?? 0;
  const averageRiskScore =
    summary?.average_risk_score != null
      ? Number(summary.average_risk_score).toFixed(1)
      : "0.0";

  /* ================================
    Filtering
    ================================ */

  const maxSeverityCount = Math.max(
    ...Object.values(severityCounts),
    1
  );

  const filteredRisks = risks.filter((risk) => {
    const severityMatches =
      severityFilter === "all" ||
      risk.severity === severityFilter;

    const statusMatches =
      statusFilter === "all" ||
      risk.status === statusFilter;

    return severityMatches && statusMatches;
  });
  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          Loading risks...
        </div>
      </div>
    );
  }

  if (error && !selectedRisk) {
    return (
      <div className="app">
        <div className="error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="app">



      {/* ================================
            Header
            ================================ */}

      <header>
        <div>
          <h1>RiskLens</h1>
          <p>Risk Monitoring Dashboard</p>
        </div>
      </header>

      <main>

        {/* ================================
              Metrics
              ================================ */}

        <section className="metrics">

          <div className="metric-card">
            <span>Total Risks</span>
            <strong>{totalRisks}</strong>
          </div>

          <div className="metric-card critical-metric">
            <span>Critical</span>
            <strong>{criticalRisks}</strong>
          </div>

          <div className="metric-card high-metric">
            <span>High</span>
            <strong>{highRisks}</strong>
          </div>

          <div className="metric-card medium-metric">
            <span>Medium</span>
            <strong>{mediumRisks}</strong>
          </div>

          <div className="metric-card open-metric">
            <span>Open</span>
            <strong>{openRisks}</strong>
          </div>

          <div className="metric-card">
            <span>Average Score</span>
            <strong>{averageRiskScore}</strong>
          </div>

        </section>

        {/*==========Analytics===============*/}

        <section className="analytics">
          <div className="analytics-card">
            <div className="analytics-header">
              <div>
                <h3>Risk Severity Distribution</h3>
                <p>Current risk events by severity</p>
              </div>
            </div>

            <div className="severity-chart">
              <div className="chart-row">
                <span className="chart-label">Critical</span>

                <div className="chart-track">
                  <div
                    className="chart-bar critical-bar"
                    style={{
                      width: `${(severityCounts.critical / maxSeverityCount) * 100}%`,
                    }}
                  />
                </div>

                <strong>{severityCounts.critical}</strong>
              </div>

              <div className="chart-row">
                <span className="chart-label">High</span>

                <div className="chart-track">
                  <div
                    className="chart-bar high-bar"
                    style={{
                      width: `${(severityCounts.high / maxSeverityCount) * 100}%`,
                    }}
                  />
                </div>

                <strong>{severityCounts.high}</strong>
              </div>

              <div className="chart-row">
                <span className="chart-label">Medium</span>

                <div className="chart-track">
                  <div
                    className="chart-bar medium-bar"
                    style={{
                      width: `${(severityCounts.medium / maxSeverityCount) * 100}%`,
                    }}
                  />
                </div>

                <strong>{severityCounts.medium}</strong>
              </div>

              <div className="chart-row">
                <span className="chart-label">Low</span>

                <div className="chart-track">
                  <div
                    className="chart-bar low-bar"
                    style={{
                      width: `${(severityCounts.low / maxSeverityCount) * 100}%`,
                    }}
                  />
                </div>

                <strong>{severityCounts.low}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ================================
              Risk Events Header
              ================================ */}

        <div className="dashboard-header">

          <div>
            <h2>Risk Events</h2>

            <p className="result-count">
              Showing {filteredRisks.length} of {totalRisks} risks
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadRisks}
          >
            Refresh
          </button>

        </div>

        {/* ================================
              Filters
              ================================ */}

        <section className="filters">

          <div className="filter-group">
            <label>Severity</label>

            <select
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value)
              }
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">
                Investigating
              </option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">
                False Positive
              </option>
            </select>
          </div>

          <button
            className="clear-filter"
            onClick={() => {
              setSeverityFilter("all");
              setStatusFilter("all");
            }}
          >
            Clear Filters
          </button>

        </section>

        {/* ================================
              Risk List
              ================================ */}

        {filteredRisks.length === 0 ? (
          <div className="empty">
            No risks match the selected filters.
          </div>
        ) : (
          <div className="risk-list">

            {filteredRisks.map((risk) => (

              <div
                className="risk-card clickable"
                key={risk.risk_id}
                onClick={() =>
                  handleRiskClick(risk.risk_id)
                }
              >

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

                <div
                  className={`severity ${risk.severity}`}
                >
                  {risk.severity}
                </div>

                <div
                  className={`status ${risk.status}`}
                >
                  {risk.status}
                </div>

              </div>

            ))}

          </div>
        )}

        {/* ================================
              Loading Detail
              ================================ */}

        {detailLoading && (
          <div className="detail-panel">
            Loading risk details...
          </div>
        )}

        {/* ================================
              Risk Detail
              ================================ */}

        {selectedRisk && !detailLoading && (

          <div className="detail-panel">

            <div className="detail-header">

              <div>
                <h2>{selectedRisk.risk_code}</h2>

                <p>
                  {selectedRisk.risk_type}
                </p>
              </div>

              <button onClick={closeDetails}>
                Close
              </button>

            </div>

            <div className="risk-summary">

              <div>
                <span>Risk Score</span>
                <strong>
                  {selectedRisk.risk_score}
                </strong>
              </div>

              <div>
                <span>Severity</span>
                <strong>
                  {selectedRisk.severity}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {selectedRisk.status}
                </strong>
              </div>

              <div>
                <span>Entity</span>
                <strong>
                  {selectedRisk.entity_id}
                </strong>
              </div>

            </div>

            <div className="status-actions">
              <h3>Update Risk Status</h3>

              <div className="status-buttons">
                <button
                  onClick={() => handleStatusUpdate("open")}
                  disabled={updatingStatus}
                >
                  Open
                </button>

                <button
                  onClick={() => handleStatusUpdate("investigating")}
                  disabled={updatingStatus}
                >
                  Investigating
                </button>

                <button
                  onClick={() => handleStatusUpdate("resolved")}
                  disabled={updatingStatus}
                >
                  Resolved
                </button>

                <button
                  onClick={() => handleStatusUpdate("false_positive")}
                  disabled={updatingStatus}
                >
                  False Positive
                </button>
              </div>

              {updatingStatus && (
                <p>Updating risk...</p>
              )}
            </div>

            <div className="ai-summary">

              <h3>AI Summary</h3>

              <p>
                {selectedRisk.ai_summary ||
                  "No AI summary available."}
              </p>

            </div>

            <div className="evidence-section">

              <h3>Risk Evidence</h3>

              {!selectedRisk.evidence ||
                selectedRisk.evidence.length === 0 ? (

                <p>No evidence available.</p>

              ) : (

                <div className="evidence-list">

                  {selectedRisk.evidence.map((item) => (

                    <div
                      className="evidence-card"
                      key={item.evidence_id}
                    >

                      <div>

                        <strong>
                          {item.metric_name}
                        </strong>

                        <p>
                          {item.description}
                        </p>

                      </div>

                      <div className="evidence-value">
                        {item.metric_value}
                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        )}

      </main>
    </div>
  );
}

export default App;