from fastapi import APIRouter, HTTPException, Depends
from psycopg2 import errors
from pydantic import BaseModel
from app.database import get_connection
from app.dependencies import (
    get_current_user,
    get_current_user_id,
    require_roles,
)

router = APIRouter(prefix="/api/risks", tags=["Risks"])

# Mirrors the chk_risk_status constraint on risklens.risk_events
ALLOWED_STATUSES = (
    "open",
    "investigating",
    "resolved",
    "false_positive",
)

########## Risk all ##################
@router.get("/")
def get_risks(
    current_user: dict = Depends(get_current_user),
    severity: str | None = None,
    status: str | None = None,
    min_score: float | None = None
):
    with get_connection() as conn:
        with conn.cursor() as cur:

            query = """
                SELECT
                    re.risk_id,
                    re.risk_code,
                    re.entity_type,
                    re.entity_id,
                    re.risk_type,
                    re.risk_score,
                    re.severity,
                    re.detected_at,
                    re.status,
                    re.ai_summary
                FROM risklens.risk_events re
                WHERE 1=1
            """

            params = []

            if severity:
                query += " AND re.severity = %s"
                params.append(severity)

            if status:
                query += " AND re.status = %s"
                params.append(status)

            if min_score is not None:
                query += " AND re.risk_score >= %s"
                params.append(min_score)

            query += " ORDER BY re.risk_score DESC"

            cur.execute(query, tuple(params))

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            return [
                dict(zip(columns, row))
                for row in rows
            ]


########## Summary ###########

@router.get("/summary")
def get_risk_summary( 
    current_user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(*) AS total_risks,

                    COUNT(*) FILTER (
                        WHERE severity = 'critical'
                    ) AS critical_risks,

                    COUNT(*) FILTER (
                        WHERE severity = 'high'
                    ) AS high_risks,

                    COUNT(*) FILTER (
                        WHERE severity = 'medium'
                    ) AS medium_risks,

                    COUNT(*) FILTER (
                        WHERE severity = 'low'
                    ) AS low_risks,

                    COUNT(*) FILTER (
                        WHERE status = 'open'
                    ) AS open_risks,

                    COUNT(*) FILTER (
                        WHERE status = 'investigating'
                    ) AS investigating_risks,

                    COUNT(*) FILTER (
                        WHERE status = 'resolved'
                    ) AS resolved_risks,

                    COUNT(*) FILTER (
                        WHERE status = 'false_positive'
                    ) AS false_positive_risks,

                    COALESCE(
                        ROUND(AVG(risk_score), 2),
                        0
                    ) AS average_risk_score

                FROM risklens.risk_events
            """)

            row = cur.fetchone()

            columns = [desc[0] for desc in cur.description]

            return dict(zip(columns, row))


class RiskStatusUpdate(BaseModel):
    status: str

########## RISK ID STATUS ###########

@router.patch("/{risk_id}/status")
def update_risk_status(
    risk_id: int,
    payload: RiskStatusUpdate,
    reviewed_by: int = Depends(get_current_user_id),
    current_user: dict = Depends(
        require_roles("ADMIN", "RISK_ANALYST", "RISK_MANAGER")
    )
):
    status = payload.status

    if status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Allowed values: "
                + ", ".join(ALLOWED_STATUSES)
            )
        )

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:

                # 1. Get current status
                cur.execute("""
                    SELECT status
                    FROM risklens.risk_events
                    WHERE risk_id = %s
                """, (risk_id,))

                row = cur.fetchone()

                if not row:
                    raise HTTPException(
                        status_code=404,
                        detail="Risk event not found"
                    )

                old_status = row[0]

                # 2. Update status, attributing it to the authenticated user
                cur.execute("""
                    UPDATE risklens.risk_events
                    SET
                        status = %s,
                        reviewed_by = %s,
                        reviewed_at = CURRENT_TIMESTAMP
                    WHERE risk_id = %s
                    RETURNING
                        risk_id,
                        risk_code,
                        entity_type,
                        entity_id,
                        risk_type,
                        risk_score,
                        severity,
                        detected_at,
                        status,
                        ai_summary,
                        reviewed_by,
                        reviewed_at
                """, (status, reviewed_by, risk_id))

                # Read the description before the INSERT below replaces it
                columns = [desc[0] for desc in cur.description]
                updated_row = cur.fetchone()

                # 3. Create audit history
                cur.execute("""
                    INSERT INTO risklens.risk_status_history (
                        risk_id,
                        old_status,
                        new_status,
                        reviewed_by
                    )
                    VALUES (%s, %s, %s, %s)
                """, (
                    risk_id,
                    old_status,
                    status,
                    reviewed_by
                ))

                return dict(zip(columns, updated_row))

    except errors.ForeignKeyViolation:
        raise HTTPException(
            status_code=400,
            detail="Reviewer does not refer to an existing user"
        )


####RISK ID #######

@router.get("/{risk_id}")
def get_risk(risk_id: int,
  current_user: dict = Depends(get_current_user)
):
    with get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    re.risk_id,
                    re.risk_code,
                    re.entity_type,
                    re.entity_id,
                    re.risk_type,
                    re.risk_score,
                    re.severity,
                    re.detected_at,
                    re.status,
                    re.ai_summary,
                    re.reviewed_by,
                    re.reviewed_at
                FROM risklens.risk_events re
                WHERE re.risk_id = %s
            """, (risk_id,))

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Risk event not found"
                )

            columns = [desc[0] for desc in cur.description]
            risk = dict(zip(columns, row))

            cur.execute("""
                SELECT
                    evidence_id,
                    evidence_type,
                    metric_name,
                    metric_value,
                    description,
                    created_at
                FROM risklens.risk_evidence
                WHERE risk_id = %s
                ORDER BY evidence_id
            """, (risk_id,))

            evidence_columns = [desc[0] for desc in cur.description]
            evidence_rows = cur.fetchall()

            risk["evidence"] = [
                dict(zip(evidence_columns, evidence))
                for evidence in evidence_rows
            ]

            cur.execute("""
                SELECT
                    h.history_id,
                    h.old_status,
                    h.new_status,
                    h.reviewed_by,
                    u.full_name AS reviewed_by_name,
                    h.changed_at
                FROM risklens.risk_status_history h
                LEFT JOIN risklens.users u
                    ON u.user_id = h.reviewed_by
                WHERE h.risk_id = %s
                ORDER BY h.changed_at DESC, h.history_id DESC
            """, (risk_id,))

            history_columns = [desc[0] for desc in cur.description]
            history_rows = cur.fetchall()

            risk["status_history"] = [
                dict(zip(history_columns, entry))
                for entry in history_rows
            ]

            return risk