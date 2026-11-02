/**
 * x402 v2 Exact USDC settlement on Base via a viem-compatible agent account.
 *
 * Uses registerExactEvmScheme from @x402/evm/exact/client with per-chain RPC
 * (Base 8453) so settlement is controllable via BASE_RPC_URL.
 */
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import type { AgentWallet } from "./types.js";

export function buildPaidFetch(wallet: AgentWallet): typeof fetch {
  const rpcUrl = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer: wallet.account as never,
    schemeOptions: {
      8453: { rpcUrl },
    },
  });
  return wrapFetchWithPayment(fetch, client);
}

/**
 * Pay an x402 seller URL only after a passing preflight decision.
 * In dry-run mode, does not settle — returns a labeled mock response.
 */
export async function paySeller(
  wallet: AgentWallet,
  sellerUrl: string,
  opts: { paidFetch?: typeof fetch } = {},
): Promise<{ status: number; body: unknown; dryRun?: boolean }> {
  if (wallet.dryRun) {
    return {
      status: 200,
      dryRun: true,
      body: {
        note: "DRY_RUN — skipped real x402 settle to seller",
        sellerUrl,
        from: wallet.address,
      },
    };
  }

  const paidFetch = opts.paidFetch || buildPaidFetch(wallet);
  const res = await paidFetch(sellerUrl, { headers: { accept: "application/json" } });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}
