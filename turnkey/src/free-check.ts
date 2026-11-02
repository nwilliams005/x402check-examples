import type { AgentWallet, ToolCheck } from "./types.js";

/**
 * One free regular check ever per agent wallet.
 * GET /preflight/free/challenge → sign message → POST /preflight/free
 * Deep/batch are never free. See https://x402check.dev/llms.txt
 */
export async function claimFreeRegularCheck(
  wallet: AgentWallet,
  sellerUrl: string,
  opts: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<ToolCheck> {
  const base = (opts.baseUrl || process.env.X402CHECK_URL || "https://x402check.dev").replace(
    /\/$/,
    "",
  );
  const f = opts.fetchImpl || fetch;

  const challengeRes = await f(
    `${base}/preflight/free/challenge?address=${encodeURIComponent(wallet.address)}`,
    { headers: { accept: "application/json" } },
  );
  const challengeBody = (await challengeRes.json()) as Record<string, unknown>;
  if (!challengeRes.ok) {
    const err = new Error(
      `free_check_challenge_failed: ${challengeBody.error || challengeRes.status}`,
    );
    (err as Error & { body: unknown }).body = challengeBody;
    throw err;
  }

  const message = String(challengeBody.message || "");
  const nonce = String(challengeBody.nonce || "");
  if (!message || !nonce) {
    throw new Error("free_check_challenge_malformed");
  }

  const signature = await wallet.account.signMessage({ message });

  const redeemRes = await f(`${base}/preflight/free`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url: sellerUrl,
      address: wallet.address,
      nonce,
      signature,
    }),
  });
  const redeemBody = (await redeemRes.json()) as ToolCheck & {
    error?: string;
    message?: string;
  };
  if (!redeemRes.ok) {
    const err = new Error(
      `free_check_redeem_failed: ${redeemBody.error || redeemBody.message || redeemRes.status}`,
    );
    (err as Error & { body: unknown }).body = redeemBody;
    throw err;
  }
  return redeemBody;
}
