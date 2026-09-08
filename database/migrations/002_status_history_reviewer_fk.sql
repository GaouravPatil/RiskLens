-- ============================================================
-- Migration 002: risk_status_history.reviewed_by -> BIGINT + FK
-- ============================================================
-- reviewed_by was VARCHAR with no foreign key, while
-- risk_events.reviewed_by is BIGINT REFERENCES users(user_id).
-- The reviewer is now taken from the authenticated JWT subject,
-- so both columns should agree and be referentially enforced.
--
-- The USING clause below discards any value that is not a plain
-- integer. Verify before running on data you care about:
--     SELECT history_id, reviewed_by
--     FROM risklens.risk_status_history
--     WHERE reviewed_by IS NOT NULL
--       AND reviewed_by !~ '^[0-9]+$';
-- ============================================================

SET search_path TO risklens;


-- 1. Widen the type, dropping non-numeric legacy values
ALTER TABLE risk_status_history
    ALTER COLUMN reviewed_by TYPE BIGINT
    USING NULLIF(regexp_replace(reviewed_by, '\D', '', 'g'), '')::BIGINT;


-- 2. Enforce that a reviewer is a real user
ALTER TABLE risk_status_history
    DROP CONSTRAINT IF EXISTS fk_risk_status_history_reviewer;

ALTER TABLE risk_status_history
    ADD CONSTRAINT fk_risk_status_history_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id);
