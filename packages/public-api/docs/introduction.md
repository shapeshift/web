The ShapeShift Public API enables developers to integrate multi-chain swap functionality into their applications. Access rates from multiple DEX aggregators and execute swaps across supported blockchains.

There are two ways to integrate:

1. **Swap Widget SDK** — Drop-in React component with built-in UI, wallet connection, and multi-chain support. Fastest way to integrate.
2. **REST API** — Build your own swap UI using the endpoints below. Full control over UX.

## Affiliate Tracking (Optional)

Include a `X-Partner-Code` header with your registered partner code (e.g. `vultisig`, `venice`) to attribute swaps for affiliate fee tracking. The API resolves the code to the registered affiliate address and BPS automatically. Register a partner code at the affiliate dashboard. This is optional — all endpoints work without it.

## Asset IDs

Assets use CAIP-19 format: `{chainId}/{assetNamespace}:{assetReference}`
- Native ETH: `eip155:1/slip44:60`
- USDC on Ethereum: `eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- Native BTC: `bip122:000000000019d6689c085ae165831e93/slip44:0`
