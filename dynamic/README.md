# Dynamic + x402check

Example: an agent with a [Dynamic](https://www.dynamic.xyz) Node MPC EVM wallet runs [x402check](https://x402check.dev) **before** it pays any x402 endpoint.

## Why this SDK

- `@dynamic-labs-wallet/node-evm` — `DynamicEvmWalletClient`
- `@dynamic-labs-wallet/node` — `ThresholdSignatureScheme`
- Auth: `authenticateApiToken(token)`
- Create: `createWalletAccount({ thresholdSignatureScheme, backUpToDynamic })`
- Sign / Exact: `getWalletClient({ walletMetadata, externalServerKeyShares, chain })` → viem account

Docs: https://www.dynamic.xyz/docs/wallets/embedded-wallets/mpc/installation-node

## Native addons

The Dynamic Node wallet SDK uses native MPC bindings. **Dry-run does not load the SDK** (dynamic `import()` only on the live path). Install on Linux/macOS with a matching Node version for live runs.

## Quickstart

```bash
cd dynamic
cp .env.example .env
npm install
npm run dry-run
npm run dry-run:avoid
# Live: DYNAMIC_ENVIRONMENT_ID + DYNAMIC_AUTH_TOKEN, fund address with USDC on Base
# npm start -- --url https://seller.example/api
```

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `DYNAMIC_ENVIRONMENT_ID` | live | Environment ID |
| `DYNAMIC_AUTH_TOKEN` | live | Token for `authenticateApiToken` |
| `DYNAMIC_TSS` | no | `TWO_OF_TWO` (default) or `TWO_OF_THREE` |
| `DYNAMIC_WALLET_METADATA_JSON` | no | Persist/reuse `createWalletAccount` metadata |
| `DRY_RUN=1` | dry | Force dry-run (no native SDK load) |

## Docs

- x402check: https://x402check.dev/llms.txt
- Dynamic MPC Node: https://www.dynamic.xyz/docs/wallets/embedded-wallets/mpc/create-wallet-account
