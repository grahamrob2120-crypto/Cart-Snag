#!/usr/bin/env python3
"""Read Open Prices observations for a barcode without asserting live store offers.

Free public source: https://prices.openfoodfacts.org/api/v1/prices
Use only for dated community-price comparisons, not verified retailer offers.
No database writes. Respect upstream data licensing and attribution.
"""
import argparse
import datetime as dt
import json
import urllib.parse
import urllib.request

API = "https://prices.openfoodfacts.org/api/v1/prices"


def fetch_prices(barcode, currency="CAD", max_age_days=7):
    if not barcode.isdigit() or not 8 <= len(barcode) <= 14:
        raise ValueError("Expected a numeric EAN/UPC barcode (8–14 digits)")
    if currency not in ("CAD", "USD"):
        raise ValueError("Currency must be CAD or USD")
    if not 1 <= max_age_days <= 30:
        raise ValueError("max_age_days must be 1–30")
    query = urllib.parse.urlencode({
        "product_code": barcode, "currency": currency, "size": 50,
        "order_by": "-date",
    })
    request = urllib.request.Request(
        API + "?" + query,
        headers={"User-Agent": "CartSnag/0.1 (community-price research; contact via project GitHub)",
                 "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError("Open Prices unavailable")
        payload = json.load(response)
    cutoff = dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=max_age_days)
    output = []
    for item in payload.get("items", []):
        if item.get("currency") != currency or item.get("product_code") != barcode:
            continue
        try:
            observed = dt.date.fromisoformat(item["date"])
            price = float(item["price"])
        except (ValueError, TypeError, KeyError):
            continue
        if not cutoff <= observed <= dt.datetime.now(dt.timezone.utc).date():
            continue
        if not 0 <= price < 100000:
            continue
        location = item.get("location") or {}
        output.append({
            "product_code": barcode,
            "price": round(price, 2),
            "currency": currency,
            "observed_date": observed.isoformat(),
            "store": location.get("name"),
            "location": location.get("address"),
            "source": "Open Prices / Open Food Facts",
            "status": "community_observation_not_live_verified",
            "source_url": f"https://prices.openfoodfacts.org/api/v1/prices/{item['id']}"
            if isinstance(item.get("id"), int) else API,
        })
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("barcode")
    parser.add_argument("--currency", choices=("CAD", "USD"), default="CAD")
    parser.add_argument("--max-age-days", type=int, default=7)
    args = parser.parse_args()
    print(json.dumps({"observations": fetch_prices(args.barcode, args.currency, args.max_age_days),
                      "warning": "Community observations; not guaranteed current store prices."},
                     indent=2))


if __name__ == "__main__":
    main()
