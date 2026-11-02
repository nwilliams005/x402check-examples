# Turnkey + x402check

Example: an agent with a [Turnkey](https://www.turnkey.com) ethereum wallet runs [x402check](https://x402check.dev) **before** it pays any x402 endpoint.

## Why this SDK

- `@turnkey/sdk-server` — `Turnkey` + `apiClient().createWallet({ accounts: DEFAULT_ETHEREUM_ACCOUNTS })`
- `@turnkey/viem` — `createAccount({ client, organizationId, signWith })` → viem `LocalAccount`

Docs: https://docs.turnkey.com/sdks/server · https://docs.turnkey.com/sdks/viem

## Quickstart

```bash
cd turnkey
cp .env.example .env
npm install
npm run dry-run
npm run dry-run:avoid
# Live: set TURNKEY_ORGANIZATION_ID + API key pair, fund address with USDC on Base
# npm start -- --url https://seller.example/api
```

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `TURNKEY_ORGANIZATION_ID` | live | Org ID |
| `TURNKEY_API_PUBLIC_KEY` / `TURNKEY_API_PRIVATE_KEY` | live | API key pair |
| `TURNKEY_SIGN_WITH` | no | Existing eth address (skip create) |
| `X402CHECK_URL` / `USE_FREE_CHECK` / `SELLER_URL` | no | Same as other examples |
| `DRY_RUN=1` | dry | Force dry-run |

## What it does

Same preflight → AgentKit `{ abort, reason?, code? }` → pay/refuse flow as `para/`.

## Docs

- x402check: https://x402check.dev/llms.txt
- Turnkey Ethereum: https://docs.turnkey.com/networks/ethereum
