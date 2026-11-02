import { preflight as clientPreflight } from "x402check-client";
import { claimFreeRegularCheck } from "./free-check.js";
import type { AgentWallet, ToolCheck } from "./types.js";

function dryRunCheck(sellerUrl: string): ToolCheck {
  const verdict = (process.env.DRY_RUN_VERDICT || "ok") as ToolCheck["verdict"];
  if (!["ok", "caution", "avoid"].includes(verdict)) {
    throw new Error("DRY_RUN_VERDICT must be ok|caution|avoid");
  }
  return {
    url: sellerUrl,
    verdict,
    reasonCodes: ["dry_run_synthetic"],
    payTo: "0xd98451514c7510e3fCd0463De973B9a6bB89A86f",
    priceUsd: 0.01,
    network: "eip155:8453",
    history: { checks: 0, uptimePct: 100, payToChanges: [], priceChanges: [] },
    free: true,
    freeRemaining: 0,
  };
}

/**
 * Run x402check for sellerUrl.
 * Prefer one free regular check (signed challenge) when USE_FREE_CHECK=1.
 * Otherwise pay $0.01 Exact USDC via paidFetch (x402 wrap).
 */
export async function runPreflight(
  wallet: AgentWallet,
  sellerUrl: string,
  opts: { paidFetch?: typeof fetch } = {},
): Promise<{ check: ToolCheck; via: "free" | "paid" | "dry_run" | "skip" }> {
  if (wallet.dryRun && process.env.DRY_RUN_LIVE_PREFLIGHT !== "1") {
    return { check: dryRunCheck(sellerUrl), via: "dry_run" };
  }

  if (process.env.X402CHECK_SKIP === "1") {
    return {
      check: {
        url: sellerUrl,
        verdict: "ok",
        reasonCodes: ["preflight_skipped"],
        history: { checks: 0 },
      },
      via: "skip",
    };
  }

  const baseUrl = (process.env.X402CHECK_URL || "https://x402check.dev").replace(/\/$/, "");
  const useFree = process.env.USE_FREE_CHECK !== "0";

  if (useFree) {
    try {
      const check = await claimFreeRegularCheck(wallet, sellerUrl, { baseUrl });
      return { check, via: "free" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // already_used / rate_limited → fall through to paid
      if (!/already_used|free_check_redeem_failed|free_check_challenge_failed/.test(msg)) {
        throw e;
      }
      console.log(
        JSON.stringify({
          step: "free_check_unavailable",
          message: msg,
          next: "falling_back_to_paid_0.01",
        }),
      );
    }
  }

  if (wallet.dryRun) {
    // Live free failed in dry-run without a funded key for paid settle
    return { check: dryRunCheck(sellerUrl), via: "dry_run" };
  }

  // Prefer wrapFetchWithPayment so Exact USDC settles the $0.01 check.
  const check = (await clientPreflight(sellerUrl, {
    baseUrl,
    fresh: true,
    fetchImpl: opts.paidFetch || fetch,
  })) as ToolCheck;
  return { check, via: "paid" };
}
