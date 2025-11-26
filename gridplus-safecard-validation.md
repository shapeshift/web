# GridPlus SafeCard Validation

## Problem

Previously, ShapeShift operated on a "trust me bro" basis when handling GridPlus SafeCards. The app would:
- Store SafeCards using app-generated UUIDs only
- Never validate which physical SafeCard was actually inserted
- Allow users to connect the wrong SafeCard without detection
- Proceed with signing transactions without verifying the correct card was present

This could lead to confusing UX where users might accidentally use the wrong wallet or end up in weird app states.

## Solution

Implement hardware-based wallet UID validation at three critical points:

### 1. Initial Pairing
When a user first pairs a SafeCard, we now:
- Fetch the hardware wallet UID from the device (32-byte identifier from firmware)
- Store this UID alongside the user's SafeCard in Redux state
- Use this UID as the source of truth for that SafeCard

### 2. Reconnection
When the app loads and finds a GridPlus wallet from a previous session, we now:
- Validate that the inserted SafeCard's UID matches the expected stored UID
- Reject the connection if the wrong SafeCard is inserted
- Provide clear error messages to guide users to insert the correct card

### 3. Just-In-Time (JIT) Signing Validation
Before every signing operation (transaction, message, typed data), we now:
- Re-validate that the correct SafeCard is still inserted
- Prevent signing if the SafeCard was swapped after connection
- Support all chains: Ethereum, Bitcoin, Solana, Cosmos, Thorchain, Mayachain

## Implementation

### hdwallet Package Changes (shapeshift/hdwallet)
Added to `GridPlusHDWallet` class:
- `setExpectedWalletUid(walletUid: string)`: Configure expected UID for validation
- `validateActiveWallet(expectedUid?: string)`: Fetch current wallet UID and validate
- Private `validateBeforeSigning()`: Called before all signing methods

### Web Changes (shapeshift/web)
- **WalletProvider reconnection**: Validates SafeCard on app load
- **finalizeWalletSetup**: Sets expected UID after connection for JIT validation
- **GridPlus utils**: Wire up validation through connection flow
- **Redux state**: Store `walletUid` and `isExternal` flag per SafeCard

## User Experience

Users will now see clear feedback when:
- They try to reconnect with the wrong SafeCard inserted
- They swap SafeCards after connecting but before signing
- Legacy SafeCards without stored UIDs (requires cache clear to use)

This ensures the app state always matches the physical hardware, preventing confusion and improving overall UX.

## Migration

No data migration provided. Users with existing SafeCards will need to clear their cache and re-pair their devices. This is a one-time operation that establishes the UID mapping for future sessions.
