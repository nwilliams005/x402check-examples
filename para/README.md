# Para + x402check

Example: an agent with a [Para](https://getpara.com) EVM wallet runs [x402check](https://x402check.dev) **before** it pays any x402 endpoint. If the check says `avoid` (or `caution` when configured), the agent refuses. If it passes, the agent settles from the Para wallet with x402 v2 Exact USDC on Base.

## Why Para REST SDK

Para’s current docs recommend **`@getpara/rest-sdk`** for new server / agent wallets (API-key create + sign, no user-share storage):

- https://docs.getpara.com/v3/rest/sdk
- https://docs.getpara.com/llms.txt — “REST API — Default for Server-Side Wallets”

`@getpara/server-sdk` is for imported client sessions or legacy SDK pregen (share-backed). This example uses REST + `createParaRestViemAccount` from `@getpara/rest-sdk/viem`.

## Quickstart

```bash
cd para
cp .env.example .env
npm install

# No Para key needed — labeled dry run (synthetic ToolCheck, no on-chain spend)
npm run dry-run

# Simulate an avoid verdict
npm run dry-run:avoid

# Live (needs PARA_API_KEY from https://developer.getpara.com + USDC on Base)
# npm start -- --url https://seller.example/api
```

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `PARA_API_KEY` | live only | Partner API key (`X-API-Key`) |
| `PARA_ENVIRONMENT` | no | `BETA` (default) or `PROD` |
| `PARA_USER_IDENTIFIER` | no | e.g. `agent@test.getpara.com` on BETA |
| `PARA_WALLET_ID` | no | Reuse an existing REST wallet |
| `X402CHECK_URL` | no | Default `https://x402check.dev` |
| `USE_FREE_CHECK` | no | Default on — one free regular check ever per wallet via signed challenge |
| `SELLER_URL` / `--url` | no | Endpoint the agent is about to pay |
| `MAX_AMOUNT_USD` | no | Local cap even when verdict is `ok` |
| `ABORT_ON_CAUTION` | no | Treat `caution` like `avoid` |
| `DRY_RUN=1` | dry | Force dry-run even if a key is set |
| `DRY_RUN_VERDICT` | dry | `ok` \| `caution` \| `avoid` |

Never commit `.env` or funded keys.

## What it does

1. **Wallet** — create/load a Para REST EVM wallet (or a local throwaway key in dry-run).
2. **Preflight** — prefer `GET /preflight/free/challenge` → `signMessage` → `POST /preflight/free` (one free regular check ever per wallet). If already used, pay **$0.01** Exact USDC on Base via `@x402/fetch` + `ExactEvmScheme`.
3. **Decision** — map the ToolCheck to the AgentKit `#1454` `beforePayment` shape `{ abort, reason?, code? }`.
4. **Pay or refuse** — on `abort: true`, exit without settling; otherwise pay the seller from the Para wallet.

Deep checks and batch are never free. Free check is not a scanner substitute — further live checks are paid.

## Expected dry-run output

```json
{"step":"start","sellerUrl":"https://x402check.dev/example", ...}
{"step":"wallet","mode":"DRY_RUN","note":"No PARA_API_KEY / DRY_RUN=1 — using local throwaway key. Not a Para wallet.","address":"0x…"}
{"step":"preflight","via":"dry_run","check":{"verdict":"ok", ...}}
{"step":"beforePayment","decision":{"abort":false,"reason":"x402check verdict=ok …","code":"x402check:ok"}}
{"step":"pay","settle":{"status":200,"dryRun":true,"body":{"note":"DRY_RUN — skipped real x402 settle to seller", ...}}}
{"step":"done","dryRun":true, ...}
```

With `DRY_RUN_VERDICT=avoid`, `beforePayment.abort` is `true` and the process exits `2` without paying.

## Live checklist

1. Create a project + API key at https://developer.getpara.com
2. Put `PARA_API_KEY` in `.env` (`PARA_ENVIRONMENT=BETA` for `@test.getpara.com` identifiers)
3. Fund the Para wallet address with a little USDC on Base (and ETH for gas if sponsorship is off)
4. `npm start -- --url <seller>`

## AgentKit hook shape

`src/before-payment.ts` returns the same decision object Coinbase AgentKit `#1454` expects:

```ts
{ abort: boolean; reason?: string; code?: string }
```

So you can drop the same policy into AgentKit’s `beforePayment` seat or keep it inline as this example does.

## Docs

- x402check agent guide: https://x402check.dev/llms.txt
- npm client: `x402check-client`
- Para REST: https://docs.getpara.com/v3/rest/sdk
