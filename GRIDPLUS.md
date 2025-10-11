# GridPlus Multi-SafeCard Support

## Feature Overview

Enable GridPlus Lattice users to manage multiple SafeCards (each with different seed/accounts) through a single physical device. Each SafeCard becomes a separate "wallet" in ShapeShift with its own portfolio.

**TL;DR:** Different walletId = accounts fetched from different SafeCard config. When user switches SafeCards physically + reconnects with different walletId in app → fresh account discovery with naturally different accounts.

## Key Concepts

### Physical vs Logical Separation
- **Physical Device**: One GridPlus Lattice device (deviceId constant across all SafeCards)
- **WalletConnect Pairing**: One connection (privKey shared across all SafeCards)
- **SafeCard**: Physical card with unique seed → different xpubs → different accounts
- **walletId**: Each SafeCard gets unique UUID → becomes unique wallet in app

### Why This Works

Different seeds produce different xpubs, so accountIds naturally differ. No special logic needed to separate SafeCard data - it's inherent in the xpub derivation path.

## State Management

### GridPlus Slice (NEW)
```typescript
{
  connection: {
    physicalDeviceId: string | null,  // Lattice device ID (constant)
    privKey: string | null,            // WalletConnect pairing (shared)
  },
  safecards: {
    byId: {
      [uuid: string]: {
        id: string,                    // UUID
        name: string,                  // User-chosen name
        verificationAddress?: string,  // ETH account 0 (for future verification)
      }
    },
    ids: string[],                     // Ordered list of UUIDs
    activeId: string | null,           // Currently selected SafeCard UUID
  }
}
```

**Actions:**
- `setConnection({ physicalDeviceId, privKey })`
- `addSafecard({ id, name, verificationAddress })`
- `setActiveSafecard(uuid)`
- `removeSafecard(uuid)`
- `clear()`

### Portfolio Slice (EXISTING)
- `wallet.byId: { [walletId]: AccountId[] }` - maps walletId to accounts
- `enabledAccountIds: { [walletId]: AccountId[] }` - enabled accounts per wallet
- `connectedWallet.id` - currently active walletId
- **Selectors automatically filter by active walletId** - this is how portfolios stay separate!

### LocalWallet Slice (EXISTING)
- `walletType: KeyManager.GridPlus`
- `deviceId: safecard-uuid` (NOT physical deviceId!)
- GridPlus-specific fields (privKey) moved to GridPlus slice

## WalletId Strategy

### Format
`gridplus:${safecard-uuid}`

### Examples
- SafeCard 1: `gridplus:abc-123-def-456`
- SafeCard 2: `gridplus:xyz-789-ghi-012`

### Per-WalletId State
Each walletId gets its own:
- Set of AccountIds (different xpubs from different SafeCard seed)
- Portfolio balances
- Enabled/disabled accounts
- Account metadata cache

## How Account Discovery Works

### Scenario: User Connects Two SafeCards

**Step 1: Connect SafeCard 1**
1. User connects with `walletId = gridplus:uuid1`
2. Account discovery runs, derives xpubs from SafeCard 1's seed
3. Accounts cached: `accountMetadata.byId[accountId] = metadata`
4. Portfolio tracks: `wallet.byId['gridplus:uuid1'] = [accountId1, accountId2, ...]`

**Step 2: Connect SafeCard 2**
1. User physically swaps to SafeCard 2, disconnects, reconnects
2. App generates `walletId = gridplus:uuid2`
3. Account discovery runs again, derives NEW xpubs from SafeCard 2's seed
4. Different xpubs → different accountIds → naturally separate from SafeCard 1
5. Portfolio tracks: `wallet.byId['gridplus:uuid2'] = [accountId3, accountId4, ...]`

**The Magic:** Portfolio selectors filter by `connectedWallet.id`, so UI only shows active SafeCard's accounts. No special filtering logic needed!

## User Flows

### 1. First-Time Connection
```
1. Click "Connect GridPlus"
2. Enter SafeCard name (default: "SafeCard 1")
3. Enter Device ID (physical Lattice ID)
4. Pair device (if needed - 8-char code from device screen)
5. App generates UUID for SafeCard
6. Store connection + SafeCard in GridPlus slice
7. Account discovery runs with walletId = gridplus:${uuid}
8. Portfolio shows accounts from inserted SafeCard
```

### 2. Reconnect with Existing SafeCards
```
1. Click "Connect GridPlus"
2. See list of existing SafeCards:

   ┌─────────────────────────────────────┐
   │  Your GridPlus SafeCards            │
   ├─────────────────────────────────────┤
   │  📇 SafeCard 1        [Reconnect]  │
   │  📇 Bitcoin Card      [Reconnect]  │
   │  📇 Trading Account   [Reconnect]  │
   │                                     │
   │  [+ Add New SafeCard]              │
   └─────────────────────────────────────┘

3. Click "Reconnect" on desired SafeCard
4. App connects with that SafeCard's UUID as walletId
5. Portfolio shows that SafeCard's accounts
```

### 3. Add New SafeCard
```
1. From SafeCard list, click "+ Add New SafeCard"
2. Enter name (default: "SafeCard N+1")
3. App generates new UUID
4. Connect with new UUID as walletId (uses existing pairing)
5. Account discovery runs, fetches accounts from currently inserted SafeCard
6. Portfolio shows new SafeCard's accounts
```

### 4. Delete SafeCard
```
1. User removes SafeCard from list (future UI)
2. Remove from gridplusSlice.safecards.byId
3. Call portfolioSlice.actions.clearWalletPortfolioState(walletId)
4. Physical connection preserved (don't clear deviceId/privKey from connection)
```

## Implementation Details

### Keyring Storage Pattern
- Keyring stores wallet instances by **physical deviceId** (unchanged)
- When reconnecting: `keyring.get(physicalDeviceId)` → get wallet instance
- Then set walletId to SafeCard UUID in WalletProvider
- This decouples physical device from logical wallet identity

### Verification (Future Phase)
- Store ETH account 0 address per SafeCard on first pairing
- On reconnect, derive account 0 again and compare
- If mismatch → wrong SafeCard inserted, show error
- **Phase 1:** Store verification address but don't check (implement storage)
- **Phase 2:** Implement verification check with error handling

### Migration Strategy
- No migration needed - feature not live yet
- Existing GridPlus users will reconnect fresh
- Old localStorage data ignored
- User will clear their cache before testing

## Files

### New Files
- `src/state/slices/gridplusSlice/gridplusSlice.ts` - Slice definition
- `src/state/slices/gridplusSlice/selectors.ts` - Selectors
- `src/state/slices/gridplusSlice/types.ts` - Type definitions
- `src/context/WalletProvider/GridPlus/components/SafeCardList.tsx` - SafeCard list UI

### Modified Files
- `src/state/reducer.ts` - Add gridplus reducer + persist config
- `src/state/store.ts` - Add to clearState()
- `src/context/WalletProvider/GridPlus/components/Connect.tsx` - Add name input, update flow
- `src/context/WalletProvider/WalletProvider.tsx` - Update GridPlus reconnect case

## Current Status

### Implementation Progress (feat_gridplus branch)
- ✅ GridPlus connection working (single SafeCard)
- ✅ Message signing via WalletConnect
- ✅ Account discovery with caching optimization
- ✅ Process.nextTick polyfill
- ✅ Debug logs removed
- 🔄 Multi-SafeCard support (current work)

### Next Steps
1. ✅ Create documentation (CLAUDE.md + GRIDPLUS.md)
2. 🔄 Create GridPlus slice
3. Update connection flow with SafeCard name input
4. Build SafeCard list UI
5. Update WalletProvider reconnect logic
6. Test all flows

## Technical References

### Related Files
- HDWallet implementation: `../shapeshiftHdWallet/packages/hdwallet-gridplus/src/gridplus.ts`
- GridPlus transport: `../shapeshiftHdWallet/packages/hdwallet-gridplus/src/transport.ts`
- GridPlus adapter: `../shapeshiftHdWallet/packages/hdwallet-gridplus/src/adapter.ts`

### External Resources
- GridPlus SDK: `gridplus-sdk` npm package (v3.2.0)
- GridPlus docs: https://gridplus.github.io/
- Frame reference implementation (if available locally)

## Testing Scenarios

1. **Fresh user:** Connect first SafeCard, verify account discovery
2. **Add second SafeCard:** Different accounts appear
3. **Reconnect:** Select SafeCard from list, correct portfolio loads
4. **Page refresh:** Auto-reconnect to last active SafeCard
5. **Delete SafeCard:** Remove from list, portfolio data cleared
6. **Switch SafeCards:** Different portfolios display correctly
