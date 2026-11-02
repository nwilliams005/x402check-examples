# Privy + x402check

Example: an agent with a [Privy](https://www.privy.io) **server wallet** runs [x402check](https://x402check.dev) **before** it pays any x402 endpoint. If the check says `avoid` (or `caution` when configured), the agent refuses. If it passes, the agent settles from the Privy wallet with x402 v2 Exact USDC on Base.

## Why this SDK

Privy’s Node SDK (`@privy-io/node`) creates and signs with server wallets:

- Create: `privy.wallets().create({ chain_type: "ethereum" })`
- Viem account: `createViemAccount` from `@privy-io/node/viem`
- Optional x402 helper: `createX402Client` from `@privy-io/node/x402` (same account under the hood)

Docs: https://docs.privy.io/wallets/using-wallets/nodeJS/usage · https://docs.privy.io/wallets/using-wallets/nodeJS/x402-payments

## Quickstart

```bash
cd privy
cp .env.example .env
npm install
npm run dry-run
npm run dry-run:avoid
# Live: set PRIVY_APP_ID + PRIVY_APP_SECRET, fund the wallet with USDC on Base
# npm start -- --url https://seller.example/api
```

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `PRIVY_APP_ID` / `PRIVY_APP_SECRET` | live | Dashboard app credentials |
| `PRIVY_WALLET_ID` + `PRIVY_WALLET_ADDRESS` | no | Reuse an existing wallet |
| `PRIVY_SIGNATURE_TYPE=erc1271` | no | For EIP-7702 gas-sponsored wallets |
| `X402CHECK_URL` | no | Default `https://x402check.dev` |
| `USE_FREE_CHECK` | no | Default on — one free regular check ever per wallet |
| `SELLER_URL` / `--url` | no | Endpoint the agent is about to pay |
| `MAX_AMOUNT_USD` | no | Local cap even when verdict is `ok` |
| `ABORT_ON_CAUTION` | no | Treat `caution` like `avoid` |
| `DRY_RUN=1` | dry | Force dry-run |

## What it does

1. **Wallet** — create/load a Privy ethereum server wallet (or local throwaway key in dry-run).
2. **Preflight** — prefer free signed challenge; else pay **$0.01** Exact USDC on Base.
3. **Decision** — AgentKit `#1454` shape `{ abort, reason?, code? }`.
4. **Pay or refuse**.

## Docs

- x402check: https://x402check.dev/llms.txt
- Privy Node wallets: https://docs.privy.io/wallets/using-wallets/nodeJS/create-a-wallet
