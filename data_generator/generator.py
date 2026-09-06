import csv
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

from faker import Faker


# ============================================================
# CONFIGURATION
# ============================================================

SEED = 42

NUM_USERS = 1000
NUM_ACCOUNTS = 1500
NUM_TRANSACTIONS = 100_000
NUM_ACCESS_LOGS = 100_000

ANOMALIES_PER_TYPE = 200

OUTPUT_RAW = "data/raw"
OUTPUT_GROUND_TRUTH = "data/ground_truth"


# ============================================================
# INITIALIZATION
# ============================================================

random.seed(SEED)

fake = Faker("en_IN")
fake.seed_instance(SEED)


# ============================================================
# STATIC DATA
# ============================================================

LOCATIONS = [
    "Hyderabad",
    "Pune",
    "Mumbai",
    "Bangalore",
    "Delhi",
    "Chennai",
    "Kolkata",
    "Ahmedabad",
]

FOREIGN_LOCATIONS = [
    "London",
    "New York",
    "Singapore",
    "Dubai",
    "Toronto",
]

DEPARTMENTS = [
    "Finance",
    "IT",
    "Operations",
    "HR",
    "Procurement",
    "Sales",
]

ACCOUNT_TYPES = [
    "standard",
    "premium",
]

CATEGORIES = [
    "Food",
    "Shopping",
    "Travel",
    "Entertainment",
    "Utilities",
    "Electronics",
    "Healthcare",
    "Education",
]

MERCHANTS = {
    "Food": [
        "Swiggy",
        "Zomato",
        "Dominos",
        "McDonalds",
    ],
    "Shopping": [
        "Amazon",
        "Flipkart",
        "Myntra",
        "Reliance Digital",
    ],
    "Travel": [
        "MakeMyTrip",
        "Uber",
        "Ola",
        "IndiGo",
    ],
    "Entertainment": [
        "Netflix",
        "BookMyShow",
        "Spotify",
    ],
    "Utilities": [
        "Airtel",
        "Jio",
        "Electricity Board",
    ],
    "Electronics": [
        "Croma",
        "Reliance Digital",
        "XYZ Electronics",
    ],
    "Healthcare": [
        "Apollo Pharmacy",
        "MedPlus",
    ],
    "Education": [
        "Coursera",
        "Udemy",
    ],
}

PAYMENT_METHODS = [
    "card",
    "upi",
    "netbanking",
]

CHANNELS = [
    "online",
    "mobile",
    "branch",
]

DEVICES = [
    "laptop",
    "desktop",
    "mobile",
    "tablet",
]

NORMAL_RESOURCES = [
    "Dashboard",
    "Reports",
    "Transactions",
    "Profile",
    "Documents",
]

NORMAL_ACTIONS = [
    "READ",
    "VIEW",
    "DOWNLOAD",
]

SUSPICIOUS_RESOURCES = [
    "AdminConfiguration",
    "UserPermissions",
    "SecuritySettings",
]

SUSPICIOUS_ACTIONS = [
    "DELETE",
    "MODIFY",
    "EXPORT",
]


# ============================================================
# HELPERS
# ============================================================

def ensure_directories():
    os.makedirs(OUTPUT_RAW, exist_ok=True)
    os.makedirs(OUTPUT_GROUND_TRUTH, exist_ok=True)


def random_timestamp(days=90):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)

    seconds = int((end - start).total_seconds())

    return start + timedelta(
        seconds=random.randint(0, seconds)
    )


def write_csv(filename, fieldnames, rows):
    path = os.path.join(OUTPUT_RAW, filename)

    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames
        )

        writer.writeheader()
        writer.writerows(rows)

    print(f"Created {path}")


# ============================================================
# USERS
# ============================================================

def generate_users():
    users = []

    for i in range(1, NUM_USERS + 1):

        user_code = f"U{i:05d}"

        first_name = fake.first_name()
        last_name = fake.last_name()

        full_name = f"{first_name} {last_name}"

        location = random.choice(LOCATIONS)

        user = {
            "user_code": user_code,
            "full_name": full_name,
            "email": f"{first_name.lower()}.{last_name.lower()}{i}@example.com",
            "phone": fake.numerify("##########"),
            "department": random.choice(DEPARTMENTS),
            "home_location": location,
            "status": "active",
        }

        users.append(user)

    return users


# ============================================================
# ACCOUNTS
# ============================================================

def generate_accounts(users):
    accounts = []

    account_number = 1

    for user in users:

        number_of_accounts = random.choice([1, 1, 1, 2])

        for _ in range(number_of_accounts):

            if account_number > NUM_ACCOUNTS:
                break

            accounts.append({
                "account_code": f"A{account_number:06d}",
                "user_code": user["user_code"],
                "account_type": random.choice(ACCOUNT_TYPES),
                "currency": "INR",
                "status": "active",
            })

            account_number += 1

    return accounts


# ============================================================
# TRANSACTIONS
# ============================================================

def generate_transactions(users, accounts):
    transactions = []
    anomalies = []

    account_by_user = {}

    for account in accounts:
        account_by_user.setdefault(
            account["user_code"],
            []
        ).append(account)

    transaction_number = 1

    # --------------------------------------------------------
    # Normal transactions
    # --------------------------------------------------------

    for _ in range(NUM_TRANSACTIONS):

        user = random.choice(users)

        user_accounts = account_by_user[user["user_code"]]

        account = random.choice(user_accounts)

        category = random.choice(CATEGORIES)

        # Normal transaction amount
        amount = round(
            random.lognormvariate(
                7.2,
                0.8
            ),
            2
        )

        amount = min(max(amount, 100), 25_000)

        location = user["home_location"]

        merchant = random.choice(
            MERCHANTS[category]
        )

        transaction = {
            "transaction_code": f"T{transaction_number:08d}",
            "account_code": account["account_code"],
            "transaction_timestamp": random_timestamp().isoformat(),
            "amount": amount,
            "currency": "INR",
            "merchant": merchant,
            "category": category,
            "location": location,
            "payment_method": random.choice(PAYMENT_METHODS),
            "channel": random.choice(CHANNELS),
            "status": "success",
        }

        transactions.append(transaction)

        transaction_number += 1

    # --------------------------------------------------------
    # Anomaly 1: unusually high transaction amount
    # --------------------------------------------------------

    for _ in range(ANOMALIES_PER_TYPE):

        user = random.choice(users)

        account = random.choice(
            account_by_user[user["user_code"]]
        )

        transaction_code = f"T{transaction_number:08d}"

        transaction = {
            "transaction_code": transaction_code,
            "account_code": account["account_code"],
            "transaction_timestamp": random_timestamp().isoformat(),
            "amount": round(
                random.uniform(100_000, 500_000),
                2
            ),
            "currency": "INR",
            "merchant": random.choice(
                MERCHANTS["Electronics"]
            ),
            "category": "Electronics",
            "location": user["home_location"],
            "payment_method": "card",
            "channel": "online",
            "status": "success",
        }

        transactions.append(transaction)

        anomalies.append({
            "anomaly_id": str(uuid.uuid4()),
            "entity_type": "transaction",
            "entity_code": transaction_code,
            "anomaly_type": "HIGH_TRANSACTION_AMOUNT",
            "severity": "high",
            "description": "Transaction amount is significantly higher than normal behavioral range.",
        })

        transaction_number += 1

    # --------------------------------------------------------
    # Anomaly 2: unusual transaction location
    # --------------------------------------------------------

    for _ in range(ANOMALIES_PER_TYPE):

        user = random.choice(users)

        account = random.choice(
            account_by_user[user["user_code"]]
        )

        transaction_code = f"T{transaction_number:08d}"

        transaction = {
            "transaction_code": transaction_code,
            "account_code": account["account_code"],
            "transaction_timestamp": random_timestamp().isoformat(),
            "amount": round(
                random.uniform(2_000, 20_000),
                2
            ),
            "currency": "INR",
            "merchant": random.choice(
                MERCHANTS["Shopping"]
            ),
            "category": "Shopping",
            "location": random.choice(
                FOREIGN_LOCATIONS
            ),
            "payment_method": "card",
            "channel": "online",
            "status": "success",
        }

        transactions.append(transaction)

        anomalies.append({
            "anomaly_id": str(uuid.uuid4()),
            "entity_type": "transaction",
            "entity_code": transaction_code,
            "anomaly_type": "UNUSUAL_LOCATION",
            "severity": "high",
            "description": "Transaction occurred in a location inconsistent with the user's normal location.",
        })

        transaction_number += 1

    # --------------------------------------------------------
    # Anomaly 3: transaction frequency burst
    # --------------------------------------------------------

    for _ in range(ANOMALIES_PER_TYPE):

        user = random.choice(users)

        account = random.choice(
            account_by_user[user["user_code"]]
        )

        base_time = random_timestamp()

        for burst_index in range(3):

            transaction_code = f"T{transaction_number:08d}"

            transaction = {
                "transaction_code": transaction_code,
                "account_code": account["account_code"],
                "transaction_timestamp": (
                    base_time + timedelta(
                        seconds=burst_index * 30
                    )
                ).isoformat(),
                "amount": round(
                    random.uniform(3_000, 10_000),
                    2
                ),
                "currency": "INR",
                "merchant": random.choice(
                    MERCHANTS["Shopping"]
                ),
                "category": "Shopping",
                "location": user["home_location"],
                "payment_method": "card",
                "channel": "online",
                "status": "success",
            }

            transactions.append(transaction)

            anomalies.append({
                "anomaly_id": str(uuid.uuid4()),
                "entity_type": "transaction",
                "entity_code": transaction_code,
                "anomaly_type": "HIGH_TRANSACTION_FREQUENCY",
                "severity": "medium",
                "description": "Multiple transactions occurred within an unusually short time window.",
            })

            transaction_number += 1

    return transactions, anomalies


# ============================================================
# ACCESS LOGS
# ============================================================

def generate_access_logs(users):
    logs = []
    anomalies = []

    log_number = 1

    # --------------------------------------------------------
    # Normal access
    # --------------------------------------------------------

    for _ in range(NUM_ACCESS_LOGS):

        user = random.choice(users)

        resource = random.choice(
            NORMAL_RESOURCES
        )

        action = random.choice(
            NORMAL_ACTIONS
        )

        log = {
            "log_code": f"L{log_number:08d}",
            "user_code": user["user_code"],
            "event_timestamp": random_timestamp().isoformat(),
            "ip_address": f"10.10.{random.randint(1, 20)}.{random.randint(1, 254)}",
            "resource": resource,
            "action": action,
            "status": "success",
            "location": user["home_location"],
            "device_type": random.choice(DEVICES),
            "session_id": f"S{random.randint(100000, 999999)}",
            "failure_reason": "",
        }

        logs.append(log)

        log_number += 1

    # --------------------------------------------------------
    # Anomaly 4: repeated failed access
    # --------------------------------------------------------

    for _ in range(ANOMALIES_PER_TYPE):

        user = random.choice(users)

        base_time = random_timestamp()

        suspicious_ip = (
            f"185.{random.randint(1, 200)}."
            f"{random.randint(1, 200)}."
            f"{random.randint(1, 254)}"
        )

        for attempt in range(3):

            log_code = f"L{log_number:08d}"

            log = {
                "log_code": log_code,
                "user_code": user["user_code"],
                "event_timestamp": (
                    base_time + timedelta(
                        seconds=attempt * 20
                    )
                ).isoformat(),
                "ip_address": suspicious_ip,
                "resource": "AdminConfiguration",
                "action": "DELETE",
                "status": "failed",
                "location": random.choice(
                    FOREIGN_LOCATIONS
                ),
                "device_type": "unknown",
                "session_id": f"S{random.randint(100000, 999999)}",
                "failure_reason": "permission_denied",
            }

            logs.append(log)

            anomalies.append({
                "anomaly_id": str(uuid.uuid4()),
                "entity_type": "access_log",
                "entity_code": log_code,
                "anomaly_type": "REPEATED_FAILED_ACCESS",
                "severity": "high",
                "description": "Repeated failed access attempts were observed for a sensitive resource.",
            })

            log_number += 1

    # --------------------------------------------------------
    # Anomaly 5: unusual resource/action
    # --------------------------------------------------------

    for _ in range(ANOMALIES_PER_TYPE):

        user = random.choice(users)

        log_code = f"L{log_number:08d}"

        log = {
            "log_code": log_code,
            "user_code": user["user_code"],
            "event_timestamp": random_timestamp().isoformat(),
            "ip_address": f"10.99.{random.randint(1, 20)}.{random.randint(1, 254)}",
            "resource": random.choice(
                SUSPICIOUS_RESOURCES
            ),
            "action": random.choice(
                SUSPICIOUS_ACTIONS
            ),
            "status": "success",
            "location": user["home_location"],
            "device_type": random.choice(DEVICES),
            "session_id": f"S{random.randint(100000, 999999)}",
            "failure_reason": "",
        }

        logs.append(log)

        anomalies.append({
            "anomaly_id": str(uuid.uuid4()),
            "entity_type": "access_log",
            "entity_code": log_code,
            "anomaly_type": "UNUSUAL_RESOURCE_ACTION",
            "severity": "critical",
            "description": "User performed an unusual action against a sensitive resource.",
        })

        log_number += 1

    return logs, anomalies


# ============================================================
# DATA QUALITY ISSUES
# ============================================================

def inject_data_quality_issues(
    users,
    transactions,
    access_logs
):
    """
    Intentionally introduce dirty records into raw data.

    These records are NOT labeled as anomalies.
    They represent data-quality problems that the ETL layer
    must identify and handle.
    """

    # Missing user phone
    for _ in range(10):
        user = random.choice(users)
        user["phone"] = ""

    # Missing transaction merchant
    for _ in range(20):
        transaction = random.choice(transactions)
        transaction["merchant"] = ""

    # Missing transaction category
    for _ in range(10):
        transaction = random.choice(transactions)
        transaction["category"] = ""

    # Invalid email
    for _ in range(5):
        user = random.choice(users)
        user["email"] = "invalid-email"

    # Invalid transaction amount
    for _ in range(5):
        transaction = random.choice(transactions)
        transaction["amount"] = -100

    # Invalid access IP
    for _ in range(5):
        log = random.choice(access_logs)
        log["ip_address"] = "invalid-ip"

    # Duplicate transaction records
    duplicates = random.sample(
        transactions,
        10
    )

    transactions.extend(duplicates)

    # Duplicate access records
    duplicates = random.sample(
        access_logs,
        10
    )

    access_logs.extend(duplicates)


# ============================================================
# WRITE GROUND TRUTH
# ============================================================

def write_ground_truth(anomalies):
    path = os.path.join(
        OUTPUT_GROUND_TRUTH,
        "anomalies.csv"
    )

    fields = [
        "anomaly_id",
        "entity_type",
        "entity_code",
        "anomaly_type",
        "severity",
        "description",
    ]

    with open(
        path,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields
        )

        writer.writeheader()
        writer.writerows(anomalies)

    print(f"Created {path}")


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("RiskLens Synthetic Data Generator")
    print("=" * 60)

    ensure_directories()

    print("\nGenerating users...")
    users = generate_users()

    print("Generating accounts...")
    accounts = generate_accounts(users)

    print("Generating transactions...")
    transactions, transaction_anomalies = (
        generate_transactions(
            users,
            accounts
        )
    )

    print("Generating access logs...")
    access_logs, access_anomalies = (
        generate_access_logs(users)
    )

    print("Injecting data-quality issues...")
    inject_data_quality_issues(
        users,
        transactions,
        access_logs
    )

    all_anomalies = (
        transaction_anomalies
        + access_anomalies
    )

    # --------------------------------------------------------
    # Write users
    # --------------------------------------------------------

    write_csv(
        "users.csv",
        [
            "user_code",
            "full_name",
            "email",
            "phone",
            "department",
            "home_location",
            "status",
        ],
        users
    )

    # --------------------------------------------------------
    # Write accounts
    # --------------------------------------------------------

    write_csv(
        "accounts.csv",
        [
            "account_code",
            "user_code",
            "account_type",
            "currency",
            "status",
        ],
        accounts
    )

 
    # Write transactions
    

    write_csv(
        "transactions.csv",
        [
            "transaction_code",
            "account_code",
            "transaction_timestamp",
            "amount",
            "currency",
            "merchant",
            "category",
            "location",
            "payment_method",
            "channel",
            "status",
        ],
        transactions
    )

    
    # Write access logs
   

    write_csv(
        "access_logs.csv",
        [
            "log_code",
            "user_code",
            "event_timestamp",
            "ip_address",
            "resource",
            "action",
            "status",
            "location",
            "device_type",
            "session_id",
            "failure_reason",
        ],
        access_logs
    )

    
    # Write ground truth
  

    write_ground_truth(
        all_anomalies
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("GENERATION COMPLETE")
    print("=" * 60)

    print(f"Users:              {len(users):,}")
    print(f"Accounts:           {len(accounts):,}")
    print(f"Transactions:       {len(transactions):,}")
    print(f"Access logs:        {len(access_logs):,}")
    print(f"Ground truth:       {len(all_anomalies):,}")

    print("\nOutput:")
    print(f"  {OUTPUT_RAW}/")
    print(f"  {OUTPUT_GROUND_TRUTH}/")


if __name__ == "__main__":
    main()