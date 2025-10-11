# GridPlus Multi-SafeCard Implementation Plan

## Overview
Enable multiple SafeCards per GridPlus device by using unique walletIds (`gridplus:${uuid}`) for each SafeCard.

## Key Insight
- **No WalletProvider changes needed** - Keyring already stores by deviceId
- **No migration needed** - New feature, users start fresh
- Each SafeCard gets `gridplus:${uuid}` as deviceId/walletId
- Portfolio automatically filters by walletId

## Implementation Steps

### 1. GridPlus Slice
- Store connection info (physicalDeviceId, privKey)
- Manage SafeCards (add, remove, rename, set active)
- Each SafeCard has UUID, name, timestamps

### 2. Connect Component
- Show SafeCard list if existing SafeCards
- Add name input for new SafeCards
- Generate `gridplus:${uuid}` as deviceId
- Store wallet in keyring with this ID

### 3. SafeCard List Component
- List existing SafeCards with connect/edit/delete
- Add new SafeCard button
- Inline rename functionality

### 4. Redux Integration
- Add gridplus slice to reducer
- Add persist config (persist everything including activeId for reconnection)
- Add to clearState function
- Remove gridplusPrivKey from localWallet slice

## Critical Code Pattern
```typescript
// The key to making it work - use SafeCard-specific walletId
const safeCardWalletId = `gridplus:${safeCardUuid}`

dispatch({
  type: WalletActions.SET_WALLET,
  payload: {
    wallet,
    deviceId: safeCardWalletId,  // THIS IS THE KEY!
    // ... other fields
  },
})
```

## Files Created/Modified

### New Files
- `src/state/slices/gridplusSlice/gridplusSlice.ts` - Redux slice for SafeCard management
- `src/state/slices/gridplusSlice/index.ts` - Barrel export
- `src/context/WalletProvider/GridPlus/components/SafeCardList.tsx` - UI component for SafeCard list
- `GRIDPLUS_IMPLEMENTATION.md` - This implementation guide

### Modified Files
- `src/state/slices/gridplusSlice/types.ts` - Added timestamps to SafeCard type
- `src/context/WalletProvider/GridPlus/components/Connect.tsx` - Complete rewrite for multi-SafeCard support
- `src/state/reducer.ts` - Added gridplus slice
- `src/state/store.ts` - Added gridplus.clear() to clearState
- `src/test/mocks/store.ts` - Added gridplus mock state
- `src/state/slices/localWalletSlice/localWalletSlice.ts` - Removed gridplusPrivKey
- `src/state/slices/localWalletSlice/selectors.ts` - Removed selectGridPlusPrivKey
- `src/context/WalletProvider/local-wallet.ts` - Removed setGridPlusPrivKey

## Testing Checklist
- [ ] First SafeCard connection
- [ ] Add second SafeCard (different accounts)
- [ ] Switch between SafeCards
- [ ] Page refresh reconnection
- [ ] Delete SafeCard
- [ ] Rename SafeCard