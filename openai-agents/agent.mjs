/**
 * OpenAI Agents SDK example — register x402check as tools.
 * Install: npm install @openai/agents x402check-client zod
 */
import { preflight, preflightBatch } from "x402check-client";

process.env.X402CHECK_URL ||= "https://x402check.dev";

/** Tool defs compatible with Agents SDK function tools. */
export const x402checkAgentTools = [
  {
    type: "function",
    name: "preflight_check",
    description:
      "Trust preflight before paying any x402 endpoint. Returns ok|caution|avoid. Do not pay if avoid.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["url"],
      properties: {
        url: { type: "string", description: "Absolute https seller URL" },
        fresh: { type: "boolean" },
      },
    },
    async execute({ url, fresh }) {
      return preflight(url, { fresh: !!fresh });
    },
  },
  {
    type: "function",
    name: "verify_payto",
    description: "Verify payTo / receiving wallet before signing USDC on Base.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["url"],
      properties: { url: { type: "string" }, fresh: { type: "boolean" } },
    },
    async execute({ url, fresh }) {
      const c = await preflight(url, { fresh: !!fresh });
      return {
        url: c.url,
        verdict: c.verdict,
        payTo: c.payTo,
        priceUsd: c.priceUsd,
        payToChanges: c.history?.payToChanges ?? [],
      };
    },
  },
  {
    type: "function",
    name: "compare_tools",
    description: "Compare x402 seller URLs before choosing which to pay.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["urls"],
      properties: {
        urls: { type: "array", items: { type: "string" } },
        fresh: { type: "boolean" },
      },
    },
    async execute({ urls, fresh }) {
      return preflightBatch(urls, { fresh: !!fresh });
    },
  },
];

console.log(
  "x402check OpenAI Agents tools ready:",
  x402checkAgentTools.map((t) => t.name).join(", "),
);
