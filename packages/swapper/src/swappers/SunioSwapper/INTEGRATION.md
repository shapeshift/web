# Sun.io Integration

## Overview
- **Website**: https://sun.io
- **API Docs**: https://docs.sun.io/developers/swap/smart-router
- **Supported Chains**: TRON only
- **Type**: TRON Direct Smart Contract Execution via HTTP Quote API

## API Details

### Quote Endpoint
- **Base URL**: `https://rot.endjgfsv.link/swap/router`
- **Method**: GET
- **Authentication**: None required (public API)
- **Rate Limiting**: No observed limits

**NOTE**: The `rot.endjgfsv.link` domain appears unusual, but it's the official Sun.io backend API.
This was verified by inspecting XHR requests from sun.io's own frontend application.
The sun.io frontend makes requests to this endpoint with `origin: https://sun.io`.

### Query Parameters

- `fromToken` - TRC20 token contract address (e.g., TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t for USDT)
- `toToken` - TRC20 token contract address
- `amountIn` - Amount to swap in token base units
- `typeList` - Comma-separated DEX types: `SUNSWAP_V1,SUNSWAP_V2,SUNSWAP_V3,PSM,CURVE`

### Example Request

```bash
curl 'https://rot.endjgfsv.link/swap/router?fromToken=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&toToken=TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8&amountIn=1000000&typeList=SUNSWAP_V1,SUNSWAP_V2,SUNSWAP_V3,PSM,CURVE'
```

### Response Format

```json
{
  "code": 0,
  "message": "SUCCESS",
  "data": [{
    "amountIn": "1.000000",
    "amountOut": "1.071122",
    "inUsd": "1.000023900000000000000000",
    "outUsd": "1.070933370295836840000000",
    "impact": "-0.002174",
    "fee": "0.003000",
    "tokens": ["TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8"],
    "symbols": ["USDT", "USDC"],
    "poolFees": ["0", "0"],
    "poolVersions": ["v2"],
    "stepAmountsOut": ["1.071122"]
  }]
}
```

The API returns multiple routes sorted by best price (first route is best).

## Implementation Details

### Chain Support
Sun.io operates **exclusively on TRON blockchain** for TRC-20 token swaps.

### Native Token Handling
- Native TRX: `T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb`
- Wrapped TRX (WTRX): `TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR`

### Transaction Building
Unlike EVM swappers, Sun.io requires building TRON smart contract transactions:
1. API returns routing information (tokens, pool versions, fees)
2. Build `swapExactInput` call to smart router contract `TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj`
3. Use TronWeb's `triggerSmartContract` to construct unsigned transaction
4. Sign and broadcast via TRON chain adapter

### Smart Contract Function

The swap executes via SunSwap's Smart Exchange Router:
```solidity
function swapExactInput(
    address[] calldata path,
    string[] calldata poolVersion,
    uint256[] calldata versionLen,
    uint24[] calldata fees,
    SwapData calldata data
) external nonReentrant payable returns (uint256[] memory amountsOut)
```

Where `SwapData` is:
```solidity
struct SwapData {
    uint256 amountIn;
    uint256 amountOutMin;  // With slippage applied
    address recipient;
    uint256 deadline;
}
```

### Route Parameters Mapping

From API response to contract parameters:
- `tokens[]` → `path[]`
- `poolVersions[]` → `poolVersion[]` (e.g., ["v2", "v3"])
- Calculate `versionLen[]` from path length and pool count
- `poolFees[]` → `fees[]` (converted to uint24)

### Slippage Application

Sun.io API returns `amountOut` without slippage. We apply slippage when building the transaction:
```typescript
amountOutMin = amountOut * (1 - slippageTolerancePercentageDecimal)
```

Default slippage: **0.5%** (0.005 decimal)

### Fee Estimation

Network fees use TRON chain adapter's `getFeeData()`:
- Returns `txFee` in SUN (smallest unit of TRX)
- Typical swap fee: ~14-30 TRX depending on route complexity

## Gotchas

### 1. Amounts are Human-Readable
The API returns amounts in **human-readable format** (e.g., "1.071122"), NOT base units.
Must multiply by `10^precision` to convert to crypto base units.

### 2. Multi-Hop Routes
API can return multi-hop routes (e.g., USDC → WTRX → USDT).
The `tokens[]` array includes ALL tokens in the path, including intermediaries.

### 3. TronWeb Transaction Building
Must use TronWeb library to build smart contract calls - this is specific to TRON and different from EVM chains.

### 4. No Affiliate Fee Support
Sun.io API doesn't support affiliate fees - we pass `affiliateBps` but it's ignored.

### 5. Address Format
TRON addresses start with 'T' and use Base58 encoding (not EIP-55 checksum like EVM).

## Testing Notes

**Test Pairs** (high liquidity on TRON):
- USDT (TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t) ↔ USDC (TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8)
- TRX (T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb) ↔ USDT

**Verify**:
- Quote amounts match API response (after precision conversion)
- Slippage is applied correctly in `amountOutMin`
- Transaction can be signed by TRON wallet
- Network fees are reasonable (~14-30 TRX)

## Known Issues

1. **Status Checking**: Currently returns default status. Full TRON transaction status polling not implemented.
2. **Cross-Account**: Not supported (same as most single-chain swappers)

## References
- [Sun.io Smart Router Docs](https://docs.sun.io/developers/swap/smart-router)
- [SunSwap Contracts](https://github.com/sun-protocol/smart-exchange-router)
- [TronWeb Documentation](https://tronweb.network/docu/docs/intro/)

## API Discovery

The `rot.endjgfsv.link` endpoint was discovered by:
1. Inspecting network traffic from sun.io web application
2. Observing XHR requests with `origin: https://sun.io` header
3. Testing and verifying responses match expected swap data

This appears to be Sun.io's internal aggregator API used by their frontend.
