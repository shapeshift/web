# WalletConnect One-Click Auth Implementation for Venice.ai

## Overview
Implementation of WalletConnect v2 one-click authentication (session_authenticate) to support Venice.ai and other dApps requiring SIWE (Sign-In with Ethereum) authentication.

**Issue**: https://github.com/shapeshift/web/issues/10763
**Author**: Alexandre Gomes & Claude
**Date**: November 4, 2025

## Problem Statement
Venice.ai sends `session_authenticate` events for one-click auth, but ShapeShift was converting these to `session_proposal`, causing:
- Two-step flow instead of one-click
- Auth events being ignored
- Venice.ai connection not working properly

## Research Findings

### Venice.ai Auth Payload (Captured from Logs)
```javascript
{
  domain: "venice.ai",
  chains: ["eip155:8453"], // Base chain
  statement: "Sign this transaction to verify your identity.",
  type: "caip122",
  nonce: "b4e69bab7ed295e2e6c7d54c751d8403d133b7ebee975179e83328901e3b7fec",
  version: "1",
  iat: "2025-11-04T00:26:49.630Z",
  resources: [
    "urn:recap:..." // Base64-encoded permissions
  ]
}
```

### ReCaps Permissions Requested
Venice.ai requests permissions for:
- `eth_accounts`, `eth_requestAccounts`
- `eth_sendTransaction`, `eth_signTransaction`
- `personal_sign`, `eth_sign`
- `eth_signTypedData` variants
- `wallet_addEthereumChain`, `wallet_switchEthereumChain`
- Various other wallet methods

### CACAO Structure Required
```typescript
{
  h: { t: "caip122" },           // Header
  p: { /* auth payload */ },     // Payload
  s: { t: "eip191", s: "0x..." } // Signature
}
```

## Implementation Progress

### ✅ Phase 1: Remove URI Transformation
**Status**: COMPLETED
**Files Modified**:
1. `/src/plugins/walletConnectToDapps/components/modals/connect/Connect.tsx`
   - Removed `.replace('sessionAuthenticate', 'sessionProposal')` on line 35
   - Now passes URI directly to pair function

2. `/src/plugins/walletConnectToDapps/hooks/useWalletConnectDeepLink.ts`
   - Removed same transformation on line 104
   - URI now processed as-is

**Result**: Auth events will no longer be converted to proposal events

### ✅ Phase 2: Update Types
**Status**: COMPLETED
**Files Modified**:
1. `/src/plugins/walletConnectToDapps/types.ts`
   - Added `SessionAuthenticateConfirmation` to `WalletConnectModal` enum (line 102)
   - Auth request data structure already existed in `ModalData` (line 37)

### ✅ Phase 3: Implement Auth Handler
**Status**: COMPLETED
**Files Modified**:
1. `/src/plugins/walletConnectToDapps/eventsManager/useWalletConnectEventsHandler.ts`
   - Implemented `handleAuthRequest` function (lines 46-63)
   - Now dispatches modal with auth data

### ✅ Phase 4: Create Auth Modal
**Status**: COMPLETED
**Files Created**:
1. `/src/plugins/walletConnectToDapps/components/modals/SessionAuthenticateConfirmation.tsx`
   - Displays SIWE message with proper formatting
   - Account selection for requested chains
   - Shows permissions from ReCaps
   - Approve/reject functionality with CACAO building

### ✅ Phase 5: Wire Modal Manager
**Status**: COMPLETED
**Files Modified**:
1. `/src/plugins/walletConnectToDapps/WalletConnectModalManager.tsx`
   - Added import for SessionAuthenticateConfirmation (line 20)
   - Added case for SessionAuthenticateConfirmation modal (lines 190-197)

### ✅ Phase 6: SIWE Utilities
**Status**: COMPLETED
**Files Created**:
1. `/src/plugins/walletConnectToDapps/utils/siwe.ts`
   - Parse SIWE messages into structured format
   - Format ReCaps for human-readable display
   - Extract permissions and chain information
   - Build issuer strings for CACAO

## Key Implementation Details

### Required Imports
```typescript
import { buildAuthObject, populateAuthPayload } from '@walletconnect/utils'
import type { AuthTypes } from '@walletconnect/types'
```

### Auth Approval Flow
1. Receive `session_authenticate` event
2. Populate auth payload with wallet capabilities
3. Show modal to user with SIWE message
4. User selects account and approves
5. Sign SIWE message with selected account
6. Build CACAO object with signature
7. Call `approveSessionAuthenticate()` with CACAO
8. Handle session creation if returned

### Critical Functions
- `walletKit.formatAuthMessage()` - Format SIWE for display
- `buildAuthObject()` - Create CACAO from signature
- `approveSessionAuthenticate()` - Send auth response
- `rejectSessionAuthenticate()` - Reject auth request

## Implementation Summary

### What Was Implemented
We successfully implemented WalletConnect one-click authentication support for Venice.ai by:

1. **Removed URI transformations** that were converting `sessionAuthenticate` to `sessionProposal`
2. **Added proper auth event handling** with a dedicated handler that dispatches the auth modal
3. **Created SIWE utilities** for parsing and formatting Sign-In with Ethereum messages
4. **Built SessionAuthenticateConfirmation modal** that:
   - Displays the SIWE message clearly
   - Shows requested permissions from ReCaps
   - Allows account selection
   - Builds and signs CACAO objects
   - Approves/rejects authentication requests
5. **Wired everything together** in the modal manager

### Key Files Changed/Created
- **Modified**: `Connect.tsx`, `useWalletConnectDeepLink.ts`, `types.ts`, `useWalletConnectEventsHandler.ts`, `WalletConnectModalManager.tsx`
- **Created**: `SessionAuthenticateConfirmation.tsx`, `siwe.ts`

## Testing Instructions

### To Test with Venice.ai:
1. Ensure development server is running (`yarn dev`)
2. Navigate to Venice.ai
3. Click connect wallet and select WalletConnect
4. Copy the WalletConnect URI or scan QR code
5. You should now see:
   - Auth modal opens (not proposal modal)
   - SIWE message displayed
   - Account selection for Base chain
   - Permissions shown from ReCaps
6. Click "Sign Message" to approve
7. Verify Venice.ai accepts the authentication

## Testing Checklist
- [x] URI transformation removed - auth events pass through
- [x] Auth handler dispatches modal correctly
- [x] Modal displays SIWE message
- [x] Account selection implemented (now uses wallet accounts for chain)
- [x] CACAO building logic in place
- [x] Modal UI matches standard WC modals with account display
- [x] Fixed account extraction from authPayload.chains[0]
- [ ] Venice.ai shows single auth modal (needs testing)
- [ ] Approval creates session (needs testing)
- [ ] Venice accepts authentication (needs testing)
- [ ] Rejection handled gracefully (needs testing)
- [ ] No regression in regular WC flows (needs testing)

## Debug Logging Locations
Currently extensive logging in:
- `Connect.tsx` - URI processing
- `useWalletConnectDeepLink.ts` - Deep link handling
- `useWalletConnectEventsHandler.ts` - Event processing
- `useWalletConnectEventsManager.ts` - Event registration

**Note**: Clean up debug logs after implementation is verified working

## Latest Fixes (November 4, 2025 - Session 2)

### Session 3 Updates ✨

#### Fixed "Cannot read properties of undefined" Error
**Problem**: WalletConnect SDK was calling `.toLowerCase()` on undefined

**Solution**: Added `iss` field to the CACAO payload itself
```javascript
const cacaoPayload = {
  ...authPayload,
  iss: "did:pkh:eip155:8453:0x5daf..." // Required field!
}
```

#### Session Management After Auth
**Problem**: Venice.ai connected but didn't show in dApps list

**Solution**: Handle the session response from `approveSessionAuthenticate()`
- Capture the returned session object
- Dispatch `ADD_SESSION` action to update state
- This makes the dApp appear in connected list

## Latest Fixes (November 4, 2025 - Session 2)

### Account Selection Fix
**Problem**: The Sign Message button was disabled because `accountId` was undefined.

**Root Cause**:
- `useWalletConnectState` hook expects `modalData.requestEvent.params.chainId`
- Auth requests have `modalData.request.params.authPayload.chains[0]` instead
- Without chainId, account matching failed

**Solution**:
1. Extract chainId directly from `authPayload.chains[0]` in the modal
2. Use `selectAccountIdsByChainIdFilter` to get wallet accounts for that chain
3. Don't rely on connected accounts (no session exists yet for auth)

### UI Enhancement
**Problem**: Modal didn't match standard WC modal appearance

**Solution**:
1. Added `WalletConnectFooter` wrapper
2. Implemented account display section with:
   - Network icon
   - "Signing with" label
   - User address (truncated)
   - Fiat and crypto balances
3. Matched button styling (size='lg', proper colors)
4. Shows "No Account Available" when no account found

### Code Changes
- Removed dependency on `extractAllConnectedAccounts` (for sessions)
- Added `selectAccountIdsByChainIdFilter` to get wallet accounts
- Enhanced UI with standard WC components
- Properly parse CAIP-2 chain ID format ("eip155:8453" → chainId)

## Next Steps
1. Test with Venice.ai
2. Clean up logging
3. Add multi-account selection if needed
4. Submit PR

## References
- [WalletConnect Docs - One-Click Auth](https://docs.walletconnect.com/advanced/multichain/one-click-auth)
- [EIP-4361 - Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [CAIP-122 - Sign-In with X](https://chainagnostic.org/CAIPs/caip-122)
- [ReCap - Capability Delegation](https://eips.ethereum.org/EIPS/eip-5573)