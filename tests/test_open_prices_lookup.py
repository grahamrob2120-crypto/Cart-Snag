"""Offline contract tests for free community-price lookup."""
import datetime as dt
import io
import json
import unittest
from unittest.mock import patch
from scripts.open_prices_lookup import fetch_prices


class Response:
    status = 200
    def __init__(self, data):
        self.data = data
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def read(self, *args):
        return json.dumps(self.data).encode()


class OpenPricesTests(unittest.TestCase):
    def test_filters_currency_barcode_age_and_invalid_prices(self):
        today = dt.datetime.now(dt.timezone.utc).date()
        rows = [
            {"id": 42, "product_code": "012345678905", "currency": "CAD",
             "date": today.isoformat(), "price": 2.99,
             "location": {"name": "Example Store", "address": "Regina"}},
            {"id": 43, "product_code": "012345678905", "currency": "USD",
             "date": today.isoformat(), "price": 1.99},
            {"id": 44, "product_code": "012345678905", "currency": "CAD",
             "date": (today-dt.timedelta(days=10)).isoformat(), "price": 0.99},
            {"id": 45, "product_code": "999999999999", "currency": "CAD",
             "date": today.isoformat(), "price": 1.99},
            {"id": 46, "product_code": "012345678905", "currency": "CAD",
             "date": today.isoformat(), "price": -1},
        ]
        with patch("scripts.open_prices_lookup.urllib.request.urlopen", return_value=Response({"items": rows})):
            results = fetch_prices("012345678905")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["price"], 2.99)
        self.assertEqual(results[0]["status"], "community_observation_not_live_verified")

    def test_invalid_barcode_rejected_before_network(self):
        for barcode in ("abc", "123", "1"*15):
            with self.assertRaises(ValueError):
                fetch_prices(barcode)


if __name__ == "__main__":
    unittest.main()
