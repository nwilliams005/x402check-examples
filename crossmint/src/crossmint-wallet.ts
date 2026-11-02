/**
 * Crossmint agent / server wallet setup.
 *
 * Docs:
 *   https://docs.crossmint.com/wallets/guides/create-wallet
 *   https://docs.crossmint.com/wallets/server-side-wallets
 *   https://docs.crossmint.com/wallets/guides/sign-message
 *   https://docs.crossmint.com/agents
 *
 * Uses @crossmint/wallets-sdk:
 *   createCrossmint → CrossmintWallets.from → createWallet({ chain, recoveryMethods|recovery, signers? })
 *   EVMWallet.signMessage / signTypedData for a custom viem LocalAccount.
 *
 * Caveats (documented, not invented):
 * - Crossmint EVM wallets are smart accounts. Free-check EIP-191 ecrecover may fail
 *   if the claimed address is the AA and the signature is from a signer key — we try
 *   free check then fall back to paid ($0.01) via preflight.ts.
 * - Crossmint docs note some signer paths need at least one prior transaction before
 *   signatures work. Set CROSSMINT_WALLET_ADDRESS to reuse a deployed wallet for live demos.
 * - Exact EIP-3009 settlement from an AA may require ERC-1271; dry-run always works.
 *   Live Exact is best-effort with Crossmint signTypedData — see README.
 */
import { randomBytes } from "node:crypto";
import {
  createCrossmint,
  CrossmintWallets,
  EVMWallet,
} from "@crossmint/wallets-sdk";
import { toAccount } from "viem/accounts";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex, SignableMessage, TypedDataDefinition } from "viem";
import type { AgentWallet } from "./types.js";

function isDryRun(): boolean {
  return process.env.DRY_RUN === "1" || !process.env.CROSSMINT_API_KEY;
}

function asMessageString(message: SignableMessage): string {
  if (typeof message === "string") return message;
  if (message && typeof message === "object" && "raw" in message) {
    const raw = message.raw;
    if (typeof raw === "string") return raw;
    return Buffer.from(raw).toString("utf8");
  }
  return String(message);
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
        note: "No CROSSMINT_API_KEY / DRY_RUN=1 — using local throwaway key. Not a Crossmint wallet.",
        address: account.address,
      }),
    );
    return { address: account.address, account, dryRun: true };
  }

  const apiKey = process.env.CROSSMINT_API_KEY!;
  const chain = (process.env.CROSSMINT_CHAIN || "base") as "base" | "base-sepolia";
  const serverSecret =
    process.env.CROSSMINT_SERVER_SIGNER_SECRET ||
    process.env.CROSSMINT_SIGNER_SECRET;
  if (!serverSecret) {
    throw new Error(
      "CROSSMINT_SERVER_SIGNER_SECRET is required for live server-signer wallets",
    );
  }

  const crossmint = createCrossmint({ apiKey });
  const wallets = CrossmintWallets.from(crossmint);

  const serverSigner = { type: "server" as const, secret: serverSecret };

  let wallet;
  if (process.env.CROSSMINT_WALLET_ADDRESS) {
    wallet = await wallets.getWallet(process.env.CROSSMINT_WALLET_ADDRESS, {
      chain,
      // Caller must still supply signer secret via useSigner path below
    });
    await wallet.useSigner(serverSigner);
  } else {
    wallet = await wallets.createWallet({
      chain,
      recoveryMethods: [serverSigner],
      signers: [serverSigner],
      alias: process.env.CROSSMINT_WALLET_ALIAS || `x402check-agent-${Date.now()}`,
    });
  }

  const evm = EVMWallet.from(wallet);
  const address = wallet.address as `0x${string}`;

  const account = toAccount({
    address,
    async signMessage({ message }) {
      const result = await evm.signMessage({
        message: asMessageString(message),
      });
      return result.signature as Hex;
    },
    async signTypedData(typedData) {
      // Crossmint SignTypedDataInput requires `chain` (EVMSmartWalletChain).
      const result = await evm.signTypedData({
        ...(typedData as TypedDataDefinition),
        chain,
      } as Parameters<typeof evm.signTypedData>[0]);
      return result.signature as Hex;
    },
    async signTransaction() {
      throw new Error(
        "Crossmint example: signTransaction not used — Exact USDC uses signTypedData; send via Crossmint wallet APIs if needed",
      );
    },
  });

  console.log(
    JSON.stringify({
      step: "wallet",
      mode: "CROSSMINT",
      address,
      chain,
      note: "Smart-account wallet — free-check ecrecover may fall back to paid; see README",
    }),
  );

  return { address, account, walletId: address, dryRun: false };
}
