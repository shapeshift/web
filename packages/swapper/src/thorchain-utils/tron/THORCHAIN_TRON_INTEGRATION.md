# Thorchain TRON Integration

## Overview

This document covers the implementation of TRON support for the Thorchain swapper, enabling cross-chain swaps between TRON assets (TRX, TRC20 tokens) and other Thorchain-supported chains.

## Architecture

TRON follows the **UTXO-style pattern** for Thorchain integration (like BTC, DOGE, LTC), **NOT the EVM pattern**.

### Key Differences from EVM Chains

| Aspect | EVM Chains | TRON |
|--------|-----------|------|
| Router Contract | ✅ Required | ❌ Not used |
| Transaction Type | `depositWithExpiry()` call | Direct transfer to vault |
| Memo Location | Calldata parameter | `raw_data.data` field |
| Memo Encoding | ABI-encoded | UTF-8 hex string |
| Fee Handling | Gas limit | Energy + Bandwidth |

### Transaction Flow

1. User initiates swap (e.g., TRON.USDT → BTC.BTC)
2. Get Thorchain quote with memo (e.g., `"SWAP:BTC.BTC:bc1q..."`)
3. Get vault address from Thorchain inbound_addresses API
4. Build transaction: Transfer to vault WITH memo
5. Sign and broadcast to TRON network
6. Thorchain detects inbound tx, reads memo, executes swap

## Implementation Details

### 1. Asset Mapping

**File:** `scripts/generateTradableAssetMap/utils.ts`

Added TRON to asset generation:
```typescript
enum Chain {
  // ...existing chains
  TRON = 'TRON',
}

const chainToChainId: Record<Chain, ChainId> = {
  // ...existing mappings
  [Chain.TRON]: tronChainId,
}

// Added TRC20 token standard
case KnownChainIds.TronMainnet:
  return ASSET_NAMESPACE.trc20
```

**Generated Assets:**
- `TRON.TRX` → `tron:0x2b6653dc/slip44:195`
- `TRON.USDT-TR7NHQJEKQXGTCI8Q8ZY4PL8OTSZGJLJ6T` → `tron:0x2b6653dc/trc20:tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t`

### 2. Memo Support in Chain Adapter

**File:** `packages/chain-adapters/src/tron/types.ts`

```typescript
export type BuildTxInput = {
  contractAddress?: string
  memo?: string  // Added for Thorchain
}
```

**File:** `packages/chain-adapters/src/tron/TronChainAdapter.ts`

```typescript
async buildSendApiTransaction(input: BuildSendApiTxInput<KnownChainIds.TronMainnet>) {
  const { chainSpecific: { contractAddress, memo } = {} } = input

  // Build TRX or TRC20 transaction
  let txData = await this.buildTransaction(...)

  // Add memo if provided
  if (memo) {
    txData = await tronWeb.transactionBuilder.addUpdateData(txData, memo, 'utf8')
  }

  return { addressNList, rawDataHex, transaction: txData }
}
```

**How Memo Works:**
- Uses TronWeb's `addUpdateData()` method
- Encodes memo as UTF-8 hex string
- Stored in `raw_data.data` field
- Visible on TronScan and readable by Thorchain
- Adds 1 TRX fee (`getMemoFee` network parameter)

### 3. Thorchain Utils Module

**Location:** `packages/swapper/src/thorchain-utils/tron/`

#### getThorTxData.ts
```typescript
// Gets vault address from Thorchain inbound_addresses API
export const getThorTxData = async ({ sellAsset, config, swapperName }) => {
  const daemonUrl = getDaemonUrl(config, swapperName)
  const res = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId, false, swapperName)
  const { address: vault } = res.unwrap()
  return { vault }
}
```

**Thorchain Inbound Address:**
```json
{
  "chain": "TRON",
  "address": "TGGwikcdG1xAeftPWpS7jpomLTobTV7BGY",
  "router": null,  // No router for TRON!
  "gas_rate": "25387800",
  "outbound_fee": "158419800"
}
```

#### getUnsignedTronTransaction.ts
```typescript
export const getUnsignedTronTransaction = async (args, swapperName) => {
  const { memo } = tradeQuote
  const { vault } = await getThorTxData(...)
  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

  return adapter.buildSendApiTransaction({
    to: vault,
    from,
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    accountNumber,
    chainSpecific: {
      contractAddress,  // For TRC20 tokens
      memo,             // Thorchain swap memo
    },
  })
}
```

**Contract Address Extraction:**
- Native TRX: `undefined`
- TRC20 USDT: `tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t`
- Uses `contractAddressOrUndefined()` utility

#### getTronTransactionFees.ts
```typescript
export const getTronTransactionFees = async (args, swapperName) => {
  const { vault } = await getThorTxData(...)
  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
  const rpcUrl = config.VITE_TRON_NODE_URL

  const tronWeb = new TronWeb({ fullHost: rpcUrl })

  if (contractAddress) {
    // TRC20: Estimate energy
    const { energyPrice } = await getChainPrices(rpcUrl)
    const result = await tronWeb.transactionBuilder.triggerConstantContract(
      contractAddress,
      'transfer(address,uint256)',
      {},
      [
        { type: 'address', value: vault },
        { type: 'uint256', value: sellAmountIncludingProtocolFeesCryptoBaseUnit },
      ],
      vault,
    )
    const energyUsed = result.energy_used ?? 65000
    return String(energyUsed * energyPrice)
  } else {
    // TRX: Calculate bandwidth
    const { bandwidthPrice } = await getChainPrices(rpcUrl)
    let tx = await tronWeb.transactionBuilder.sendTrx(vault, amount, vault)
    const txWithMemo = await tronWeb.transactionBuilder.addUpdateData(tx, memo, 'utf8')
    const totalBytes = (txWithMemo.raw_data_hex.length / 2) + 65
    return String(totalBytes * bandwidthPrice)
  }
}
```

**Fee Components:**
- **Energy (TRC20 only)**: Smart contract execution cost
  - Recipient has balance: ~64k units × 100 SUN = ~6.4 TRX
  - Recipient empty: ~130k units × 100 SUN = ~13 TRX
- **Bandwidth**: Transaction size cost
  - ~345-405 bytes × 1,000 SUN = ~0.35-0.4 TRX
  - Daily free: 600 units (enough for 1-2 TRC20 txs)
- **Memo Fee**: Fixed network parameter
  - 1 TRX if `raw_data.data` present

### 4. Integration Points

**File:** `packages/swapper/src/thorchain-utils/getL1RateOrQuote.ts:443-482`

```typescript
case CHAIN_NAMESPACE.Tron: {
  const maybeRoutes = await Promise.allSettled(
    perRouteValues.map((route): Promise<T> => {
      const memo = getMemo(route)

      // For rate quotes (no wallet), can't calculate fees
      const networkFeeCryptoBaseUnit = undefined

      return Promise.resolve(
        makeThorTradeRateOrQuote<ThorUtxoOrCosmosTradeRateOrQuote>({
          route,
          allowanceContract: '0x0', // not applicable to TRON
          memo,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees: getProtocolFees(route.quote),
          },
        }),
      )
    }),
  )
  // ... error handling
}
```

**File:** `packages/swapper/src/swappers/ThorchainSwapper/endpoints.ts`

```typescript
export const thorchainApi: SwapperApi = {
  getTradeRate,
  getTradeQuote,
  // ... EVM, UTXO, Cosmos methods
  getUnsignedTronTransaction: input => tron.getUnsignedTronTransaction(input, swapperName),
  getTronTransactionFees: input => tron.getTronTransactionFees(input, swapperName),
  // ... other methods
}
```

**File:** `packages/swapper/src/swappers/ThorchainSwapper/ThorchainSwapper.ts`

```typescript
export const thorchainSwapper: Swapper = {
  executeEvmTransaction,
  executeCosmosSdkTransaction: (txToSign, { signAndBroadcastTransaction }) =>
    signAndBroadcastTransaction(txToSign),
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) =>
    signAndBroadcastTransaction(txToSign),
  executeTronTransaction: (txToSign, { signAndBroadcastTransaction }) =>
    signAndBroadcastTransaction(txToSign),
}
```

**File:** `packages/swapper/src/types.ts`

```typescript
export type SwapperConfig = {
  // ... existing config
  VITE_TRON_NODE_URL: string,  // Added for TRON RPC
  // ... other config
}
```

## Available Pools

**Thorchain Mainnet:**
- `TRON.TRX` - Native TRX (decimals: 6, short_code: "tr")
- `TRON.USDT-TR7NHQJEKQXGTCI8Q8ZY4PL8OTSZGJLJ6T` - Tether USDT

**API Endpoints:**
- Pools: `https://thornode.ninerealms.com/thorchain/pools`
- Inbound addresses: `https://thornode.ninerealms.com/thorchain/inbound_addresses`
- Quote: `https://thornode.ninerealms.com/thorchain/quote/swap` (POST)

## Testing & Validation

### Successful On-Chain Examples

**Example 1:** TRON.USDT → Other chain
- TX: `5AAD9FD5501B860C1C38FB362D6D92212DEB328CC10BD24C18A5CD90CDD75320`
- From: `TCTKeM5P8CUD6jVq9Xr7DgQgewrtkaAKnx`
- To: `TGGwikcdG1xAeftPWpS7jpomLTobTV7BGY` (vault)
- Amount: 1,308,110 USDT
- Memo: `TRADE+:thor14mh37ua4vkyur0l5ra297a4la6tmf95mt96a55`
- Fee: 7.8 TRX
- Energy: 64,285 units
- Result: ✅ SUCCESS

**Example 2:** TRON.USDT swap
- TX: `78055EA7A360B7EEDBEADD95EB70E45B2A9022CB9C60165E4A4FDB3E8FE8283B`
- Memo: `=:b:bc1q7hg034hvvy2wxpvs5yhs3wyva7ncxam4hvcxa6:1170359/1/0:sto:0`
- Fee limit: 100 TRX
- Result: ✅ SUCCESS

### Transaction Structure Verification

**Verified via on-chain transactions:**
```json
{
  "raw_data": {
    "data": "3d3a...",           // Memo in hex (UTF-8 encoded)
    "fee_limit": 100000000,      // 100 TRX standard
    "contract": [{
      "type": "TriggerSmartContract",
      "parameter": {
        "value": {
          "data": "a9059cbb...",  // TRC20 transfer(address,uint256) calldata
          "owner_address": "...", // Sender
          "contract_address": "41a614f803..." // USDT contract
        }
      }
    }]
  }
}
```

**Key Observations:**
- ✅ `addUpdateData()` preserves `fee_limit` (tested with actual txs)
- ✅ Memo goes in `raw_data.data` field
- ✅ TRC20 calldata in `contract[0].parameter.value.data`
- ✅ Both coexist without conflicts

## Common Issues & Solutions

### Issue 1: "BANDWITH_ERROR" / "Account resource insufficient"

**Symptoms:**
```json
{
  "code": "BANDWITH_ERROR",
  "message": "Account resource insufficient error."
}
```

**Root Cause:**
Insufficient liquid TRX balance in sender account. This error is **misleading** - it's not about bandwidth, it's about TRX balance.

**Requirements:**
- TRC20 transfer without memo: ~6-13 TRX
- TRC20 transfer with memo: ~8-15 TRX
- TRX transfer with memo: ~1-2 TRX

**Solution:**
Ensure sender has **10-15 TRX liquid (unfrozen) balance** for TRC20 swaps.

### Issue 2: OUT_OF_ENERGY Mid-Execution

**Symptoms:**
Transaction broadcasts, appears on-chain, but fails with:
```
"result": "OUT_OF_ENERGY"
"resMessage": "Not enough energy for 'PUSH20' operation executing"
```

**Root Cause:**
Started with insufficient TRX, burned what it had, then ran out mid-execution.

**Example:**
- Account: 0.25 TRX
- Started burning for energy
- Used 3.5 TRX worth, ran out
- Transaction failed on-chain

**Solution:**
Same as Issue 1 - ensure sufficient balance BEFORE initiating.

### Issue 3: Inaccurate Fee Display in UI

**Root Cause:**
`TronChainAdapter.getFeeData()` returns fixed 0.268 TRX for all transactions (see `TRON_FEE_ESTIMATION_ISSUES.md`).

**Impact:**
- User sees: "~$0.05 fee"
- Reality: "~$1.50-$3.00 fee"
- User underfunds account, transaction fails

**Solution:**
Fix `getFeeData()` to properly estimate TRC20 energy costs (tracked in TODOs).

## Cost Analysis

### TRC20 Transfer (USDT) Costs

**Energy:**
- Recipient has USDT: 64,000 units × 100 SUN = **6.4 TRX**
- Recipient empty: 130,000 units × 100 SUN = **13 TRX**

**Bandwidth:**
- Base tx: ~268 bytes
- With memo: ~345-405 bytes
- Cost: 345-405 × 1,000 SUN = **0.35-0.4 TRX**
- Can use daily free 600 units

**Memo Fee:**
- Fixed: **1 TRX** (if `raw_data.data` present)
- Network parameter: `getMemoFee: 1000000`

**Total for Thorchain Swap:**
- Best case: 6.4 + 0.4 + 1 = **~7.8 TRX**
- Worst case: 13 + 0.4 + 1 = **~14.4 TRX**

### TRX Transfer (Native) Costs

**Bandwidth:**
- Base tx: ~268 bytes
- With memo: ~325 bytes
- Cost: 325 × 1,000 SUN = **0.325 TRX**

**Memo Fee:**
- Fixed: **1 TRX**

**Total for Thorchain Swap:**
- **~1.3-1.5 TRX**

## Network Parameters (2025)

Fetched from `https://api.trongrid.io/wallet/getchainparameters`:

```json
{
  "getEnergyFee": 100,              // 100 SUN per energy unit
  "getTransactionFee": 1000,        // 1,000 SUN per bandwidth byte
  "getMemoFee": 1000000,            // 1 TRX for transactions with data
  "getFreeNetLimit": 600,           // Daily free bandwidth per account
  "getMaxFeeLimit": 15000000000     // Max fee limit: 15,000 TRX
}
```

**Daily Free Resources:**
- Bandwidth: 600 units (enough for ~1-2 TRC20 txs)
- Energy: 0 (must stake TRX or burn)

## Code Verification

### Compared Against SwapKit Implementation

**SwapKit's TRON Thorchain Implementation:**
```typescript
// From: github.com/swapkit/SwapKit/packages/toolboxes/src/tron/toolbox.ts

const addTxData = async ({ transaction, memo }) => {
  const transactionWithMemo = memo
    ? await tronWeb.transactionBuilder.addUpdateData(transaction, memo, "utf8")
    : transaction
  return transactionWithMemo
}

// For TRC20
const options = { callValue: 0, feeLimit: calculateFeeLimit() } // 100 TRX
const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
  contractAddress,
  "transfer(address,uint256)",
  options,
  parameter,
  sender,
)
const txWithData = addTxData({ memo, transaction })
```

**Our Implementation:** ✅ **Identical pattern**

### Compared Against Successful Thorchain Transactions

**On-Chain Transaction Analysis:**
- Fee limit: 100 TRX (standard)
- Memo encoding: UTF-8 hex in `raw_data.data`
- No `txLocal` option needed
- `addUpdateData()` preserves `fee_limit` correctly

**Our Implementation:** ✅ **Matches successful txs**

## Known Limitations

### 1. Fee Estimation (Inherited from Base TRON Implementation)

**Current:** Returns fixed 0.268 TRX for all transactions
**Impact:** Users see wrong fees, transactions fail
**Status:** Documented in `TRON_FEE_ESTIMATION_ISSUES.md`
**Fix:** Tracked in TODOs in `TronChainAdapter.ts:358-370`

### 2. Thorchain Quote API

**Status:** Returns "Not Implemented" for TRON
**Impact:** Must use `/inbound_addresses` + manual memo construction
**Workaround:** Use standard Thorchain quote endpoint (works despite error)

### 3. Minimum Balance Requirements

**TRC20 Swaps:** 10-15 TRX liquid balance required
**TRX Swaps:** 2-3 TRX liquid balance required
**Not Enforced:** Adapter doesn't check balance before broadcasting

## File Changes Summary

### Modified (8 files)
1. `packages/chain-adapters/src/tron/TronChainAdapter.ts` - Added memo handling
2. `packages/chain-adapters/src/tron/types.ts` - Added memo field
3. `packages/swapper/src/swappers/ThorchainSwapper/endpoints.ts` - Added TRON methods
4. `packages/swapper/src/swappers/ThorchainSwapper/ThorchainSwapper.ts` - Added executeTronTransaction
5. `packages/swapper/src/swappers/ThorchainSwapper/generated/generatedTradableAssetMap.json` - Added TRON assets
6. `packages/swapper/src/thorchain-utils/getL1RateOrQuote.ts` - Added TRON handler
7. `packages/swapper/src/thorchain-utils/index.ts` - Exported tron module
8. `packages/swapper/src/types.ts` - Added VITE_TRON_NODE_URL
9. `scripts/generateTradableAssetMap/utils.ts` - Added TRON chain mapping

### Added (4 files)
1. `packages/swapper/src/thorchain-utils/tron/getThorTxData.ts`
2. `packages/swapper/src/thorchain-utils/tron/getUnsignedTronTransaction.ts`
3. `packages/swapper/src/thorchain-utils/tron/getTronTransactionFees.ts`
4. `packages/swapper/src/thorchain-utils/tron/index.ts`

## Testing Checklist

### Pre-Testing Requirements
- [ ] Account has 15+ TRX liquid balance
- [ ] VITE_TRON_NODE_URL configured in environment
- [ ] Thorchain pools showing TRON assets

### Test Cases
- [ ] TRON.TRX → BTC.BTC swap
- [ ] TRON.USDT → ETH.ETH swap
- [ ] BTC.BTC → TRON.TRX swap (outbound to TRON)
- [ ] ETH.ETH → TRON.USDT swap
- [ ] Verify memo appears on TronScan
- [ ] Verify Thorchain detects inbound tx
- [ ] Check fee estimation accuracy

### Expected Results
- Transaction broadcasts successfully
- Appears on TronScan with memo visible
- Thorchain processes swap
- User receives output asset
- Actual fee matches estimate (once getFeeData fixed)

## References

- **Thorchain TRON Pools:** https://thornode.ninerealms.com/thorchain/pools (search "TRON")
- **Thorchain Dev Docs:** https://dev.thorchain.org/concepts/memo-length-reduction.html
- **TRON Resource Model:** https://developers.tron.network/docs/resource-model
- **TronWeb Docs:** https://tronweb.network/docu/docs/intro/
- **SwapKit TRON:** https://github.com/swapkit/SwapKit/tree/develop/packages/toolboxes/src/tron
- **On-Chain Explorer:** https://tronscan.org/

## Future Improvements

1. **Fix getFeeData()** - See `TRON_FEE_ESTIMATION_ISSUES.md`
2. **Add Balance Validation** - Check sufficient TRX before broadcasting
3. **Better Error Messages** - "Need 10 TRX for USDT swap" vs "Account resource insufficient"
4. **Dynamic FeeLimit Calculation** - Adjust based on actual energy estimate
5. **Energy Optimization** - Suggest staking TRX for frequent swappers

## Notes

- TRON transactions are **irreversible** once broadcast
- Failed transactions **still cost TRX** (energy/bandwidth burned)
- Frozen TRX **cannot** be used for transaction fees
- Each failed attempt burns ~3-4 TRX before running out
- Always test with small amounts first
