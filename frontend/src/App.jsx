import { useCallback, useEffect, useState, useMemo } from "react";
import Login from "./components/Login";
import {
  SeverityDonutChart,
  RiskScoreHistogram,
  EntityBreakdownChart,
  RiskTimelineChart,
} from "./components/AnalystCharts";
import AuditFeed from "./components/AuditFeed";
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
import {
  ShieldAlert,
  Activity,
  Layers,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Clock,
  UserCheck,
  Radio,
  FileText,
  X,
  PieChart,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import "./App.css";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "false_positive", label: "False Positive" },
];

export default function App() {
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

  // Tab & Realtime controls
  const [activeTab, setActiveTab] = useState("queue"); // 'queue' | 'analytics' | 'audit'
  const [autoPolling, setAutoPolling] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScoreFilter, setMinScoreFilter] = useState(0);

  const canUpdate = canUpdateStatus(user);

  /* ================================
     Data Loading
     ================================ */

  const loadRisks = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError("");

      const [riskData, summaryData] = await Promise.all([
        getRisks(),
        getRiskSummary(),
      ]);

      setRisks(riskData);
      setSummary(summaryData);
      setLastSync(new Date());
    } catch (err) {
      console.error(err);
      if (err.response?.status !== 401) {
        setError("Failed to fetch real-time database risk feeds.");
      }
    } fontinally: {
      if (!isBackground) setLoading(false);
    }
  }, []);

  /* ================================
     Session Restore
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
      loadRisks(false);
    }
  }, [user, loadRisks]);

  /* ================================
     Real-Time Auto-Polling (5s)
     ================================ */

  useEffect(() => {
    if (!user || !autoPolling) return;

    const interval = setInterval(() => {
      loadRisks(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [user, autoPolling, loadRisks]);

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
  };

  const handleRiskClick = async (riskId) => {
    try {
      setDetailLoading(true);
      setError("");
      setSelectedRisk(await getRisk(riskId));
    } catch (err) {
      console.error(err);
      if (err.response?.status !== 401) {
        setError("Failed to load risk details.");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedRisk) return;
    const riskId = selectedRisk.risk_id;

    try {
      setUpdatingStatus(true);
      setError("");
      await updateRiskStatus(riskId, status);
      setSelectedRisk(await getRisk(riskId));
      await loadRisks(true);
    } catch (err) {
      console.error(err);
      const resStatus = err.response?.status;
      if (resStatus === 403) {
        setError("Your role does not permit status updates.");
      } else if (resStatus === 400) {
        setError(err.response?.data?.detail ?? "Status change rejected.");
      } else if (resStatus !== 401) {
        setError("Failed to update status.");
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* ================================
     Filtered Risks Computation
     ================================ */

  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      // Severity
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      // Status
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      // Min score
      if (r.risk_score < minScoreFilter) return false;
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const code = (r.risk_code || "").toLowerCase();
        const type = (r.risk_type || "").toLowerCase();
        const entity = (r.entity_id || "").toLowerCase();
        const summaryText = (r.ai_summary || "").toLowerCase();
        return (
          code.includes(query) ||
          type.includes(query) ||
          entity.includes(query) ||
          summaryText.includes(query)
        );
      }
      return true;
    });
  }, [risks, severityFilter, statusFilter, minScoreFilter, searchTerm]);

  /* ================================
     Render Loading / Login
     ================================ */

  if (!authChecked) {
    return (
      <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 10 }}>
          <RefreshCw className="spin" size={24} />
          <span>Initializing RiskLens Control Center...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} noticeMessage={sessionNotice} />;
  }

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="brand-title">RiskLens</span>
              <span className="brand-badge">Analyst Suite</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => setActiveTab("queue")}
          >
            <ShieldAlert size={16} />
            <span>Investigation Queue</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <PieChart size={16} />
            <span>Analytics & Charts</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            <Activity size={16} />
            <span>Audit Feed</span>
          </button>
        </nav>

        {/* Controls & Profile */}
        <div className="header-controls">
          <div
            className={`live-polling-toggle ${autoPolling ? "active" : ""}`}
            onClick={() => setAutoPolling(!autoPolling)}
            title="Toggle 5-second automatic database refresh"
          >
            <span className="live-pulse-dot" />
            <span>{autoPolling ? "LIVE AUTO-POLL" : "PAUSED"}</span>
          </div>

          <button
            className="chart-reset-btn"
            onClick={() => loadRisks(false)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}
            title="Fetch database risks immediately"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Sync</span>
          </button>

          <div className="user-profile-badge">
            <div className="user-avatar">{user.full_name?.charAt(0) || "U"}</div>
            <div className="user-info">
              <span className="user-name">{user.full_name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>

          <button className="btn-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {error && (
          <div className="glass-panel" style={{ borderColor: "var(--accent-rose)", color: "var(--accent-rose)", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Top Metric Cards (Global Overview) */}
        <div className="metrics-grid">
          <div className="glass-card metric-card" style={{ "--card-accent": "var(--accent-cyan)" }}>
            <div className="metric-header">
              <span>Total Risks Monitored</span>
              <div className="metric-icon-wrapper"><ShieldAlert className="icon-cyan" size={18} /></div>
            </div>
            <div className="metric-value">{summary?.total_risks ?? risks.length}</div>
            <div className="metric-sub">Realtime PostgreSQL Feed</div>
          </div>

          <div className="glass-card metric-card" style={{ "--card-accent": "var(--accent-rose)" }}>
            <div className="metric-header">
              <span>Critical Severity</span>
              <div className="metric-icon-wrapper"><AlertTriangle className="icon-rose" size={18} /></div>
            </div>
            <div className="metric-value" style={{ color: "var(--accent-rose)" }}>
              {summary?.critical_risks ?? risks.filter((r) => r.severity === "critical").length}
            </div>
            <div className="metric-sub">Immediate Action Required</div>
          </div>

          <div className="glass-card metric-card" style={{ "--card-accent": "var(--accent-purple)" }}>
            <div className="metric-header">
              <span>Active Open Cases</span>
              <div className="metric-icon-wrapper"><Activity className="icon-purple" size={18} /></div>
            </div>
            <div className="metric-value" style={{ color: "var(--accent-purple)" }}>
              {summary?.open_risks ?? risks.filter((r) => r.status === "open").length}
            </div>
            <div className="metric-sub">Pending Analyst Review</div>
          </div>

          <div className="glass-card metric-card" style={{ "--card-accent": "var(--accent-emerald)" }}>
            <div className="metric-header">
              <span>Avg Risk Score</span>
              <div className="metric-icon-wrapper"><TrendingUp className="icon-emerald" size={18} /></div>
            </div>
            <div className="metric-value" style={{ color: "var(--accent-emerald)" }}>
              {summary?.average_risk_score ?? "0.0"}
            </div>
            <div className="metric-sub">Across active threats</div>
          </div>
        </div>

        {/* TAB 1: INVESTIGATION QUEUE */}
        {activeTab === "queue" && (
          <>
            {/* Search & Filter Toolbar */}
            <div className="toolbar-panel">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by risk code, entity ID, threat type, summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <select
                  className="filter-select"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical Only</option>
                  <option value="high">High Only</option>
                  <option value="medium">Medium Only</option>
                  <option value="low">Low Only</option>
                </select>

                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="false_positive">False Positive</option>
                </select>

                <select
                  className="filter-select"
                  value={minScoreFilter}
                  onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                >
                  <option value={0}>Min Score: Any</option>
                  <option value={50}>Min Score: 50+</option>
                  <option value={75}>Min Score: 75+</option>
                  <option value={90}>Min Score: 90+</option>
                </select>
              </div>
            </div>

            {/* Split View: Risks List + Detail Drawer */}
            <div className={`workspace-grid ${selectedRisk ? "has-detail" : ""}`}>
              <div className="risk-table-container">
                {filteredRisks.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: "center", padding: "48px 0", color: "var(--text-dim)" }}>
                    <ShieldAlert size={36} style={{ marginBottom: 12 }} />
                    <p>No risk events match the current filter criteria.</p>
                  </div>
                ) : (
                  filteredRisks.map((risk) => {
                    const isSelected = selectedRisk?.risk_id === risk.risk_id;
                    return (
                      <div
                        key={risk.risk_id}
                        className={`risk-item-card ${isSelected ? "selected" : ""}`}
                        onClick={() => handleRiskClick(risk.risk_id)}
                      >
                        <div className="risk-main-info">
                          <div className={`score-badge severity-${risk.severity}`}>
                            {Math.round(risk.risk_score)}
                          </div>
                          <div className="risk-details-col">
                            <div className="risk-code-title">
                              <span className="risk-code">{risk.risk_code}</span>
                              <span className="risk-type-tag">
                                {risk.risk_type?.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className="risk-entity-row">
                              <span>Entity: <strong>{risk.entity_type} ({risk.entity_id})</strong></span>
                              <span>•</span>
                              <span>Detected: {new Date(risk.detected_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className={`status-badge badge-${risk.status}`}>
                            {risk.status?.replace("_", " ")}
                          </span>
                          <ChevronRight size={18} className="icon-muted" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Detail Panel */}
              {selectedRisk && (
                <div className="glass-card detail-panel">
                  <div className="detail-header">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="risk-code" style={{ fontSize: 18 }}>{selectedRisk.risk_code}</span>
                        <span className={`severity-tag severity-${selectedRisk.severity}`}>
                          {selectedRisk.severity}
                        </span>
                      </div>
                      <span className="risk-type-tag" style={{ fontSize: 13 }}>
                        {selectedRisk.risk_type?.replace(/_/g, " ")}
                      </span>
                    </div>

                    <button className="btn-close-detail" onClick={() => setSelectedRisk(null)}>
                      <X size={16} />
                    </button>
                  </div>

                  {/* Analyst Status Control */}
                  <div className="status-controls-section">
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                      UPDATE INVESTIGATION STATUS
                    </span>
                    {!canUpdate ? (
                      <span style={{ fontSize: 12, color: "var(--accent-amber)" }}>
                        Your role ({user.role}) is read-only.
                      </span>
                    ) : (
                      <div className="status-btn-group">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            disabled={updatingStatus}
                            className={`status-option-btn ${selectedRisk.status === opt.value ? "active" : ""}`}
                            onClick={() => handleStatusUpdate(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Summary */}
                  {selectedRisk.ai_summary && (
                    <div className="glass-panel">
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-cyan)", display: "block", marginBottom: 6 }}>
                        AI RISK ASSESSMENT
                      </span>
                      <p style={{ fontSize: 12, color: "var(--text-main)", lineHeight: "1.5" }}>
                        {selectedRisk.ai_summary}
                      </p>
                    </div>
                  )}

                  {/* Evidence Items */}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 10 }}>
                      INSPECTED EVIDENCE & METRICS ({selectedRisk.evidence?.length || 0})
                    </span>
                    {selectedRisk.evidence?.map((ev) => (
                      <div key={ev.evidence_id} className="evidence-card">
                        <div className="evidence-header">
                          <span className="evidence-type">{ev.evidence_type}</span>
                          <span className="evidence-value">{ev.metric_name}: {ev.metric_value}</span>
                        </div>
                        <div className="evidence-desc">{ev.description}</div>
                      </div>
                    ))}
                  </div>

                  {/* Status History */}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 10 }}>
                      AUDIT HISTORY
                    </span>
                    {selectedRisk.status_history?.map((h) => (
                      <div key={h.history_id} style={{ fontSize: 11, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between" }}>
                        <span>
                          {h.old_status || "open"} → <strong>{h.new_status}</strong> by {h.reviewed_by_name || `U${h.reviewed_by}`}
                        </span>
                        <span style={{ color: "var(--text-dim)" }}>
                          {new Date(h.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: ANALYTICS & CHARTS */}
        {activeTab === "analytics" && (
          <div className="chart-matrix">
            <SeverityDonutChart
              risks={risks}
              activeFilter={severityFilter}
              onSelectSeverity={(sev) => {
                setSeverityFilter(sev);
                setActiveTab("queue");
              }}
            />
            <RiskScoreHistogram risks={risks} />
            <EntityBreakdownChart risks={risks} />
            <RiskTimelineChart risks={risks} />
          </div>
        )}

        {/* TAB 3: AUDIT STREAM */}
        {activeTab === "audit" && (
          <AuditFeed
            risks={risks}
            onSelectRisk={(id) => {
              handleRiskClick(id);
              setActiveTab("queue");
            }}
          />
        )}
      </main>
    </div>
  );
}
