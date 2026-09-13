import React from "react";
import { Activity, ShieldCheck, Clock, User, ArrowRight, FileText } from "lucide-react";

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "open":
      return "badge-open";
    case "investigating":
      return "badge-investigating";
    case "resolved":
      return "badge-resolved";
    case "false_positive":
      return "badge-false-positive";
    default:
      return "";
  }
};

const formatStatusLabel = (status) => {
  if (!status) return "Unknown";
  return status.replace("_", " ").toUpperCase();
};

export default function AuditFeed({ risks = [], onSelectRisk }) {
  // Extract all status history items across all risks
  const activityStream = React.useMemo(() => {
    const items = [];
    
    risks.forEach((risk) => {
      if (risk.reviewed_at) {
        items.push({
          id: `${risk.risk_id}-${risk.reviewed_at}`,
          riskId: risk.risk_id,
          riskCode: risk.risk_code,
          riskType: risk.risk_type,
          severity: risk.severity,
          status: risk.status,
          reviewedBy: risk.reviewed_by,
          timestamp: risk.reviewed_at,
          summary: risk.ai_summary,
        });
      }
    });

    // Sort by timestamp descending
    return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [risks]);

  return (
    <div className="glass-card audit-feed-container">
      <div className="chart-header">
        <div className="chart-title">
          <Activity className="icon-cyan" size={20} />
          <span>Realtime System & Analyst Activity Stream</span>
        </div>
        <span className="chart-subtitle">{activityStream.length} Audit Events Logged</span>
      </div>

      {activityStream.length === 0 ? (
        <div className="empty-audit-state">
          <Clock size={32} className="icon-muted" />
          <p>No recent status modifications recorded.</p>
          <span className="empty-sub">Changes made by analysts will appear here in real time.</span>
        </div>
      ) : (
        <div className="audit-timeline-list">
          {activityStream.map((item) => (
            <div key={item.id} className="audit-item-card glass-panel" onClick={() => onSelectRisk(item.riskId)}>
              <div className="audit-item-header">
                <div className="audit-risk-meta">
                  <span className="audit-code">{item.riskCode}</span>
                  <span className={`severity-tag severity-${item.severity}`}>
                    {item.severity}
                  </span>
                  <span className="audit-type">{item.riskType?.replace("_", " ")}</span>
                </div>
                <div className="audit-time">
                  <Clock size={12} />
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="audit-item-body">
                <div className="audit-reviewer">
                  <User size={14} className="icon-purple" />
                  <span>Reviewer ID: <strong>U{item.reviewedBy || "10001"}</strong></span>
                </div>
                <div className="audit-status-change">
                  <span>Current Status:</span>
                  <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                    {formatStatusLabel(item.status)}
                  </span>
                </div>
              </div>

              {item.summary && (
                <div className="audit-summary-snippet">
                  <FileText size={12} />
                  <span>{item.summary}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
