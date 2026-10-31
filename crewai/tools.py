"""CrewAI tools for x402check (https://x402check.dev)."""
from __future__ import annotations

import json
import os
from typing import List, Type

import httpx
from pydantic import BaseModel, Field

try:
    from crewai.tools import BaseTool
except ImportError:  # pragma: no cover
    BaseTool = object  # type: ignore

BASE = os.environ.get("X402CHECK_URL", "https://x402check.dev").rstrip("/")


class PreflightArgs(BaseModel):
    url: str = Field(..., description="Absolute https seller URL")
    fresh: bool = Field(False)


class CompareArgs(BaseModel):
    urls: List[str] = Field(..., description="Candidate seller URLs")
    fresh: bool = Field(False)


class X402PreflightTool(BaseTool):
    name: str = "preflight_check"
    description: str = (
        "Trust preflight before paying any x402 endpoint. "
        "Returns ok|caution|avoid. Do not pay if avoid."
    )
    args_schema: Type[BaseModel] = PreflightArgs

    def _run(self, url: str, fresh: bool = False) -> str:
        params = {"url": url}
        if fresh:
            params["fresh"] = "1"
        r = httpx.get(f"{BASE}/preflight", params=params, timeout=30.0)
        if r.status_code == 402:
            return json.dumps({"error": "preflight_payment_required"})
        r.raise_for_status()
        return r.text


class X402CompareTool(BaseTool):
    name: str = "compare_tools"
    description: str = "Compare x402 seller URLs before choosing which to pay."
    args_schema: Type[BaseModel] = CompareArgs

    def _run(self, urls: List[str], fresh: bool = False) -> str:
        r = httpx.post(
            f"{BASE}/preflight",
            json={"urls": urls, "fresh": fresh},
            timeout=60.0,
        )
        if r.status_code == 402:
            return json.dumps({"error": "preflight_payment_required"})
        r.raise_for_status()
        return r.text
