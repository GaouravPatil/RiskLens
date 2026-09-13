import { useState } from "react";
import { login } from "../services/api";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Fingerprint,
  Activity,
  AlertCircle,
} from "lucide-react";

const DEMO_USERS = [
  { label: "Admin", code: "U10001", email: "admin@risklens.io", role: "ADMIN" },
  { label: "Analyst", code: "U10003", email: "analyst1@risklens.io", role: "RISK_ANALYST" },
  { label: "Manager", code: "U10002", email: "manager@risklens.io", role: "RISK_MANAGER" },
  { label: "Auditor", code: "U10004", email: "auditor@risklens.io", role: "AUDITOR" },
];

function Login({ onLogin, noticeMessage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event?.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      if (status === 401) {
        setError("Invalid credentials. Please check your username/email and password.");
      } else if (status === 403) {
        setError(err.response?.data?.detail ?? "This account is currently inactive.");
      } else {
        setError("Unable to connect to RiskLens API. Ensure backend is running.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoUser = (userCode, defaultPass = "Password123!") => {
    setEmail(userCode);
    setPassword(defaultPass);
    setError("");
  };

  return (
    <div className="login-wrapper">
      <div className="login-container glass-card">
        {/* Left Side: Brand & Feature Showcase */}
        <div className="login-brand-panel">
          <div className="login-brand-header">
            <div className="brand-logo-large">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h2 className="login-brand-title">RiskLens</h2>
              <span className="login-brand-subtitle">Financial Risk Operating System</span>
            </div>
          </div>

          <div className="login-feature-list">
            <div className="feature-item">
              <div className="feature-icon icon-cyan">
                <Activity size={18} />
              </div>
              <div>
                <h4>Realtime Anomaly Detection</h4>
                <p>Monitors high-value transactions and access logs in microsecond intervals.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon icon-purple">
                <Sparkles size={18} />
              </div>
              <div>
                <h4>Automated Threat Scoring</h4>
                <p>Rules-based intelligence engine categorizing critical, high, and medium severity events.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon icon-emerald">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4>Role-Gated Compliance Audit</h4>
                <p>Immutable investigation history with complete reviewer attribution and status history.</p>
              </div>
            </div>
          </div>

          <div className="login-footer-badge">
            <Fingerprint size={16} className="icon-cyan" />
            <span>Encrypted JWT Enterprise Session Protection</span>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="login-form-panel">
          <div className="form-header">
            <h3>Analyst Portal Sign In</h3>
            <p>Access your risk monitoring and investigation dashboard.</p>
          </div>

          {noticeMessage && (
            <div className="login-alert notice">
              <AlertCircle size={16} />
              <span>{noticeMessage}</span>
            </div>
          )}

          {error && (
            <div className="login-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Credentials Bar */}
          <div className="demo-users-section">
            <span className="demo-label">Quick Demo Access:</span>
            <div className="demo-chips">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.code}
                  type="button"
                  className="demo-chip-btn"
                  onClick={() => fillDemoUser(u.code)}
                  title={`Click to fill ${u.label} credentials (${u.code})`}
                >
                  <UserCheck size={12} />
                  <span>{u.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">Email or User Code</label>
              <div className="input-field-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  id="email"
                  type="text"
                  placeholder="e.g. U10001 or analyst1@risklens.io"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-field-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-submit-auth"
              disabled={submitting}
            >
              <span>{submitting ? "Authenticating Session..." : "Sign In to Control Center"}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
