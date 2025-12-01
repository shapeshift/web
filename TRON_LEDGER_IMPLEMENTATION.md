# Tron Ledger Support Integration

## Overview
This document tracks the integration of Ledger hardware wallet support for Tron (TRX) in shapeshiftWeb.

## Expected Changes

### 1. hdwallet Dependency Update
- Update `@shapeshiftoss/hdwallet-ledger` to version with Tron support
- No code changes required in shapeshiftWeb

## How It Works

### Automatic Detection
The existing infrastructure in shapeshiftWeb automatically detects Ledger Tron support:

1. **Wallet Support Detection** (`src/hooks/useWalletSupportsChain/useWalletSupportsChain.ts`)
   - Uses `supportsTron(wallet)` type guard from hdwallet-core
   - Returns true if wallet implements TronWallet interface

2. **Account Discovery** (`src/lib/account/tron.ts`)
   - Calls `wallet.tronGetAddress()` for Ledger wallets
   - Uses standard BIP44 path: `m/44'/195'/0'/0/0`

3. **Transaction Signing** (`src/components/Modals/Send/utils.ts`)
   - Tron chain adapter calls `wallet.tronSignTx()`
   - Ledger signs with rawDataHex from unsigned transaction

### Wallet Flow
```
User connects Ledger
  ↓
useWalletSupportsChain checks supportsTron(wallet) → true
  ↓
Tron appears as supported chain
  ↓
deriveTronAccountIdsAndMetadata calls wallet.tronGetAddress()
  ↓
User can send TRX/TRC20 tokens
  ↓
Chain adapter calls wallet.tronSignTx()
  ↓
Transaction broadcasted
```

## Testing Checklist

### Prerequisites
- [ ] Ledger device with Tron app installed
- [ ] hdwallet updated to version with Tron support
- [ ] Tron feature flag enabled (`VITE_FEATURE_TRON=true`)

### Test Cases
- [ ] Ledger appears as option when connecting wallet
- [ ] Tron chain shows as supported for Ledger
- [ ] Can derive Tron address from Ledger
- [ ] Address matches expected format (base58, starts with 'T')
- [ ] Can view Tron balance
- [ ] Can send native TRX from Ledger
- [ ] Can send TRC20 tokens from Ledger
- [ ] Ledger displays correct transaction details
- [ ] User can approve/reject on device
- [ ] Signed transaction broadcasts successfully
- [ ] Transaction appears in portfolio after confirmation

## Verification Steps

### 1. Check Wallet Detection
```javascript
// In browser console after connecting Ledger
import { supportsTron } from '@shapeshiftoss/hdwallet-core';
console.log('Ledger supports Tron:', supportsTron(wallet));
```

### 2. Check Account Discovery
```javascript
// Look for Tron accounts in Redux state
window.store.getState().portfolio.accountIds
// Should include tron:T... account IDs for Ledger
```

### 3. Check Transaction Building
- Navigate to Send modal
- Select Tron or TRC20 token
- Enter amount and recipient
- Click Review
- Verify Ledger prompts for approval
- Approve on device
- Verify transaction broadcasts

## Known Limitations
- Requires Ledger Tron app to be installed and open
- User must approve address display on device for first use
- Transaction signing requires device confirmation

## Troubleshooting

### "Wrong App" Error
- Ensure Tron app is open on Ledger device
- Check SLIP44 mapping includes 195: "Tron"

### Address Derivation Fails
- Verify BIP44 path: `m/44'/195'/0'/0/0`
- Check hw-app-trx is properly installed
- Confirm Ledger transport is connected

### Signature Invalid
- Ensure rawDataHex format is correct
- Verify signature format matches expected (65 bytes)
- Check serialization: rawDataHex + signature

## References
- [Tron Chain Adapter](/packages/chain-adapters/src/tron/TronChainAdapter.ts)
- [Tron Account Discovery](/src/lib/account/tron.ts)
- [Wallet Support Hook](/src/hooks/useWalletSupportsChain/useWalletSupportsChain.ts)
