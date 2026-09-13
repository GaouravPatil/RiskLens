import React, { useState } from "react";
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Layers,
  Activity,
  Filter,
} from "lucide-react";

/**
 * Glassmorphic Threat Severity Distribution Donut / Bar Chart
 */
export function SeverityDonutChart({ risks = [], activeFilter, onSelectSeverity }) {
  const counts = {
    critical: risks.filter((r) => r.severity === "critical").length,
    high: risks.filter((r) => r.severity === "high").length,
    medium: risks.filter((r) => r.severity === "medium").length,
    low: risks.filter((r) => r.severity === "low").length,
  };

  const total = risks.length || 1;

  const items = [
    { key: "critical", label: "Critical", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)", border: "rgba(244, 63, 94, 0.4)", count: counts.critical },
    { key: "high", label: "High", color: "#fb923c", bg: "rgba(251, 146, 60, 0.15)", border: "rgba(251, 146, 60, 0.4)", count: counts.high },
    { key: "medium", label: "Medium", color: "#facc15", bg: "rgba(250, 204, 21, 0.15)", border: "rgba(250, 204, 21, 0.4)", count: counts.medium },
    { key: "low", label: "Low", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.4)", count: counts.low },
  ];

  return (
    <div className="glass-card chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <PieChart className="icon-cyan" size={18} />
          <span>Severity Distribution</span>
        </div>
        {activeFilter && activeFilter !== "all" && (
          <button
            className="chart-reset-btn"
            onClick={() => onSelectSeverity("all")}
          >
            Reset Filter
          </button>
        )}
      </div>

      <div className="severity-bar-list">
        {items.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          const isSelected = activeFilter === item.key;

          return (
            <div
              key={item.key}
              className={`severity-bar-item ${isSelected ? "selected" : ""}`}
              onClick={() =>
                onSelectSeverity(isSelected ? "all" : item.key)
              }
              title={`Click to filter by ${item.label} severity`}
            >
              <div className="severity-bar-info">
                <span className="severity-dot" style={{ background: item.color }} />
                <span className="severity-label">{item.label}</span>
                <span className="severity-count-pill" style={{ background: item.bg, color: item.color, borderColor: item.border }}>
                  {item.count} ({pct}%)
                </span>
              </div>
              <div className="severity-track">
                <div
                  className="severity-fill"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`,
                    boxShadow: isSelected ? `0 0 12px ${item.color}` : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Glassmorphic Risk Score Histogram Chart
 */
export function RiskScoreHistogram({ risks = [] }) {
  const buckets = [
    { label: "0 - 25", min: 0, max: 25, color: "#38bdf8" },
    { label: "26 - 50", min: 26, max: 50, color: "#facc15" },
    { label: "51 - 75", min: 51, max: 75, color: "#fb923c" },
    { label: "76 - 100", min: 76, max: 100, color: "#f43f5e" },
  ];

  const bucketCounts = buckets.map((b) => ({
    ...b,
    count: risks.filter(
      (r) => r.risk_score >= b.min && r.risk_score <= b.max
    ).length,
  }));

  const maxCount = Math.max(...bucketCounts.map((b) => b.count), 1);

  return (
    <div className="glass-card chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <BarChart3 className="icon-purple" size={18} />
          <span>Risk Score Histogram</span>
        </div>
        <span className="chart-subtitle">Distribution by Score Range</span>
      </div>

      <div className="histogram-container">
        {bucketCounts.map((b) => {
          const heightPct = Math.round((b.count / maxCount) * 100);

          return (
            <div key={b.label} className="histogram-col">
              <div className="histogram-value">{b.count}</div>
              <div className="histogram-bar-track">
                <div
                  className="histogram-bar-fill"
                  style={{
                    height: `${heightPct}%`,
                    background: `linear-gradient(180deg, ${b.color}, ${b.color}44)`,
                    boxShadow: `0 0 10px ${b.color}66`,
                  }}
                />
              </div>
              <div className="histogram-label">{b.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Glassmorphic Entity Breakdown Chart
 */
export function EntityBreakdownChart({ risks = [] }) {
  const entityCounts = risks.reduce((acc, r) => {
    const type = (r.entity_type || "UNKNOWN").toUpperCase();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const total = risks.length || 1;
  const entries = Object.entries(entityCounts).sort((a, b) => b[1] - a[1]);

  const palette = ["#a855f7", "#38bdf8", "#34d399", "#fb923c", "#f43f5e"];

  return (
    <div className="glass-card chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <Layers className="icon-emerald" size={18} />
          <span>Entity Risk Distribution</span>
        </div>
        <span className="chart-subtitle">{entries.length} Entity Categories</span>
      </div>

      <div className="entity-list">
        {entries.length === 0 ? (
          <div className="empty-chart-msg">No entity data available</div>
        ) : (
          entries.map(([entity, count], idx) => {
            const pct = Math.round((count / total) * 100);
            const color = palette[idx % palette.length];

            return (
              <div key={entity} className="entity-row">
                <div className="entity-meta">
                  <span className="entity-badge" style={{ borderColor: color, color }}>
                    {entity}
                  </span>
                  <span className="entity-count">
                    {count} events ({pct}%)
                  </span>
                </div>
                <div className="severity-track">
                  <div
                    className="severity-fill"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}aa, ${color})`,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Glassmorphic Risk Timeline Trend Chart (SVG Sparkline)
 */
export function RiskTimelineChart({ risks = [] }) {
  // Group risks into time bins
  const timeBins = React.useMemo(() => {
    if (!risks.length) return [];
    
    // Sort risks by detected_at ascending
    const sorted = [...risks].sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));
    
    // Group by day/hour bucket
    const groups = {};
    sorted.forEach((r) => {
      if (!r.detected_at) return;
      const dateKey = new Date(r.detected_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      groups[dateKey] = (groups[dateKey] || 0) + 1;
    });

    return Object.entries(groups).map(([time, count]) => ({ time, count }));
  }, [risks]);

  const maxVal = Math.max(...timeBins.map((t) => t.count), 1);
  const width = 450;
  const height = 120;
  const padding = 20;

  // Build SVG Path
  const points = timeBins.map((bin, index) => {
    const x = padding + (index / Math.max(timeBins.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (bin.count / maxVal) * (height - padding * 2);
    return { x, y, ...bin };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaD = points.length
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

  return (
    <div className="glass-card chart-card full-width">
      <div className="chart-header">
        <div className="chart-title">
          <TrendingUp className="icon-rose" size={18} />
          <span>Risk Detection Velocity</span>
        </div>
        <span className="chart-subtitle">Realtime Event Stream Curve</span>
      </div>

      <div className="timeline-svg-container">
        {timeBins.length < 2 ? (
          <div className="empty-chart-msg">Insufficient time-series data for velocity curve</div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="timeline-svg">
            <defs>
              <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255, 255, 255, 0.1)" />

            {/* Gradient Area under curve */}
            <path d={areaD} fill="url(#timelineGrad)" />

            {/* Line Path */}
            <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data Points */}
            {points.map((pt, idx) => (
              <g key={idx} className="timeline-point-group">
                <circle cx={pt.x} cy={pt.y} r="4" fill="#38bdf8" stroke="#070b14" strokeWidth="2" />
                <title>{`${pt.time}: ${pt.count} events`}</title>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
