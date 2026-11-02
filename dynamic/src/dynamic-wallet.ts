/**
 * Dynamic server / embedded MPC wallet setup (Node).
 *
 * Docs:
 *   https://www.dynamic.xyz/docs/wallets/embedded-wallets/mpc/installation-node
 *   https://www.dynamic.xyz/docs/wallets/embedded-wallets/mpc/create-wallet-account
 *   https://www.dynamic.xyz/docs/wallets/embedded-wallets/mpc/authenticate-api-token
 *
 * Uses:
 *   @dynamic-labs-wallet/node-evm — DynamicEvmWalletClient
 *   @dynamic-labs-wallet/node — ThresholdSignatureScheme (re-exported from core)
 *
 * Live flow: new DynamicEvmWalletClient({ environmentId }) → authenticateApiToken
 * → createWalletAccount({ thresholdSignatureScheme, backUpToDynamic })
 * → getWalletClient({ walletMetadata, externalServerKeyShares, chain }) for a viem account.
 *
 * Native MPC addons: only loaded when not in dry-run (dynamic import).
 */
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import type { Account, WalletClient } from "viem";
import type { AgentWallet } from "./types.js";

function isDryRun(): boolean {
  return (
    process.env.DRY_RUN === "1" ||
    !process.env.DYNAMIC_ENVIRONMENT_ID ||
    !process.env.DYNAMIC_AUTH_TOKEN
  );
}

/** Minimal surface we use from the Dynamic Node SDKs (avoids broken export* typing on dynamic import). */
type ThresholdSignatureSchemeEnum = {
  TWO_OF_TWO: string;
  TWO_OF_THREE: string;
};

type DynamicEvmClient = {
  authenticateApiToken: (authToken: string) => Promise<void>;
  createWalletAccount: (args: {
    thresholdSignatureScheme: string;
    backUpToDynamic?: boolean;
  }) => Promise<{
    walletMetadata: {
      walletId: string;
      accountAddress: string;
      thresholdSignatureScheme: string;
      [key: string]: unknown;
    };
    externalServerKeyShares: unknown;
  }>;
  getWalletClient: (args: {
    walletMetadata: Record<string, unknown>;
    externalServerKeyShares?: unknown;
    chain?: unknown;
  }) => Promise<WalletClient & { account: Account }>;
};

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
        note: "No DYNAMIC_ENVIRONMENT_ID/AUTH_TOKEN / DRY_RUN=1 — local throwaway key. Not a Dynamic wallet. Native MPC SDK not loaded.",
        address: account.address,
      }),
    );
    return { address: account.address, account, dryRun: true };
  }

  // Dynamic import so dry-run hosts without native bindings never load the MPC SDK.
  const evmMod = (await import(
    "@dynamic-labs-wallet/node-evm"
  )) as unknown as {
    DynamicEvmWalletClient: new (props: {
      environmentId: string;
    }) => DynamicEvmClient;
  };
  const nodeMod = (await import(
    "@dynamic-labs-wallet/node"
  )) as unknown as {
    ThresholdSignatureScheme: ThresholdSignatureSchemeEnum;
  };

  const { DynamicEvmWalletClient } = evmMod;
  const { ThresholdSignatureScheme } = nodeMod;

  const environmentId = process.env.DYNAMIC_ENVIRONMENT_ID!;
  const authToken = process.env.DYNAMIC_AUTH_TOKEN!;

  const client = new DynamicEvmWalletClient({ environmentId });
  await client.authenticateApiToken(authToken);

  const scheme =
    process.env.DYNAMIC_TSS === "TWO_OF_THREE"
      ? ThresholdSignatureScheme.TWO_OF_THREE
      : ThresholdSignatureScheme.TWO_OF_TWO;

  let walletMetadata: Record<string, unknown> & {
    walletId: string;
    accountAddress: string;
    thresholdSignatureScheme: string;
  };
  let externalServerKeyShares: unknown;

  if (process.env.DYNAMIC_WALLET_METADATA_JSON) {
    walletMetadata = JSON.parse(process.env.DYNAMIC_WALLET_METADATA_JSON);
    externalServerKeyShares = process.env.DYNAMIC_EXTERNAL_SERVER_KEY_SHARES_JSON
      ? JSON.parse(process.env.DYNAMIC_EXTERNAL_SERVER_KEY_SHARES_JSON)
      : undefined;
  } else {
    const created = await client.createWalletAccount({
      thresholdSignatureScheme: scheme,
      backUpToDynamic: process.env.DYNAMIC_BACKUP !== "0",
    });
    walletMetadata = created.walletMetadata;
    externalServerKeyShares = created.externalServerKeyShares;
  }

  const walletClient = await client.getWalletClient({
    walletMetadata,
    externalServerKeyShares,
    chain: base,
  });

  const account = walletClient.account;
  if (!account?.address) {
    throw new Error("Dynamic getWalletClient returned no account");
  }
  const address = account.address as `0x${string}`;

  console.log(
    JSON.stringify({
      step: "wallet",
      mode: "DYNAMIC_MPC",
      walletId: walletMetadata.walletId,
      address,
      thresholdSignatureScheme: walletMetadata.thresholdSignatureScheme,
    }),
  );

  return {
    address,
    account: account as AgentWallet["account"],
    walletId: String(walletMetadata.walletId),
    dryRun: false,
  };
}
