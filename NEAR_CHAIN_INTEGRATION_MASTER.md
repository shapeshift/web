# NEAR Chain Integration - Master Documentation

## Crew Overview

This document serves as the master reference for the complete NEAR Protocol integration into the ShapeShift ecosystem. The work was coordinated as a "crew" with the following structure:

### Crew Structure
- **Master Agent (Chief)**: Coordinates all work, writes master documentation, performs final sanity checks
- **Native Agent**: Implements base NEAR support in hdwallet-native (key derivation, signing, address generation)
- **Ledger Agent**: Implements NEAR support for Ledger hardware wallets (hdwallet + web)
- **Trezor Agent**: Implements NEAR support for Trezor hardware wallets (hdwallet + web)
- **Research Agents**: Explore docs, specs, and external resources as needed
- **Task Agents**: Handle specific implementation tasks (swaps, token fetching, etc.)

---

## Implementation Summary

### 1. NEAR Chain Core Support

**Chain Specifications:**
- **Chain Namespace**: `near` (CAIP-2)
- **Chain Reference**: `mainnet` (CAIP-2)
- **Chain ID**: `near:mainnet`
- **SLIP-44 Coin Type**: `397`
- **Derivation Path**: `m/44'/397'/account'/0'/0'` (all hardened for Ed25519)
- **Address Format**: 64-character hex public key (implicit accounts)
- **Asset Namespace**: `slip44` (native), `nep141` (tokens)

**Files Modified:**
- `packages/caip/src/constants.ts` - Added NEAR chain constants
- `packages/chain-adapters/src/near/` - Full NearChainAdapter implementation
- `packages/swapper/src/swappers/NearIntentsSwapper/` - Near Intents swapper

### 2. Native Wallet Support (hdwallet-native)

**Implementation Location:** `packages/hdwallet-native/src/crypto/isolation/adapters/near.ts`

**Features:**
- BIP44 key derivation using SLIP-0010 for Ed25519
- Address generation (hex-encoded public key)
- Transaction signing (Borsh-encoded transactions)

### 3. Ledger Hardware Wallet Support

**hdwallet-ledger Changes:**

| File | Changes |
|------|---------|
| `near.ts` (NEW) | nearGetAddress, nearSignTx, nearGetAccountPaths, nearNextAccountPath |
| `transport.ts` | Added `Near` to LedgerTransportCoinType, imported hw-app-near |
| `ledger.ts` | Implements `core.NearWallet`, `core.NearWalletInfo` interfaces |
| `utils.ts` | Added SLIP-44 397 → "NEAR" app name mapping |
| `package.json` | Added `@ledgerhq/hw-app-near: 6.31.10` dependency |

**Web Integration:**

| File | Changes |
|------|---------|
| `ledgerAppGate.ts` | Added NEAR case for Ledger app name |
| `NearChainAdapter.ts` | Added `verifyLedgerAppOpen()` calls |
| `Ledger/constants.ts` | Added `nearAssetId` to available Ledger apps |

### 4. Trezor Hardware Wallet Support

**hdwallet-trezor Changes:**

| File | Changes |
|------|---------|
| `near.ts` (NEW) | nearGetAddress, nearGetAddresses, nearSignTx, nearGetAccountPaths, nearNextAccountPath |
| `trezor.ts` | Implements `core.NearWallet`, `core.NearWalletInfo` interfaces |

**hdwallet-core Changes:**

| File | Changes |
|------|---------|
| `near.ts` | Added `nearAddressNListToBIP32()` utility for Ed25519 path conversion |

**Web Integration:**
- No changes needed - existing `supportsNear()` check in `src/lib/utils/near.ts` automatically works

### 5. NEAR Intents Swapper

**Location:** `packages/swapper/src/swappers/NearIntentsSwapper/`

**Capabilities:**
- Swaps TO NEAR (receiving NEAR from other chains)
- Swaps FROM NEAR (sending NEAR to other chains)
- Cross-chain via deposit addresses
- Status tracking via OneClick service

**Key Files:**
- `endpoints.ts` - getUnsignedNearTransaction, getNearTransactionFees
- `getTradeQuote.ts` - NEAR-specific quote handling
- `getTradeRate.ts` - Rate fetching for NEAR

### 6. Token Support (NEP-141)

**Asset ID Format:** `near:mainnet/nep141:{contract_id}`

**Examples:**
- USDC: `near:mainnet/nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`
- wNEAR: `near:mainnet/nep141:wrap.near`

**Token Balance Fetching:**
- Uses Nearblocks API for token balances
- Endpoint: `https://api.nearblocks.io/v1/account/{address}/ft`

### 7. Market Data

**CoinGecko Integration:**
- Platform: `near-protocol`
- 80+ NEAR tokens mapped
- Native NEAR: `near:mainnet/slip44:397` → `near`

**Files:**
- `packages/caip/src/adapters/coingecko/generated/near_mainnet/adapter.json`
- `packages/caip/src/adapters/coingecko/utils.ts` (parsing logic)

---

## Environment Variables

```bash
# Feature flag
VITE_FEATURE_NEAR=true

# RPC endpoint
VITE_NEAR_NODE_URL=https://rpc.mainnet.near.org

# Nearblocks API for token balances
VITE_NEARBLOCKS_API_URL=https://api.nearblocks.io

# Near Intents API key
VITE_NEAR_INTENTS_API_KEY=<api_key>
```

---

## Derivation Path Details

NEAR uses SLIP-0010 Ed25519 derivation, which requires all path components to be hardened:

```
m / 44' / 397' / account' / 0' / 0'
  └ purpose └ coin  └ account └ change └ index
```

**Path Construction:**
```typescript
const slip44 = 397; // NEAR coin type
const accountPath = [
  0x80000000 + 44,      // purpose (hardened)
  0x80000000 + slip44,  // coin type (hardened)
  0x80000000 + accountIdx, // account (hardened)
  0x80000000 + 0,       // change (hardened)
  0x80000000 + 0,       // index (hardened)
];
```

---

## Transaction Signing Flow

### 1. Build Transaction
```typescript
// NearChainAdapter.buildSendApiTransaction()
const tx = {
  signerId: fromAddress,
  publicKey: { keyType: 0, data: pubKeyBytes },
  nonce: currentNonce + 1,
  receiverId: to,
  blockHash: bs58.decode(accessKey.blockHash),
  actions: [transfer({ deposit: BigInt(value) })]
};
```

### 2. Serialize with Borsh
```typescript
const txBytes = serialize(SCHEMA.Transaction, tx);
```

### 3. Sign with Hardware Wallet
```typescript
// For Ledger
const signedTx = await wallet.nearSignTx({
  addressNList: bip44Path,
  txBytes: txBytes
});

// Returns: { signature: string, publicKey: string }
```

### 4. Combine and Broadcast
```typescript
const signedTxBytes = serialize(SCHEMA.SignedTransaction, {
  transaction: tx,
  signature: { keyType: 0, data: bs58.decode(signature) }
});
const txHash = await broadcastTransaction(base64.encode(signedTxBytes));
```

---

## Feature Flag Gating

NEAR is behind the `VITE_FEATURE_NEAR` flag:

```typescript
// Check if NEAR is enabled
const isNearEnabled = getConfig().VITE_FEATURE_NEAR;

// Wallet support check
const supportsNear = (wallet: HDWallet) => {
  return isNearEnabled && wallet?._supportsNear;
};
```

**Affected Areas:**
- Chain selection in swapper
- Ledger app list
- Portfolio display
- Asset lists

---

## Testing Checklist

### Native Wallet
- [ ] Generate NEAR address from mnemonic
- [ ] Send NEAR to another address
- [ ] Receive NEAR from another address
- [ ] Display NEAR balance correctly

### Ledger Wallet
- [ ] Install NEAR app on Ledger device
- [ ] Connect Ledger and derive NEAR address
- [ ] Sign NEAR transaction on Ledger
- [ ] Verify transaction on device display

### Trezor Wallet
- [ ] Connect Trezor and derive NEAR address
- [ ] Sign NEAR transaction on Trezor
- [ ] Verify address on Trezor display

### Swaps
- [ ] Swap ETH → NEAR (TO NEAR)
- [ ] Swap NEAR → ETH (FROM NEAR)
- [ ] Swap NEAR token (USDC) → other chain
- [ ] Verify swap status tracking

### Tokens (NEP-141)
- [ ] Display NEAR token balances
- [ ] Send NEP-141 token
- [ ] Swap NEP-141 token

---

## Known Limitations

1. **Trezor Native Support**: @trezor/connect may not have native nearGetAddress/nearSignTransaction methods. Implementation assumes these exist or will be added.

2. **Named Accounts**: Only implicit accounts (64-char hex) are currently supported. Named accounts like `alice.near` would require additional implementation.

3. **Token Sends**: NEP-141 token transfer implementation may need contractAddress handling in send modal.

4. **Staking**: NEAR staking is not yet implemented.

---

## Dependencies

### hdwallet-ledger
```json
{
  "@ledgerhq/hw-app-near": "6.31.10"
}
```

### hdwallet (shared)
```json
{
  "bs58": "^5.0.0",
  "@near-js/crypto": "^1.0.0",
  "@near-js/transactions": "^1.0.0"
}
```

---

## Resources

- [NEAR Protocol Docs](https://docs.near.org)
- [NEAR Intents SDK](https://docs.near-intents.org)
- [SLIP-0010 Ed25519](https://github.com/satoshilabs/slips/blob/master/slip-0010.md)
- [BIP-44 for NEAR](https://docs.near.org/integrations/implicit-accounts)
- [Nearblocks API](https://api.nearblocks.io)

---

## Changelog

### Session 1
- Implemented NearChainAdapter with full send support
- Added Near Intents swapper for cross-chain swaps
- Implemented native wallet (hdwallet-native) NEAR support

### Session 2
- Fixed CoinGecko NEAR adapter export
- Added VITE_NEAR_NODE_URL to .env.development
- Fixed type issues in getTradeQuote

### Session 3
- Implemented swaps FROM NEAR (getUnsignedNearTransaction, execNearTransaction)
- Added token balance fetching via Nearblocks API
- Fixed coingecko test for USDC on NEAR

### Session 4 (Current)
- Implemented Ledger NEAR support (hdwallet-ledger + web integration)
- Implemented Trezor NEAR support (hdwallet-trezor + web integration)
- Added hw-app-near dependency
- Created master documentation

---

*Last Updated: Session 4*
*Status: Hardware wallet implementation complete, pending final verification*
