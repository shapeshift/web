# Symbiosis Integration

## Overview

- **Website**: https://symbiosis.finance
- **Docs**: https://docs.symbiosis.finance/developer-tools/symbiosis-api
- **OpenAPI**: https://api.symbiosis.finance/crosschain/openapi.json
- **Type**: cross-chain, EVM and Tron direct transaction
- **Scope**: Symbiosis's own liquidity only. EVM↔EVM across 25 shared chains and Tron↔EVM. No same-chain swaps.

## API

- **Base URL**: `VITE_SYMBIOSIS_API_URL` (`https://api.symbiosis.finance/crosschain`), no API key
- `POST /v2/quote` — quote and calldata, used by both the rate and quote arms
- `GET /v2/tx/{chainId}/{txHash}` — status by source chain and source tx hash (Tron hashes work with or without `0x`)

## Request mapping

- `chainId`: the EVM chain reference; Tron is `728126428`
- Token `address`: `""` for native, checksummed for ERC20, 20-byte hex for TRC20
- `from` / `to`: Tron addresses in base58
- `slippage`: integer bps for the whole route, accepted range 20–1000. We clamp and report the clamped value on the quote.
- `disabledProviders: 'chainflip-bridge,thorchain-bridge,changelly'` on every request. Those routes only forward to protocols we integrate directly (or to Changelly, which is custodial).

## Response handling

- Accepted only when `kind === 'crosschain-swap'`, no `partner-swap` / `semi-centralized` label, and `type` matches the sell chain.
- EVM `tx` has no gas limit; `getEvmNetworkFeeCryptoBaseUnit` estimates and sets it.
- Tron `tx.data` holds the encoded parameters only; the selector comes from `tx.functionSelector` (a signature string). `tx.feeLimit` is a flat 200 TRX cap and is not used.
- `approveTo` is the spender for token sells and equals `tx.to`.
- `fees[]` mixes destination-chain tokens with sTokens on the Symbiosis host chain (`13863860`). Host-chain entries have no ShapeShift asset and are left out of `protocolFees`; the buy amount is already net of them.

## Partner fee

- Symbiosis configures a fixed fee per registered `partnerAddress`; there is no per-request bps. An unregistered address is accepted and ignored.
- Applies to cross-chain routes only. Same-chain swaps ignore `partnerAddress` (verified against a live registered partner on 2026-10-05).
- We send `VITE_SYMBIOSIS_PARTNER_ADDRESS` only when the app's requested bps equals `SYMBIOSIS_PARTNER_FEE_BPS`, so the user is never charged more than requested.
- Fees accrue as sTokens on the Symbiosis chain and are claimed at https://explorer.symbiosis.finance/partners.

## Status

| Code | Meaning | We report |
| --- | --- | --- |
| `-1` | not found | Unknown |
| `1` | pending | Pending |
| `0` | success | Confirmed when `tx.chainId` is the buy chain, otherwise Pending |
| `2` | stuck | Pending, with a message (Symbiosis reverts stuck operations itself) |
| `3` | reverted | Failed |

- Before an operation is indexed, the endpoint answers `0` for the plain source transaction, with `tx` equal to `txIn`. That is why Success alone is not enough.
- `transitTokenSent` means the destination swap did not complete and the user received the transit token (for example USDC). We report Confirmed with a message naming it.

## Tron energy

`metaRoute` energy measured over 31 mainnet calls on 2026-10-05: 376,324–467,826 when the sell token is bridged directly, 464,964–578,456 when the route swaps on Tron first (`src-chain-swap` label). The router's deployer covers none of it. The constants are used for rates and for token quotes whose allowance is not yet granted.

## Known gaps

- Live `approveTo` addresses are not in Symbiosis's published SDK config, so they cannot be checked against it.
- Per the public SDK, stuck swaps touching Tron or Abstract refund through Symbiosis-held revert addresses.
- Rate limits on `/v2/quote` are undocumented.
