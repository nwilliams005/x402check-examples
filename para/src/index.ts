/**
 * Para wallet agent → x402check preflight → pay (or refuse).
 *
 * Flow:
 *   1. Load Para REST EVM wallet (or dry-run local key)
 *   2. Run x402check on SELLER_URL (prefer 1 free regular check via signed message;
 *      else $0.01 Exact USDC on Base)
 *   3. Map result to AgentKit-style beforePayment decision { abort, reason?, code? }
 *   4. If abort → refuse. If pass → settle seller via x402 v2 from the Para wallet.
 *
 * Dry-run: DRY_RUN=1 or omit PARA_API_KEY. No on-chain spend; synthetic ToolCheck.
 *
 * Usage:
 *   cp .env.example .env   # fill PARA_API_KEY for live
 *   npm install
 *   npm run dry-run
 *   npm start -- --url https://seller.example/api
 */
import "dotenv/config";
import { decideBeforePayment } from "./before-payment.js";
import { loadAgentWallet } from "./para-wallet.js";
import { runPreflight } from "./preflight.js";
import { buildPaidFetch, paySeller } from "./x402-pay.js";
import type { X402BeforePaymentDecision } from "./types.js";

function argUrl(): string {
  const idx = process.argv.indexOf("--url");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  return process.env.SELLER_URL || "https://x402check.dev/example";
}

function maxAmountUsd(): number {
  const n = Number(process.env.MAX_AMOUNT_USD || "1");
  return Number.isFinite(n) && n > 0 ? n : 1;
}

async function main(): Promise<void> {
  const sellerUrl = argUrl();
  const abortOnCaution = process.env.ABORT_ON_CAUTION === "1";

  console.log(
    JSON.stringify({
      step: "start",
      sellerUrl,
      x402check: process.env.X402CHECK_URL || "https://x402check.dev",
      dryRunHint: !process.env.PARA_API_KEY || process.env.DRY_RUN === "1",
    }),
  );

  const wallet = await loadAgentWallet();

  // Paid fetch settles both the $0.01 preflight (if free claim unavailable) and the seller.
  const paidFetch = wallet.dryRun ? undefined : buildPaidFetch(wallet);

  const { check, via } = await runPreflight(wallet, sellerUrl, { paidFetch });
  console.log(JSON.stringify({ step: "preflight", via, check }));

  // Still enforce a local maxAmount even on verdict=ok
  if (
    typeof check.priceUsd === "number" &&
    check.priceUsd > maxAmountUsd()
  ) {
    const decision: X402BeforePaymentDecision = {
      abort: true,
      reason: `priceUsd=${check.priceUsd} exceeds MAX_AMOUNT_USD=${maxAmountUsd()}`,
      code: "x402check:max_amount",
    };
    console.log(JSON.stringify({ step: "beforePayment", decision }));
    console.log(JSON.stringify({ step: "refuse", decision }));
    process.exitCode = 2;
    return;
  }

  const decision = decideBeforePayment(
    check,
    {
      url: sellerUrl,
      payTo: check.payTo,
      network: check.network || "eip155:8453",
    },
    { abortOnCaution },
  );
  console.log(JSON.stringify({ step: "beforePayment", decision }));

  if (decision.abort) {
    console.log(
      JSON.stringify({
        step: "refuse",
        message: "Agent will not pay — x402check beforePayment aborted",
        decision,
      }),
    );
    process.exitCode = 2;
    return;
  }

  const settle = await paySeller(wallet, sellerUrl, { paidFetch });
  console.log(JSON.stringify({ step: "pay", settle }));
  console.log(
    JSON.stringify({
      step: "done",
      from: wallet.address,
      walletId: wallet.walletId || null,
      dryRun: wallet.dryRun,
    }),
  );
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      step: "error",
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );
  process.exitCode = 1;
});
