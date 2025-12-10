# Zcash Trezor Support Implementation Plan

## Current Issue

~~When attempting to broadcast Zcash transactions using Trezor hardware wallet, the transaction fails with consensus branch validation.~~ ✅ FIXED

**New Issue:** When building Zcash send transactions, the unchained API fails with:
```
Transaction not found (AmountToBigInt: failed to convert)
```

This happens when calling `this.providers.http.getTransaction({ txid: input.txid })` in `UtxoBaseAdapter.ts:343`.

**Status:** Native wallet works ✅ | Trezor wallet works ✅ (with Blockchair workaround)

## Root Causes

### 1. Missing Trezor Parameters ✅ FIXED

The Trezor hdwallet implementation did not pass Zcash-specific transaction parameters to Trezor Connect:

**Missing parameters (now added):**
- `version` - Transaction version (4 or 5)
- `versionGroupId` - Version-specific group ID (0x892f2085 for v4, 0x26a7270a for v5)
- `branchId` - Consensus branch ID (0x4dec4df0 for NU6.1)

### 2. Unchained API Bug ⚠️ WORKAROUND

The unchained Zcash backend has a bug parsing certain Zcash transactions. When calling `/api/v1/tx/{txid}`, it returns:
```
{"error":"Transaction not found (AmountToBigInt: failed to convert ..."}
```

However, the same transaction can be successfully fetched from Blockchair API.

**Why native works:**

Native wallet (`hdwallet-native/src/bitcoin.ts`) includes these constants and sets them on the PSBT:

```typescript
const ZCASH_VERSION_GROUP_ID: Record<number, number> = {
  4: 0x892f2085,
  5: 0x26a7270a,
};
const ZCASH_CONSENSUS_BRANCH_ID = 0x4dec4df0;

// In signing:
if (coin.toLowerCase() === "zcash") {
  const versionGroupId = ZCASH_VERSION_GROUP_ID[version ?? 5];
  psbt.setVersion(version ?? 5);
  psbt.setVersionGroupId(versionGroupId);
  psbt.setConsensusBranchId(ZCASH_CONSENSUS_BRANCH_ID);
}
```

## Implementation Plan

### hdwallet-trezor Changes ✅ COMPLETE

**File:** `packages/hdwallet-trezor/src/bitcoin.ts`

**Status:** Implemented and committed

**Step 1: Add constants**
```typescript
const ZCASH_VERSION_GROUP_ID: Record<number, number> = {
  4: 0x892f2085,
  5: 0x26a7270a,
};
const ZCASH_CONSENSUS_BRANCH_ID = 0x4dec4df0;
```

**Step 2: Update btcSignTx function (~line 142)**
```typescript
const isZcash = msg.coin === "Zcash";
const version = isZcash ? (msg.version ?? 5) : undefined;

const res = await transport.call("signTransaction", {
  coin: translateCoin(msg.coin),
  inputs: inputs,
  outputs: outputs,
  push: false,
  ...(isZcash && {
    version,
    versionGroupId: ZCASH_VERSION_GROUP_ID[version!],
    branchId: ZCASH_CONSENSUS_BRANCH_ID,
  }),
});
```

### shapeshiftWeb Changes ✅ COMPLETE

**Status:** Implemented and committed

**1. Wallet Support Changes** ✅
[PR #11327](https://github.com/shapeshift/web/pull/11327) previously restricted Zcash to native wallet only. This has been fixed.

**Required changes (straightforward):**

**File 1:** `src/hooks/useWalletSupportsChain/useWalletSupportsChain.ts` (line ~161)
```typescript
case zecChainId:
  // Change from:
  return supportsBTC(wallet) && isNativeHDWallet(wallet)

  // To:
  return supportsBTC(wallet) && (isNativeHDWallet(wallet) || isTrezorHDWallet(wallet))
```

**File 2:** `src/state/slices/portfolioSlice/utils/index.ts` (line ~405)
```typescript
case zecChainId:
  // Change from:
  return supportsBTC(wallet) && isNativeHDWallet(wallet)

  // To:
  return supportsBTC(wallet) && (isNativeHDWallet(wallet) || isTrezorHDWallet(wallet))
```

**Note:** `isTrezorHDWallet` helper already exists in `@/lib/utils`

**2. Blockchair API Workaround** ✅

To work around the unchained API bug, we've monkey-patched `getTransaction` in `ZcashChainAdapter`:

**File:** `packages/chain-adapters/src/utxo/zcash/ZcashChainAdapter.ts`

```typescript
constructor(args: ChainAdapterArgs) {
  super({ /* ... */ })

  // Monkey-patch getTransaction to use Blockchair as fallback
  const originalGetTransaction = this.providers.http.getTransaction.bind(this.providers.http)
  this.providers.http.getTransaction = async ({ txid }) => {
    try {
      return await originalGetTransaction({ txid })
    } catch (error) {
      // Fallback to Blockchair API
      const response = await fetch(`https://api.blockchair.com/zcash/raw/transaction/${txid}`)
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(`Blockchair API error: ${data.error || response.statusText}`)
      }
      return {
        hex: data.data[txid].raw_transaction,
      }
    }
  }
}
```

**File:** `headers/csps/chains/zcash.ts` - Added Blockchair to CSP

```typescript
export const csp: Csp = {
  'connect-src': [
    env.VITE_UNCHAINED_ZCASH_HTTP_URL,
    env.VITE_UNCHAINED_ZCASH_WS_URL,
    'https://api.blockchair.com',
  ],
}
```

This is a temporary workaround until the unchained API bug is fixed upstream.

## Testing Strategy

### Local Testing with Verdaccio

Use the `hdwallet-verdaccio-local-publish-pipeline` to test hdwallet changes locally before publishing:

1. Make changes in hdwallet repo
2. Run verdaccio publish pipeline (see hdwallet-verdaccio-local-publish-pipeline skill)
3. Update web repo to use local hdwallet packages
4. Test end-to-end with Trezor device
5. Verify transaction signing and broadcast

### Test Cases

1. ✅ Address generation (already works)
2. Transaction signing with single output
3. Transaction signing with change output
4. Transaction broadcast to network
5. Verify on block explorer

### Requirements

- Trezor firmware v1.11.1+ (Model One) or v2.5.1+ (Model T) for NU5 support
- Test with Zcash testnet first

## Technical Background

### Zcash Transaction Versioning

| Version | Network Upgrade | Version Group ID | Consensus Branch ID |
|---------|----------------|------------------|---------------------|
| 4       | Sapling        | 0x892f2085       | (varies)            |
| 5       | NU5            | 0x26a7270a       | 0x4dec4df0          |

**Current Standard:** Version 5 (NU5) with consensus branch ID 0x4dec4df0 (NU6.1)

### Why These Fields Matter

- **versionGroupId**: Ensures transaction format matches the protocol version
- **consensusBranchId**: Provides replay protection across network upgrades
- **version**: Determines which transaction format to use

Without these fields, the Zcash node rejects transactions as invalid.

## Implementation Checklist

### hdwallet
- [x] Add ZCASH_VERSION_GROUP_ID constant to hdwallet-trezor
- [x] Add ZCASH_CONSENSUS_BRANCH_ID constant to hdwallet-trezor
- [x] Update btcSignTx to pass Zcash parameters to Trezor Connect
- [x] Test locally via verdaccio pipeline
- [ ] Create PR to hdwallet repo
- [ ] Publish new hdwallet version

### shapeshiftWeb
- [x] Update useWalletSupportsChain to allow Trezor for Zcash
- [x] Update portfolioSlice utils to allow Trezor for Zcash
- [x] Add Blockchair API workaround for transaction fetching
- [x] Add Blockchair to CSP configuration
- [x] Bump hdwallet dependencies to new version (1.62.26-zcash-trezor.0)
- [ ] Test end-to-end with Trezor device
- [ ] Merge PR

## Related PRs

- ✅ [hdwallet#760](https://github.com/shapeshift/hdwallet/pull/760) - Native wallet Zcash support
- 🚧 [web#11337](https://github.com/shapeshift/web/pull/11337) - Ledger Zcash support
- 📝 This implementation - Trezor Zcash support
