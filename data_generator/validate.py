import csv
import os
from collections import Counter


RAW_DIR = "data/raw"


def read_csv(filename):
    path = os.path.join(RAW_DIR, filename)

    with open(path, newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def check_missing(rows, fields):
    results = {}

    for field in fields:
        count = sum(
            1 for row in rows
            if not row.get(field, "").strip()
        )

        results[field] = count

    return results


def check_duplicates(rows, key):
    values = [
        row[key]
        for row in rows
        if row.get(key)
    ]

    counter = Counter(values)

    return {
        value: count
        for value, count in counter.items()
        if count > 1
    }


def main():

   
    print("RiskLens Data Quality Validation")
   
    users = read_csv("users.csv")
    accounts = read_csv("accounts.csv")
    transactions = read_csv("transactions.csv")
    access_logs = read_csv("access_logs.csv")

    print("\nROW COUNTS")
   

    print(f"Users:         {len(users):,}")
    print(f"Accounts:      {len(accounts):,}")
    print(f"Transactions:  {len(transactions):,}")
    print(f"Access logs:   {len(access_logs):,}")

    # --------------------------------------------------------
    # Missing values
    # --------------------------------------------------------

    print("\nMISSING VALUES")
    

    user_missing = check_missing(
        users,
        [
            "full_name",
            "email",
            "phone",
            "department",
            "home_location",
        ]
    )

    for field, count in user_missing.items():
        print(f"users.{field}: {count}")

    transaction_missing = check_missing(
        transactions,
        [
            "account_code",
            "transaction_timestamp",
            "amount",
            "merchant",
            "category",
            "location",
        ]
    )

    for field, count in transaction_missing.items():
        print(f"transactions.{field}: {count}")

    # --------------------------------------------------------
    # Duplicate transactions
    # --------------------------------------------------------

    print("\nDUPLICATES")
   

    transaction_duplicates = check_duplicates(
        transactions,
        "transaction_code"
    )

    access_duplicates = check_duplicates(
        access_logs,
        "log_code"
    )

    print(
        f"Duplicate transaction codes: "
        f"{len(transaction_duplicates)}"
    )

    print(
        f"Duplicate access-log codes: "
        f"{len(access_duplicates)}"
    )

    # --------------------------------------------------------
    # Invalid amounts
    # --------------------------------------------------------

    print("\nINVALID VALUES")
    

    invalid_amounts = []

    for row in transactions:
        try:
            amount = float(row["amount"])

            if amount <= 0:
                invalid_amounts.append(
                    row["transaction_code"]
                )

        except (ValueError, TypeError):
            invalid_amounts.append(
                row["transaction_code"]
            )

    print(
        f"Invalid transaction amounts: "
        f"{len(invalid_amounts)}"
    )

    # --------------------------------------------------------
    # Invalid emails
    # --------------------------------------------------------

    invalid_emails = []

    for row in users:

        email = row["email"]

        if "@" not in email or "." not in email:
            invalid_emails.append(
                row["user_code"]
            )

    print(
        f"Invalid emails: "
        f"{len(invalid_emails)}"
    )

    # --------------------------------------------------------
    # Invalid IP addresses
    # --------------------------------------------------------

    invalid_ips = []

    for row in access_logs:

        ip = row["ip_address"]

        parts = ip.split(".")

        if len(parts) != 4:
            invalid_ips.append(
                row["log_code"]
            )

    print(
        f"Invalid IP addresses: "
        f"{len(invalid_ips)}"
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------


    print("VALIDATION COMPLETE")
    


if __name__ == "__main__":
    main()