/**
 * AgentKit #1454 beforePayment decision shape (provider-neutral).
 * Exact fields: { abort, reason?, code? } — no extras.
 */
export type X402BeforePaymentDecision = {
  abort: boolean;
  reason?: string;
  code?: string;
};

export type X402BeforePaymentContext = {
  url: string;
  payTo?: string | null;
  network?: string;
  asset?: string;
  amount?: string;
  method?: string;
};

export type ToolCheck = {
  url: string;
  verdict: "ok" | "caution" | "avoid";
  reasonCodes?: string[];
  payTo?: string | null;
  priceUsd?: number | null;
  network?: string | null;
  history?: {
    checks?: number;
    uptimePct?: number;
    payToChanges?: unknown[];
    priceChanges?: unknown[];
  };
  free?: boolean;
  freeRemaining?: number;
};

export type AgentWallet = {
  address: `0x${string}`;
  /** LocalAccount-compatible signer (Para REST viem account or dry-run key). */
  account: {
    address: `0x${string}`;
    signMessage: (args: { message: string }) => Promise<`0x${string}`>;
    type?: string;
    source?: string;
    [key: string]: unknown;
  };
  /** Present for live Para REST wallets. */
  walletId?: string;
  /** true when running without PARA_API_KEY / with DRY_RUN=1 */
  dryRun: boolean;
};
