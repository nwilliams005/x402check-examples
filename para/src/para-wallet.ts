/**
 * Para agent wallet setup.
 *
 * Current Para docs recommend @getpara/rest-sdk for new server/agent wallets
 * (API-key-backed create + sign; no user-share storage).
 * Docs: https://docs.getpara.com/v3/rest/sdk
 *       https://docs.getpara.com/llms.txt (section "REST API — Default for Server-Side Wallets")
 *
 * @getpara/server-sdk is for imported client sessions or legacy SDK pregen
 * (share-backed). Prefer REST for this agent flow.
 */
import { randomBytes, randomUUID } from "node:crypto";
import {
  ParaRestClient,
  type RestWallet,
  type UserIdentifierType,
  type WalletType,
} from "@getpara/rest-sdk";
import { createParaRestViemAccount } from "@getpara/rest-sdk/viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentWallet } from "./types.js";

function isDryRun(): boolean {
  return process.env.DRY_RUN === "1" || !process.env.PARA_API_KEY;
}

async function waitUntilReady(
  para: ParaRestClient,
  walletId: string,
  attempts = 40,
): Promise<RestWallet> {
  for (let i = 0; i < attempts; i++) {
    const latest = await para.getWallet(walletId);
    if (latest.status === "ready" && latest.address) return latest;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Para wallet ${walletId} not ready`);
}

/**
 * Load or create a Para EVM wallet and return a viem-compatible account.
 * In dry-run mode (no PARA_API_KEY or DRY_RUN=1), uses a local throwaway key.
 */
export async function loadAgentWallet(): Promise<AgentWallet> {
  if (isDryRun()) {
    const raw =
      process.env.DRY_RUN_PRIVATE_KEY ||
      (`0x${randomBytes(32).toString("hex")}` as `0x${string}`);
    if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
      throw new Error("DRY_RUN_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key");
    }
    const account = privateKeyToAccount(raw as `0x${string}`);
    console.log(
      JSON.stringify({
        step: "wallet",
        mode: "DRY_RUN",
        note: "No PARA_API_KEY / DRY_RUN=1 — using local throwaway key. Not a Para wallet.",
        address: account.address,
      }),
    );
    return {
      address: account.address,
      account,
      dryRun: true,
    };
  }

  const apiKey = process.env.PARA_API_KEY!;
  const envRaw = (process.env.PARA_ENVIRONMENT || "BETA").toUpperCase();
  const env = (
    envRaw === "PROD" || envRaw === "BETA" || envRaw === "SANDBOX"
      ? envRaw
      : "BETA"
  ) as "PROD" | "BETA" | "SANDBOX";

  const para = new ParaRestClient({ apiKey, env });

  let wallet: RestWallet;
  if (process.env.PARA_WALLET_ID) {
    wallet = await waitUntilReady(para, process.env.PARA_WALLET_ID);
  } else {
    const userIdentifier =
      process.env.PARA_USER_IDENTIFIER ||
      `x402check-agent-${Date.now()}@test.getpara.com`;
    const userIdentifierType = (process.env.PARA_USER_IDENTIFIER_TYPE ||
      "EMAIL") as UserIdentifierType;
    const created = await para.createWallet(
      {
        type: "EVM" as WalletType,
        userIdentifier,
        userIdentifierType,
      },
      { idempotencyKey: randomUUID() },
    );
    wallet = await waitUntilReady(para, created.id);
  }

  if (!wallet.address) throw new Error("Para wallet missing address");

  const address = wallet.address as `0x${string}`;
  if (
    process.env.PARA_WALLET_ADDRESS &&
    process.env.PARA_WALLET_ADDRESS.toLowerCase() !== address.toLowerCase()
  ) {
    throw new Error(
      `PARA_WALLET_ADDRESS mismatch: env=${process.env.PARA_WALLET_ADDRESS} live=${address}`,
    );
  }

  const account = createParaRestViemAccount({
    client: para,
    walletId: wallet.id,
    address,
    ...(wallet.publicKey
      ? { publicKey: wallet.publicKey as `0x${string}` }
      : {}),
  });

  console.log(
    JSON.stringify({
      step: "wallet",
      mode: "PARA_REST",
      walletId: wallet.id,
      address,
      env,
    }),
  );

  return {
    address,
    account,
    walletId: wallet.id,
    dryRun: false,
  };
}
