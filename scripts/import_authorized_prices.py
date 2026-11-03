#!/usr/bin/env python3
"""Import an authorized retailer CSV into Cart Snag; dry-run by default.

Columns: retailer,store_location,country,product_name,food_group,currency,
price_minor,unit_quantity,unit_label,source_url,verified_at,expires_at,
source_key,availability
Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only in a trusted server
environment; never in browser code or version control.
"""
import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request

GROUPS = {"meat", "dairy", "vegetables", "fruits", "grains"}
FIELDS = ("retailer", "store_location", "country", "product_name", "food_group",
          "currency", "price_minor", "unit_quantity", "unit_label", "source_url",
          "verified_at", "expires_at", "source_key", "availability")


def parse_date(value):
    parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include timezone")
    return parsed.astimezone(dt.timezone.utc)


def validate(row, now):
    for field in FIELDS:
        if not (row.get(field) or "").strip():
            raise ValueError("Missing " + field)
    if row["food_group"].lower() not in GROUPS:
        raise ValueError("Unsupported food group")
    if row["country"] not in ("CA", "US"):
        raise ValueError("Unsupported country")
    if row["currency"] != {"CA": "CAD", "US": "USD"}[row["country"]]:
        raise ValueError("Currency/country mismatch")
    if row["availability"] != "verified":
        raise ValueError("Only verified prices may be imported")
    if not row["price_minor"].isdigit() or int(row["price_minor"]) < 0:
        raise ValueError("Invalid price")
    quantity = float(row["unit_quantity"])
    if not 0 < quantity < 1_000_000:
        raise ValueError("Invalid quantity")
    url = urllib.parse.urlparse(row["source_url"])
    if url.scheme != "https" or not url.hostname or url.username or url.password:
        raise ValueError("Invalid HTTPS source")
    verified = parse_date(row["verified_at"])
    expires = parse_date(row["expires_at"])
    if verified > now + dt.timedelta(minutes=5) or verified < now - dt.timedelta(hours=24):
        raise ValueError("Price is not recently verified")
    if expires <= now or expires <= verified:
        raise ValueError("Price expired")
    return {**{k: row[k].strip() for k in FIELDS},
            "food_group": row["food_group"].lower(),
            "price_minor": int(row["price_minor"]),
            "unit_quantity": quantity,
            "verified_at": verified.isoformat(),
            "expires_at": expires.isoformat()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path")
    parser.add_argument("--apply", action="store_true",
                        help="Write to Supabase (requires server-only credentials)")
    args = parser.parse_args()
    now = dt.datetime.now(dt.timezone.utc)
    rows = []
    with open(args.csv_path, newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        if not set(FIELDS).issubset(reader.fieldnames or []):
            parser.error("CSV is missing required columns")
        for line, row in enumerate(reader, 2):
            try:
                rows.append(validate(row, now))
            except (ValueError, TypeError, OverflowError) as exc:
                parser.error(f"line {line}: {exc}")
    if not rows:
        parser.error("CSV contains no offers")
    if len({r["source_url"] for r in rows}) != len(rows):
        parser.error("Duplicate source_url in import")
    if not args.apply:
        print(json.dumps({"validated": len(rows), "applied": False}))
        return
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base.startswith("https://") or not key:
        parser.error("Missing trusted server Supabase configuration")
    request = urllib.request.Request(
        base + "/rest/v1/cart_snag_offers?on_conflict=source_url",
        data=json.dumps(rows).encode(),
        headers={"apikey": key, "Authorization": "Bearer " + key,
                 "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates,return=minimal"},
        method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status not in (200, 201, 204):
            raise RuntimeError("Database write unsuccessful")
    print(json.dumps({"validated": len(rows), "applied": True}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Import failed: {exc}", file=sys.stderr)
        sys.exit(1)
