-- ============================================================
-- RiskLens Database Indexes
-- ============================================================

SET search_path TO risklens;


-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id
ON accounts(user_id);


-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_account_id
ON transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_timestamp
ON transactions(transaction_timestamp);

CREATE INDEX IF NOT EXISTS idx_transactions_account_timestamp
ON transactions(account_id, transaction_timestamp);


-- Access Logs
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id
ON access_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp
ON access_logs(event_timestamp);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_timestamp
ON access_logs(user_id, event_timestamp);


-- Risk Events
CREATE INDEX IF NOT EXISTS idx_risk_events_severity
ON risk_events(severity);

CREATE INDEX IF NOT EXISTS idx_risk_events_status
ON risk_events(status);

CREATE INDEX IF NOT EXISTS idx_risk_events_detected_at
ON risk_events(detected_at);
