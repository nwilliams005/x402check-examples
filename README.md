# x402check framework examples

Examples for frameworks beyond the published npm packages.

| Path | Framework |
|------|-----------|
| `openai-agents/` | OpenAI Agents SDK |
| `llamaindex/` | LlamaIndex (Python) |
| `crewai/` | CrewAI |
| `para/` | Para wallet agent (x402check beforePayment → pay) |
| `privy/` | Privy server wallet agent |
| `turnkey/` | Turnkey wallet agent |
| `crossmint/` | Crossmint agent / server wallet |
| `dynamic/` | Dynamic Node MPC wallet agent |

## Wallet examples (shared flow)

`para/`, `privy/`, `turnkey/`, `crossmint/`, and `dynamic/` all follow the same pattern:

1. Load a provider wallet (or a local throwaway key when `DRY_RUN=1`)
2. Prefer one **free** regular check via signed challenge; else pay **$0.01** Exact USDC on Base
3. Map the ToolCheck to AgentKit `#1454` `{ abort, reason?, code? }`
4. Pay the seller on pass, refuse on abort

```bash
cd privy   # or turnkey / crossmint / dynamic / para
cp .env.example .env
npm install
npm run dry-run
npm run dry-run:avoid
```

## CI: watch your own endpoints

Use the companion GitHub Action to fail a workflow when your seller’s price / `payTo` / network drifts:

- Repo: [nwilliams005/x402check-action](https://github.com/nwilliams005/x402check-action)
- Pin: `uses: nwilliams005/x402check-action@v1`

## Published packages

- [`x402check-ai-sdk`](https://www.npmjs.com/package/x402check-ai-sdk) — Vercel AI SDK
- [`x402check-langchain`](https://www.npmjs.com/package/x402check-langchain) — LangChain JS
- [`plugin-x402check`](https://www.npmjs.com/package/plugin-x402check) — ElizaOS
- Template: [nwilliams005/x402check-cloudflare-agent](https://github.com/nwilliams005/x402check-cloudflare-agent)

Docs: https://x402check.dev/llms.txt
