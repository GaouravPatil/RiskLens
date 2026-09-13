import { useState, useEffect } from "react";
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert, ArrowUpRight, Clock, Zap } from "lucide-react";
import { getSimulationFeed } from "../services/api";

export default function LiveActivityFeed({ onSelectRisk }) {
  const [feed, setFeed] = useState([]);
  const [active, setActive] = useState(false);
  const [filterAnomalies, setFilterAnomalies] = useState(false);

  const fetchFeed = async () => {
    try {
      const res = await getSimulationFeed();
      setFeed(res.feed || []);
      setActive(res.active);
    } catch (err) {
      console.error("Failed to fetch simulation feed", err);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 2000);
    return () => clearInterval(interval);
  }, []);

  const displayedFeed = filterAnomalies
    ? feed.filter((item) => item.type === "risk_event")
    : feed;

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "critical":
        return "badge-severity-critical";
      case "high":
        return "badge-severity-high";
      case "medium":
        return "badge-severity-medium";
      case "low":
        return "badge-severity-low";
      default:
        return "badge-severity-low";
    }
  };

  return (
    <div className="glass-card live-feed-container">
      <div className="feed-header">
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${active ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
          <h3 className="text-lg font-semibold text-white">Live Data Ingestion Feed</h3>
        </div>

        <div className="flex items-center gap-3">
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              checked={filterAnomalies}
              onChange={(e) => setFilterAnomalies(e.target.checked)}
              className="checkbox-custom"
            />
            <span>Show Anomalies Only</span>
          </label>
        </div>
      </div>

      <div className="feed-list-wrapper">
        {displayedFeed.length === 0 ? (
          <div className="empty-feed">
            <Zap className="h-8 w-8 text-slate-500 mb-2" />
            <p>No live streaming records ingested yet.</p>
            <span className="text-xs text-slate-400">Click "Live Stream" or "Generate Batch" above to start dynamic ingestion.</span>
          </div>
        ) : (
          <div className="feed-items-list">
            {displayedFeed.map((item, idx) => {
              const isRisk = item.type === "risk_event";
              const timeStr = new Date(item.timestamp).toLocaleTimeString();

              return (
                <div
                  key={`${item.code}-${idx}`}
                  className={`feed-item glass-card-subtle ${isRisk ? "risk-item" : "tx-item"} animate-slideDown`}
                >
                  <div className="feed-item-header">
                    <div className="flex items-center gap-2">
                      {isRisk ? (
                        <ShieldAlert className="h-4 w-4 text-rose-400" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-blue-400" />
                      )}
                      <span className="code-text font-mono">{item.risk_code || item.code}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRisk && (
                        <span className={`severity-badge ${getSeverityBadge(item.severity)}`}>
                          {item.severity.toUpperCase()} ({item.score})
                        </span>
                      )}
                      <span className="time-badge">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="feed-item-body mt-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">
                        Merchant: <strong className="text-white">{item.merchant}</strong> ({item.location})
                      </span>
                      <span className="font-semibold text-emerald-400">
                        ₹{item.amount?.toLocaleString()}
                      </span>
                    </div>

                    {isRisk && item.risk_type && (
                      <p className="risk-type-desc mt-1 text-xs text-rose-300">
                        Triggered Risk Pattern: <strong>{item.risk_type.replace(/_/g, " ").toUpperCase()}</strong>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
