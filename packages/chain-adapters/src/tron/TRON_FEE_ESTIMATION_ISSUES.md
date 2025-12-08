# TRON Fee Estimation Issues & Findings

## Critical Issue: Inaccurate Fee Estimation for TRC20 Tokens

### Current Implementation Problems

**File:** `packages/chain-adapters/src/tron/TronChainAdapter.ts:361-384`

The `getFeeData()` method returns **FIXED fees of 0.268 TRX** for ALL transactions:

```typescript
async getFeeData(_input: GetFeeDataInput<KnownChainIds.TronMainnet>) {
  const { fast, average, slow, estimatedBandwidth } = await this.providers.http.getPriorityFees()
  // getPriorityFees() returns FIXED 268,000 SUN (0.268 TRX)
  // Ignores _input completely - doesn't check TRC20 vs TRX!
}
```

**File:** `packages/unchained-client/src/tron/api.ts:247-276`

```typescript
async getPriorityFees() {
  const estimatedBytes = 268  // FIXED value
  const baseFee = String(estimatedBytes * bandwidthPrice)
  // Returns same fee for TRX and TRC20!
}
```

### Real-World Costs

| Transaction Type | getFeeData Returns | Actual Cost | Error Margin |
|-----------------|-------------------|-------------|--------------|
| TRX transfer | 0.268 TRX | 0.268 TRX | ✅ Correct |
| TRC20 transfer (no memo) | 0.268 TRX | **6.4-13 TRX** | ❌ 24-48x underestimate |
| TRC20 transfer (with memo) | 0.268 TRX | **8-15 TRX** | ❌ 30-56x underestimate |

### Impact on Users

1. **UI Shows Misleading Fees**
   - User sees "~$0.05 fee" in UI
   - Reality: ~$1.50-$3.00 fee
   - Transaction broadcasts and fails on-chain
   - User loses ~3-4 TRX in partial execution

2. **Failed On-Chain Transactions**
   - Example: `dcd71c73fb3de9d79d6d3ff78fb3da7a5b9b8fd1c3e72e0c7bf1badff9332a51`
   - Result: `OUT_OF_ENERGY`
   - Used 32,128 energy, paid 3.56 TRX, then failed
   - Account started with 0.25 TRX, needed 7-8 TRX

3. **Thorchain Swaps Fail**
   - Memo adds 1 TRX fee (`getMemoFee` network parameter)
   - User doesn't see this in fee preview
   - Gets `BANDWITH_ERROR` (misleading - actually insufficient TRX for energy)

## Cost Breakdown for TRC20 Transfers

### Network Parameters (2025)
```json
{
  "getEnergyFee": 100,           // 100 SUN per energy unit
  "getTransactionFee": 1000,     // 1,000 SUN per bandwidth byte
  "getMemoFee": 1000000,         // 1 TRX if raw_data.data present
  "getFreeNetLimit": 600         // Daily free bandwidth
}
```

### TRC20 USDT Transfer Costs

**Without Memo:**
- Energy: 64,000-130,000 units × 100 SUN = **6.4-13 TRX**
- Bandwidth: 345 bytes × 1,000 SUN = **0.345 TRX**
- **Total: 6.7-13.3 TRX**

**With Memo (Thorchain):**
- Energy: 64,000-130,000 units × 100 SUN = **6.4-13 TRX**
- Bandwidth: 405 bytes × 1,000 SUN = **0.405 TRX**
- Memo fee: **1 TRX** (fixed network parameter)
- **Total: 7.8-14.4 TRX**

*Energy cost varies based on recipient:*
- Has USDT balance: ~64k energy (~6.4 TRX)
- Empty USDT balance: ~130k energy (~13 TRX)

## TODO: Required Improvements

### 1. Fix getFeeData() to Estimate Real Costs

**Unchained-client already has the methods!**

File: `packages/unchained-client/src/tron/api.ts`
- ✅ `estimateTRC20TransferFee()` - Estimates energy for TRC20 (lines 217-245)
- ✅ `estimateFees()` - Estimates bandwidth for TRX (lines 203-215)
- ✅ `getChainPrices()` - Gets live energy/bandwidth prices (lines 188-201)

**What needs to be done:**

```typescript
async getFeeData(input: GetFeeDataInput<KnownChainIds.TronMainnet>) {
  const { to, value, chainSpecific: { contractAddress, memo } = {} } = input

  let energyFee = 0
  let bandwidthFee = 0

  if (contractAddress) {
    // TRC20: Estimate energy
    const feeEstimate = await this.providers.http.estimateTRC20TransferFee({
      contractAddress,
      from: to, // placeholder
      to,
      amount: value,
    })
    energyFee = Number(feeEstimate)
  }

  // Build transaction to get accurate bandwidth
  const tronWeb = new TronWeb({ fullHost: this.rpcUrl })
  let tx = contractAddress
    ? await this.buildTRC20Tx(...)
    : await tronWeb.transactionBuilder.sendTrx(to, value, to)

  if (memo) {
    tx = await tronWeb.transactionBuilder.addUpdateData(tx, memo, 'utf8')
  }

  // Calculate bandwidth
  const txBytes = tx.raw_data_hex.length / 2
  const { bandwidthPrice } = await this.getChainPrices()
  bandwidthFee = txBytes * bandwidthPrice

  // Add memo fee
  const memoFee = memo ? 1_000_000 : 0

  const totalFee = energyFee + bandwidthFee + memoFee

  return {
    fast: { txFee: String(totalFee), chainSpecific: { bandwidth: String(txBytes) } },
    average: { txFee: String(totalFee), chainSpecific: { bandwidth: String(txBytes) } },
    slow: { txFee: String(totalFee), chainSpecific: { bandwidth: String(txBytes) } },
  }
}
```

### 2. Prevent Insufficient Balance Broadcasts

Before broadcasting, check:
```typescript
const accountBalance = await this.getBalance(from)
const estimatedFee = await this.getFeeData(...)

if (accountBalance < estimatedFee.fast.txFee) {
  throw new Error(
    `Insufficient TRX balance. Need ${estimatedFee.fast.txFee} SUN, have ${accountBalance} SUN`
  )
}
```

### 3. Better Error Messages

Current: `"Account resource insufficient error"` (cryptic)

Should be:
- `"Insufficient TRX for TRC20 transfer. Need ~8 TRX for energy costs, have 0.25 TRX"`
- `"Need 10-15 TRX for TRC20 swap with memo (energy + bandwidth + memo fee)"`

### 4. UI Fee Display Improvements

Show breakdown:
```
Estimated Fees:
  Energy: 6.4 TRX
  Bandwidth: 0.4 TRX
  Memo: 1 TRX
  Total: ~7.8 TRX
```

## Evidence

### Failed Transactions (Insufficient Balance)
- `dcd71c73fb3de9d79d6d3ff78fb3da7a5b9b8fd1c3e72e0c7bf1badff9332a51`
  - Account: 0.25 TRX
  - Paid 3.56 TRX in fees before failing
  - Result: `OUT_OF_ENERGY`

- `e7ffaf590ea20e715e1956438aa507c2916870afb95b54cdc054527ccd9246ab`
  - Paid 3.81 TRX before failing
  - Result: `OUT_OF_ENERGY`

### Successful Transactions (Sufficient Balance)
- `5AAD9FD5501B860C1C38FB362D6D92212DEB328CC10BD24C18A5CD90CDD75320`
  - Fee: 7.8 TRX
  - Energy: 64,285 units
  - Bandwidth: Covered by free daily
  - Result: `SUCCESS`

## References

- TRON Resource Model: https://developers.tron.network/docs/resource-model
- TronWeb estimateEnergy: https://tronweb.network/docu/docs/API%20List/transactionBuilder/estimateEnergy/
- SwapKit TRON implementation: https://github.com/swapkit/SwapKit/tree/develop/packages/toolboxes/src/tron
- Network Parameters: `getMemoFee: 1000000`, `getEnergyFee: 100`, `getTransactionFee: 1000`

## Priority

**HIGH** - Users are losing TRX on failed transactions due to inaccurate fee estimates.
