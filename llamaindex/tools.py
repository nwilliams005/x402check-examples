"""LlamaIndex FunctionTool wrappers for x402check (https://x402check.dev)."""
from __future__ import annotations

import json
import os
from typing import List

import httpx

try:
    from llama_index.core.tools import FunctionTool
except ImportError:  # pragma: no cover
    FunctionTool = None  # type: ignore

BASE = os.environ.get("X402CHECK_URL", "https://x402check.dev").rstrip("/")


def preflight_check(url: str, fresh: bool = False) -> str:
    """Trust-check an x402 seller URL before paying (ok|caution|avoid)."""
    params = {"url": url}
    if fresh:
        params["fresh"] = "1"
    r = httpx.get(f"{BASE}/preflight", params=params, timeout=30.0)
    if r.status_code == 402:
        return json.dumps({"error": "preflight_payment_required"})
    r.raise_for_status()
    return r.text


def compare_tools(urls: List[str], fresh: bool = False) -> str:
    """Compare several x402 seller URLs before choosing which to pay."""
    r = httpx.post(
        f"{BASE}/preflight",
        json={"urls": urls, "fresh": fresh},
        timeout=60.0,
    )
    if r.status_code == 402:
        return json.dumps({"error": "preflight_payment_required"})
    r.raise_for_status()
    return r.text


def x402check_tools():
    if FunctionTool is None:
        raise ImportError("pip install llama-index")
    return [
        FunctionTool.from_defaults(fn=preflight_check),
        FunctionTool.from_defaults(fn=compare_tools),
    ]
