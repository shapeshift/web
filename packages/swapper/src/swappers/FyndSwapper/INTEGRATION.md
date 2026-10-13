# Fynd Integration

## Overview
- **Website**: https://github.com/propeller-heads/fynd
- **License**: [Fynd License 1.0](https://github.com/propeller-heads/fynd/blob/main/LICENSE.md)
- **Supported Chains**: Ethereum, Base, Arbitrum, BNB Smart Chain, Polygon, Unichain, Robinhood
- **Type**: EVM direct transaction to the Fynd router, same-chain, exact input

## API Details
- **Upstream**: `POST https://fynd-api.propellerheads.xyz/v1/{chain}/quote`, where `{chain}` is the
  `name` in `utils/constants.ts`
- **Authentication**: `Authorization: <FYND_API_KEY>`. The key lives only in public-api, which
  serves `POST /v1/fynd/{chain}/quote`; the web app calls that route via `VITE_FYND_BASE_URL`
- **Endpoints**: the quote endpoint serves both rates and quotes. Rates without a wallet send
  `FYND_RATE_ADDRESS` as sender; executable quotes reject it

## Implementation Notes

### Request
- One order per request: `side: 'sell'`, `timeout_ms: 5000`, `min_responses: 1`
- `encoding_options.transfer_type: 'transfer_from'`: the router pulls ERC-20s through a standard
  approval, so `allowanceContract` is the router. Native sells send `value` and need no approval
- Slippage is a decimal **string** (`'0.005'` = 0.5%). The deployed API requires a string even
  though its OpenAPI schema declares a number
- Native token is the zero address in requests; the router uses
  `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` internally

### Response
`orders[0]` carries `status`, `amount_in`, `amount_out`, `gas_estimate`, optional `gas_price` and
`price_impact_bps`, `route.swaps[].protocol`, `transaction { to, value, data }` and
`fee_breakdown { router_fee, client_fee, max_slippage, min_amount_received }`.

- `amount_out = router_fee + client_fee + max_slippage + min_amount_received`
- `client_fee` must be zero: ShapeShift charges no affiliate fee on Fynd quotes
- The router keeps positive slippage, so users never receive more than the quoted output
- `no_route_found` and `insufficient_liquidity` map to `NoRouteFound`; other statuses map to
  `QueryFailed`

### Validation
`utils/validation.ts` treats the response as untrusted and returns a distinct error per group:
amounts, fee breakdown, transaction, route and slippage. A router mismatch names the returned and
pinned routers. The calldata itself is not decoded.

### Routers
Every Fynd settlement must go through the router listed in the
[Router Registry](https://docs.propellerheads.xyz/tycho/for-solvers/execution/contract-addresses).
`utils/constants.ts` pins one router per chain. The registry gives 30 days' notice before a new
router takes over; update the pins before its migration deadline, or Fynd quotes start failing
with the router-mismatch error.

### License notice
Any caller can use the public-api route, so it supplies Fynd quotes to third parties. Fynd License
§3.4 requires a notice of the router terms in that case: each successful response carries it in
the `Fynd-License-Notice` header and the `license_notice` field.

### Deadlines and gas
- Quotes set no `deadline`: neither Fynd nor the router enforces one
- Rates price `gas_estimate` with the chain adapter and fall back to the provider `gas_price`;
  quotes estimate gas with a state override and fail if estimation fails

## Known Issues
- Gas estimation fails for unfunded Robinhood USDG sells; funded USDG and WETH sells pass
- Not enabled in the public swap API (`ENABLED_SWAPPER_NAMES`) or the swap widget

## Testing Notes
- Unit tests: `trade.test.ts`, `utils/validation.test.ts` and `packages/public-api/src/routes/fynd.test.ts`
- Local setup: set `FYND_API_KEY` in public-api, point `VITE_FYND_BASE_URL` at its `/v1/fynd`, and
  enable the `FyndSwap` flag
