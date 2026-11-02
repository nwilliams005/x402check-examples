/**
 * Turnkey server wallet setup.
 *
 * Docs:
 *   https://docs.turnkey.com/sdks/server
 *   https://docs.turnkey.com/sdks/viem (createAccount)
 *   https://docs.turnkey.com/networks/ethereum
 *
 * Uses @turnkey/sdk-server Turnkey (TurnkeyServerSDK) + createWallet with
 * DEFAULT_ETHEREUM_ACCOUNTS, then @turnkey/viem createAccount({ client, organizationId, signWith }).
 */
import { randomBytes } from "node:crypto";
import {
  Turnkey,
  DEFAULT_ETHEREUM_ACCOUNTS,
} from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentWallet } from "./types.js";

function isDryRun(): boolean {
  return (
    process.env.DRY_RUN === "1" ||
    !process.env.TURNKEY_API_PUBLIC_KEY ||
    !process.env.TURNKEY_API_PRIVATE_KEY ||
    !process.env.TURNKEY_ORGANIZATION_ID
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
        note: "No Turnkey credentials / DRY_RUN=1 — using local throwaway key. Not a Turnkey wallet.",
        address: account.address,
      }),
    );
    return { address: account.address, account, dryRun: true };
  }

  const organizationId = process.env.TURNKEY_ORGANIZATION_ID!;
  const turnkey = new Turnkey({
    apiBaseUrl: process.env.TURNKEY_API_BASE_URL || "https://api.turnkey.com",
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
    defaultOrganizationId: organizationId,
  });
  const client = turnkey.apiClient();

  let address: `0x${string}`;
  let walletId: string | undefined;

  if (process.env.TURNKEY_SIGN_WITH) {
    address = process.env.TURNKEY_SIGN_WITH as `0x${string}`;
    walletId = process.env.TURNKEY_WALLET_ID;
  } else {
    const created = await client.createWallet({
      organizationId,
      walletName: process.env.TURNKEY_WALLET_NAME || `x402check-agent-${Date.now()}`,
      accounts: DEFAULT_ETHEREUM_ACCOUNTS,
    });
    walletId = created.walletId;
    const addr = created.addresses?.[0];
    if (!addr) throw new Error("Turnkey createWallet returned no ethereum address");
    address = addr as `0x${string}`;
  }

  const account = await createAccount({
    client,
    organizationId,
    signWith: address,
    ethereumAddress: address,
  });

  console.log(
    JSON.stringify({
      step: "wallet",
      mode: "TURNKEY",
      walletId: walletId || null,
      address,
    }),
  );

  return { address, account, walletId, dryRun: false };
}
