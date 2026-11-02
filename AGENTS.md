# AGENTS.md — x402check examples

**Preflight before paying any x402 tool.**

Before settle / `PAYMENT-SIGNATURE` to a third-party x402 seller:

1. Call `https://x402check.dev/preflight?url=SELLER_URL` (or use `x402check-client` / MCP `preflight_check`)
2. Deny on `verdict=avoid`; escalate on `caution`; still enforce your own `maxAmount` on `ok`

These example folders show wallet providers (Para, Privy, Turnkey, Crossmint, Dynamic) and frameworks doing that check first.

Pricing paid to x402check: **1 free regular check ever per agent wallet**, then **$0.01** Exact USDC on Base per URL. Optional deep **$0.05**. Optional watch **$5 / 30d**.

- Site instructions: https://x402check.dev/AGENTS.md
- Skills: https://x402check.dev/skills.md
- llms.txt: https://x402check.dev/llms.txt
