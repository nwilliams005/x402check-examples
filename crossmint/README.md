# Crossmint + x402check

Example: an agent with a [Crossmint](https://www.crossmint.com) EVM wallet runs [x402check](https://x402check.dev) **before** it pays any x402 endpoint.

## Why this SDK

`@crossmint/wallets-sdk` server / agent wallets:

- `createCrossmint({ apiKey })` → `CrossmintWallets.from` → `createWallet({ chain, recoveryMethods, signers })`
- Server signer: `{ type: "server", secret }` (SDK derives the signer address locally)
- `EVMWallet.signMessage` / `signTypedData` for free-check + Exact EIP-712

Docs: https://docs.crossmint.com/wallets/guides/create-wallet · https://docs.crossmint.com/agents

## Caveats (important)

1. **Smart accounts.** Crossmint EVM wallets are account-abstraction wallets. The free-check path expects an EIP-191 signature that `ecrecover`s to `wallet.address`. If that fails, `preflight.ts` falls back to the paid **$0.01** check (same as other examples when free is used up).
2. **First transaction.** Crossmint docs note some signer paths need the wallet to have executed at least one transaction before signatures succeed. Prefer `CROSSMINT_WALLET_ADDRESS` of an already-used wallet for live demos.
3. **Exact USDC.** Live Exact settlement uses Crossmint `signTypedData` with `chain` set. AA + EIP-3009 may need ERC-1271 support from the payee; **dry-run always works** without spending.

## Quickstart

```bash
cd crossmint
cp .env.example .env
npm install
npm run dry-run
npm run dry-run:avoid
# Live: CROSSMINT_API_KEY + CROSSMINT_SERVER_SIGNER_SECRET, CROSSMINT_CHAIN=base, fund wallet
# npm start -- --url https://seller.example/api
```

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `CROSSMINT_API_KEY` | live | Server API key |
| `CROSSMINT_SERVER_SIGNER_SECRET` | live | Server signer secret |
| `CROSSMINT_CHAIN` | no | Default `base` |
| `CROSSMINT_WALLET_ADDRESS` | no | Reuse deployed wallet |
| `DRY_RUN=1` | dry | Force dry-run |

## Docs

- x402check: https://x402check.dev/llms.txt
- Crossmint wallets: https://docs.crossmint.com/wallets/server-side-wallets
