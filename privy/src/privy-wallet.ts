/**
 * Privy server wallet setup.
 *
 * Docs:
 *   https://docs.privy.io/wallets/using-wallets/nodeJS/usage (createViemAccount)
 *   https://docs.privy.io/wallets/using-wallets/nodeJS/create-a-wallet
 *   https://docs.privy.io/wallets/using-wallets/nodeJS/x402-payments (createX402Client)
 *
 * Uses @privy-io/node PrivyClient + wallets.create({ chain_type: "ethereum" })
 * and createViemAccount from @privy-io/node/viem for Exact / free-check signing.
 * Optional: createX402Client from @privy-io/node/x402 wraps the same account for
 * @x402/fetch — this example uses createViemAccount + registerExactEvmScheme so
 * the pattern matches the other wallet examples.
 */
import { randomBytes } from "node:crypto";
import { PrivyClient } from "@privy-io/node";
import { createViemAccount } from "@privy-io/node/viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentWallet } from "./types.js";

function isDryRun(): boolean {
  return (
    process.env.DRY_RUN === "1" ||
    !process.env.PRIVY_APP_ID ||
    !process.env.PRIVY_APP_SECRET
  );
}

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
        note: "No PRIVY_APP_ID/SECRET / DRY_RUN=1 — using local throwaway key. Not a Privy wallet.",
        address: account.address,
      }),
    );
    return { address: account.address, account, dryRun: true };
  }

  const appId = process.env.PRIVY_APP_ID!;
  const appSecret = process.env.PRIVY_APP_SECRET!;
  const privy = new PrivyClient({ appId, appSecret });

  let walletId: string;
  let address: `0x${string}`;

  if (process.env.PRIVY_WALLET_ID && process.env.PRIVY_WALLET_ADDRESS) {
    walletId = process.env.PRIVY_WALLET_ID;
    address = process.env.PRIVY_WALLET_ADDRESS as `0x${string}`;
  } else {
    const created = await privy.wallets().create({ chain_type: "ethereum" });
    walletId = created.id;
    address = created.address as `0x${string}`;
  }

  const account = createViemAccount(privy, {
    walletId,
    address,
    // For EIP-7702 gas-sponsored wallets use { type: "erc1271" } — see Privy x402 docs.
    ...(process.env.PRIVY_SIGNATURE_TYPE === "erc1271"
      ? { signatureOptions: { type: "erc1271" as const } }
      : {}),
  });

  console.log(
    JSON.stringify({
      step: "wallet",
      mode: "PRIVY_SERVER",
      walletId,
      address,
    }),
  );

  return { address, account, walletId, dryRun: false };
}
