declare module "x402check-client" {
  export type Verdict = "ok" | "caution" | "avoid";
  export type ToolCheck = {
    url: string;
    verdict: Verdict;
    reasonCodes?: string[];
    history?: Record<string, unknown>;
    payTo?: string | null;
    priceUsd?: number | null;
    network?: string | null;
    free?: boolean;
    freeRemaining?: number;
  };
  export function preflight(
    sellerUrl: string,
    opts?: {
      baseUrl?: string;
      fresh?: boolean;
      fetchImpl?: typeof fetch;
      paymentHeaders?: Record<string, string>;
    },
  ): Promise<ToolCheck>;
  export function preflightBatch(
    sellerUrls: string[],
    opts?: {
      baseUrl?: string;
      fresh?: boolean;
      fetchImpl?: typeof fetch;
      paymentHeaders?: Record<string, string>;
    },
  ): Promise<{ results: ToolCheck[] }>;
}
