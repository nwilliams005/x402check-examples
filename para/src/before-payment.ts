import type {
  ToolCheck,
  X402BeforePaymentContext,
  X402BeforePaymentDecision,
} from "./types.js";

function buildReason(check: ToolCheck, extras: string[] = []): string {
  const payToNote = check.payTo ? ` payTo=${check.payTo}` : "";
  const networkNote = check.network ? ` network=${check.network}` : "";
  const priceNote =
    check.priceUsd !== undefined && check.priceUsd !== null
      ? ` priceUsd=${check.priceUsd}`
      : "";
  const codes = check.reasonCodes?.length
    ? ` reasons=${check.reasonCodes.join(",")}`
    : "";
  const historyBits: string[] = [];
  if (check.history?.payToChanges?.length) {
    historyBits.push(`payToChanges=${check.history.payToChanges.length}`);
  }
  if (check.history?.priceChanges?.length) {
    historyBits.push(`priceChanges=${check.history.priceChanges.length}`);
  }
  if (typeof check.history?.uptimePct === "number") {
    historyBits.push(`uptimePct=${check.history.uptimePct}`);
  }
  const historyNote = historyBits.length
    ? ` history={${historyBits.join(",")}}`
    : "";
  const extraNote = extras.length ? ` ${extras.join(" ")}` : "";
  return `x402check verdict=${check.verdict}${payToNote}${networkNote}${priceNote}${codes}${historyNote}${extraNote}`;
}

/**
 * Map a live ToolCheck into the AgentKit #1454 beforePayment decision.
 */
export function decideBeforePayment(
  check: ToolCheck,
  ctx: X402BeforePaymentContext,
  opts: { abortOnCaution?: boolean } = {},
): X402BeforePaymentDecision {
  const abortOnCaution = opts.abortOnCaution === true;
  const extras: string[] = [];

  if (ctx.payTo && check.payTo && ctx.payTo.toLowerCase() !== check.payTo.toLowerCase()) {
    extras.push(`payToMismatch context=${ctx.payTo} live=${check.payTo}`);
    return {
      abort: true,
      reason: buildReason(check, extras),
      code: "x402check:payto_mismatch",
    };
  }

  if (
    ctx.network &&
    check.network &&
    ctx.network.toLowerCase() !== check.network.toLowerCase()
  ) {
    extras.push(`networkMismatch context=${ctx.network} live=${check.network}`);
    if (abortOnCaution) {
      return {
        abort: true,
        reason: buildReason(check, extras),
        code: "x402check:network_mismatch",
      };
    }
  }

  if (check.verdict === "avoid" || (check.verdict === "caution" && abortOnCaution)) {
    return {
      abort: true,
      reason: buildReason(check, extras),
      code: `x402check:${check.verdict}`,
    };
  }

  return {
    abort: false,
    reason: buildReason(check, extras),
    code: `x402check:${check.verdict}`,
  };
}
