import { useState, useEffect } from "react";
import { Play, Square, Zap, Layers, Activity, RefreshCw, X, Sliders, CheckCircle2 } from "lucide-react";
import {
  getSimulationStatus,
  startSimulation,
  stopSimulation,
  triggerBatchGeneration,
} from "../services/api";

export default function StreamControl({ onDataInserted }) {
  const [active, setActive] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [eventsPerSec, setEventsPerSec] = useState(2.0);
  const [loading, setLoading] = useState(false);

  // Batch modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [batchCount, setBatchCount] = useState(50);
  const [anomalyRatio, setAnomalyRatio] = useState(0.3);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchStatus = async () => {
    try {
      const status = await getSimulationStatus();
      setActive(status.active);
      setGeneratedCount(status.events_generated);
      setEventsPerSec(status.events_per_sec);
    } catch (err) {
      console.error("Failed to fetch simulation status", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleStream = async () => {
    try {
      setLoading(true);
      if (active) {
        await stopSimulation();
        setActive(false);
      } else {
        await startSimulation();
        setActive(true);
      }
      if (onDataInserted) onDataInserted();
    } catch (err) {
      console.error("Failed to toggle simulation stream", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBatch = async () => {
    try {
      setGenerating(true);
      setSuccessMsg("");
      const res = await triggerBatchGeneration(batchCount, anomalyRatio);
      setSuccessMsg(`Successfully inserted ${res.inserted_count} dynamic records into PostgreSQL!`);
      fetchStatus();
      if (onDataInserted) onDataInserted();
      setTimeout(() => {
        setSuccessMsg("");
        setModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to generate batch", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="stream-control-wrapper">
      {/* Live Stream Status & Toggle Bar */}
      <div className="stream-bar glass-card">
        <div className="stream-info">
          <div className={`pulse-indicator ${active ? "active" : ""}`}>
            <span className="pulse-dot"></span>
            <span className="pulse-text">
              {active ? `LIVE INGESTION (${eventsPerSec} evt/s)` : "INGESTION IDLE"}
            </span>
          </div>
          <div className="stream-stat">
            <Activity className="stat-icon" />
            <span>{generatedCount.toLocaleString()} Dynamic Events Inserted</span>
          </div>
        </div>

        <div className="stream-actions">
          <button
            onClick={handleToggleStream}
            disabled={loading}
            className={`btn-stream-toggle ${active ? "active-btn" : ""}`}
            title={active ? "Pause live event streaming" : "Start real-time dynamic event streaming"}
          >
            {active ? (
              <>
                <Square className="btn-icon" /> Stop Stream
              </>
            ) : (
              <>
                <Play className="btn-icon" /> Live Stream
              </>
            )}
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="btn-batch-modal"
          >
            <Zap className="btn-icon text-amber-400" />
            <span>Generate Batch</span>
          </button>
        </div>
      </div>

      {/* Batch Generator Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="modal-content glass-card animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <h3>Dynamic Data Generator</h3>
              </div>
              <button
                className="close-btn"
                onClick={() => setModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="modal-desc">
              Instantly generate and insert dynamic synthetic records (transactions & anomaly risk events) directly into PostgreSQL database.
            </p>

            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="label-text">Number of Records to Insert</label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {[20, 50, 100, 250, 500].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`btn-option ${batchCount === count ? "selected" : ""}`}
                      onClick={() => setBatchCount(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group mt-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="label-text">Anomaly Injection Ratio</label>
                  <span className="slider-value">{(anomalyRatio * 100).toFixed(0)}% Anomalies</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={anomalyRatio}
                  onChange={(e) => setAnomalyRatio(parseFloat(e.target.value))}
                  className="w-full range-slider"
                />
              </div>

              {successMsg && (
                <div className="alert-success-box flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={generating}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleGenerateBatch}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Ingesting to DB...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" /> Insert {batchCount} Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
