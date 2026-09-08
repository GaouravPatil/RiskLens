import { useCallback, useEffect, useState } from "react";
import Login from "./components/Login";
import {
  getCurrentUser,
  getRisk,
  getRiskSummary,
  getRisks,
  getToken,
  logout,
  setUnauthorizedHandler,
  updateRiskStatus,
} from "./services/api";
import { canUpdateStatus } from "./services/permissions";
import "./App.css";


const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "false_positive", label: "False Positive" },
];

const formatTimestamp = (value) =>
  value ? new Date(value).toLocaleString() : "—";


function App() {

  /* ================================
     Authentication state
     ================================ */

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");

  const [risks, setRisks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const canUpdate = canUpdateStatus(user);

  /* ================================
     Data loading
     ================================ */

  const loadRisks = useCallback(async () => {
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

      // A 401 is already handled by the interceptor, which returns to login
      if (err.response?.status !== 401) {
        setError("Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================================
     Session restore
     ================================ */

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setSelectedRisk(null);
      setSessionNotice("Your session expired. Please sign in again.");
    });
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!getToken()) {
        setAuthChecked(true);
        return;
      }

      try {
        // Roles are re-read from the database rather than trusted from
        // whatever is sitting in localStorage.
        setUser(await getCurrentUser());
      } catch (err) {
        console.error(err);
        logout();
      } finally {
        setAuthChecked(true);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadRisks();
    }
  }, [user, loadRisks]);

  /* ================================
     Handlers
     ================================ */

  const handleLogin = (loggedInUser) => {
    setSessionNotice("");
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    logout();

    setUser(null);
    setRisks([]);
    setSummary(null);
    setSelectedRisk(null);
    setError("");
    setSessionNotice("");
  };

  const handleRiskClick = async (riskId) => {
    try {
      setDetailLoading(true);
      setError("");

      setSelectedRisk(await getRisk(riskId));
    } catch (err) {
      console.error(err);

      if (err.response?.status !== 401) {
        setError("Failed to load risk details");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedRisk(null);
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedRisk) return;

    const riskId = selectedRisk.risk_id;

    try {
      setUpdatingStatus(true);
      setError("");

      await updateRiskStatus(riskId, status);

      // Re-read the detail so evidence and the new history entry come back
      setSelectedRisk(await getRisk(riskId));

      await loadRisks();
    } catch (err) {
      console.error(err);

      const responseStatus = err.response?.status;

      if (responseStatus === 403) {
        setError("Your role does not permit status updates.");
      } else if (responseStatus === 400) {
        setError(
          err.response?.data?.detail ?? "That status change was rejected."
        );
      } else if (responseStatus !== 401) {
        setError("Failed to update risk status");
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* ================================
     Derived values
     ================================ */

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

  /* ================================
     Authentication gate
     ================================ */

  if (!authChecked) {
    return (
      <div className="app">
        <div className="loading">
          Restoring session...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Login
        onLogin={handleLogin}
        notice={sessionNotice}
      />
    );
  }

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

        <div className="session">

          <div className="session-user">
            <strong>{user.full_name}</strong>

            <div className="role-badges">
              {(user.roles ?? []).map((role) => (
                <span className="role-badge" key={role}>
                  {role.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Sign out
          </button>

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

              {STATUS_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
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

            {error && (
              <div className="detail-error">
                {error}
              </div>
            )}

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

            {/* ================================
                  Status Controls
                  ================================ */}

            <div className="status-controls">
              <h3>Update Risk Status</h3>

              {canUpdate ? (
                <>
                  <div className="status-buttons">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={
                          selectedRisk.status === option.value ? "active" : ""
                        }
                        disabled={updatingStatus}
                        onClick={() => handleStatusUpdate(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {updatingStatus && (
                    <p className="status-hint">Updating risk...</p>
                  )}
                </>
              ) : (
                <p className="status-hint">
                  Your role has read-only access to risk events.
                </p>
              )}
            </div>

            <div className="ai-summary">

              <h3>AI Summary</h3>

              <p>
                {selectedRisk.ai_summary ||
                  "No AI summary available."}
              </p>

            </div>

            {/* ================================
                  Status History
                  ================================ */}

            <div className="history-section">

              <h3>Status History</h3>

              {!selectedRisk.status_history ||
                selectedRisk.status_history.length === 0 ? (

                <p className="status-hint">
                  No status changes recorded yet.
                </p>

              ) : (

                <ol className="timeline">

                  {selectedRisk.status_history.map((entry) => (

                    <li className="timeline-entry" key={entry.history_id}>

                      <div className="timeline-transition">

                        <span
                          className={`status ${entry.old_status ?? ""}`}
                        >
                          {entry.old_status ?? "created"}
                        </span>

                        <span className="timeline-arrow">→</span>

                        <span
                          className={`status ${entry.new_status}`}
                        >
                          {entry.new_status}
                        </span>

                      </div>

                      <p className="timeline-meta">
                        {entry.reviewed_by_name ??
                          (entry.reviewed_by
                            ? `User #${entry.reviewed_by}`
                            : "Unknown reviewer")}
                        {" · "}
                        {formatTimestamp(entry.changed_at)}
                      </p>

                    </li>

                  ))}

                </ol>

              )}

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
