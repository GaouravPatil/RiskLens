import random
import string
import time
import threading
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.database import get_connection
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

# Global state for background streaming simulator
_state_lock = threading.Lock()
_streaming_active = False
_events_generated = 0
_start_time = None
_events_per_sec = 2.0
_recent_feed = []
_worker_thread = None

CATEGORIES = ["Shopping", "Travel", "Electronics", "Entertainment", "Utilities", "Food", "Wire Transfer"]
MERCHANTS = ["Amazon", "Flipkart", "Uber", "Swiggy", "CryptoExchange", "International Bank", "Apple Store"]
RISK_TYPES = [
    ("impossible_travel", "Impossible velocity travel detected across locations within short timeframe"),
    ("high_amount_spike", "Transaction amount exceeds 10x historical average for this account"),
    ("rapid_consecutive_transfers", "High frequency micro-transfers detected within 60 seconds"),
    ("suspicious_after_hours", "High-value off-hours transfer initiated from unusual IP subnet"),
    ("multiple_failed_logins", "Brute-force credential attempt followed by instant wire transfer"),
]
LOCATIONS = ["Mumbai", "London", "New York", "Singapore", "Tokyo", "Dubai", "Sydney", "Berlin"]


class BatchRequest(BaseModel):
    count: int = Field(default=20, ge=1, le=1000)
    anomaly_ratio: float = Field(default=0.3, ge=0.0, le=1.0)


def _generate_code(prefix: str) -> str:
    rnd = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{rnd}"


def _insert_dynamic_records(count: int, anomaly_ratio: float = 0.3):
    global _events_generated, _recent_feed

    new_feed_items = []

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Fetch existing account IDs if available
            cur.execute("SELECT account_id FROM risklens.accounts LIMIT 500;")
            rows = cur.fetchall()
            account_ids = [r[0] for r in rows] if rows else [1]

            for _ in range(count):
                account_id = random.choice(account_ids)
                tx_code = _generate_code("TX")
                amount = round(random.uniform(500, 250000), 2)
                category = random.choice(CATEGORIES)
                merchant = random.choice(MERCHANTS)
                location = random.choice(LOCATIONS)
                is_anomaly = random.random() < anomaly_ratio

                # Insert Transaction
                cur.execute(
                    """
                    INSERT INTO risklens.transactions (
                        transaction_code, account_id, transaction_timestamp,
                        amount, currency, merchant, category, location, payment_method, channel, status
                    ) VALUES (%s, %s, NOW(), %s, 'INR', %s, %s, %s, 'UPI', 'mobile_app', 'success')
                    RETURNING transaction_id;
                    """,
                    (tx_code, account_id, amount, merchant, category, location)
                )
                tx_id = cur.fetchone()[0]

                feed_item = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "type": "transaction",
                    "code": tx_code,
                    "amount": amount,
                    "merchant": merchant,
                    "location": location,
                    "is_anomaly": is_anomaly
                }

                if is_anomaly:
                    risk_type, desc_template = random.choice(RISK_TYPES)
                    risk_score = round(random.uniform(55.0, 98.5), 1)
                    if risk_score >= 85:
                        severity = "critical"
                    elif risk_score >= 70:
                        severity = "high"
                    elif risk_score >= 50:
                        severity = "medium"
                    else:
                        severity = "low"

                    risk_code = _generate_code("RSK")
                    ai_summary = f"[AI Alert] {desc_template}. Transaction amount: ₹{amount:,.2f} at {merchant} ({location})."

                    cur.execute(
                        """
                        INSERT INTO risklens.risk_events (
                            risk_code, entity_type, entity_id, risk_type,
                            risk_score, severity, detected_at, status, ai_summary
                        ) VALUES (%s, 'account', %s, %s, %s, %s, NOW(), 'open', %s)
                        RETURNING risk_id;
                        """,
                        (risk_code, account_id, risk_type, risk_score, severity, ai_summary)
                    )
                    risk_id = cur.fetchone()[0]

                    # Insert Evidence
                    cur.execute(
                        """
                        INSERT INTO risklens.risk_evidence (
                            risk_id, evidence_type, evidence_data
                        ) VALUES (%s, 'transaction', %s);
                        """,
                        (risk_id, f'{{"transaction_id": {tx_id}, "amount": {amount}, "merchant": "{merchant}"}}')
                    )

                    feed_item["risk_code"] = risk_code
                    feed_item["risk_type"] = risk_type
                    feed_item["severity"] = severity
                    feed_item["score"] = risk_score
                    feed_item["type"] = "risk_event"

                new_feed_items.append(feed_item)

            conn.commit()

    with _state_lock:
        _events_generated += count
        _recent_feed = (new_feed_items + _recent_feed)[:30]

    return new_feed_items


def _stream_worker():
    global _streaming_active
    while True:
        with _state_lock:
            if not _streaming_active:
                break

        try:
            _insert_dynamic_records(count=1, anomaly_ratio=0.35)
        except Exception as e:
            print(f"[Simulation Worker Error]: {e}")

        time.sleep(1.0 / _events_per_sec)


@router.get("/status")
def get_simulation_status(current_user: dict = Depends(get_current_user)):
    with _state_lock:
        uptime = (datetime.now(timezone.utc) - _start_time).total_seconds() if (_streaming_active and _start_time) else 0.0
        return {
            "active": _streaming_active,
            "events_generated": _events_generated,
            "events_per_sec": _events_per_sec,
            "uptime_seconds": round(uptime, 1)
        }


@router.get("/feed")
def get_simulation_feed(current_user: dict = Depends(get_current_user)):
    with _state_lock:
        return {
            "active": _streaming_active,
            "feed": list(_recent_feed)
        }


@router.post("/start")
def start_simulation(current_user: dict = Depends(get_current_user)):
    global _streaming_active, _start_time, _worker_thread
    with _state_lock:
        if not _streaming_active:
            _streaming_active = True
            _start_time = datetime.now(timezone.utc)
            _worker_thread = threading.Thread(target=_stream_worker, daemon=True)
            _worker_thread.start()

    return {"status": "started", "active": True}


@router.post("/stop")
def stop_simulation(current_user: dict = Depends(get_current_user)):
    global _streaming_active
    with _state_lock:
        _streaming_active = False

    return {"status": "stopped", "active": False}


@router.post("/batch")
def generate_batch(req: BatchRequest, current_user: dict = Depends(get_current_user)):
    items = _insert_dynamic_records(count=req.count, anomaly_ratio=req.anomaly_ratio)
    return {
        "status": "success",
        "inserted_count": req.count,
        "new_items": items
    }
