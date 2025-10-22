# WalletConnect v2 Implementation

Comprehensive documentation for WalletConnect v2 integration in ShapeShift, including the direct connection feature.

**Last Updated**: October 22, 2025

## Table of Contents
- [WalletConnect Protocol](#walletconnect-protocol)
- [App Implementation](#app-implementation)
- [Direct Connection Feature](#direct-connection-feature)
- [Adding New Wallets](#adding-new-wallets)

## WalletConnect Protocol

### Architecture
WalletConnect v2 uses a relay server to broker encrypted communication:

```
DApp → WalletConnect SDK → Relay Server ← Wallet App
```

1. DApp initiates connection via `@walletconnect/ethereum-provider`
2. SDK generates connection URI containing topic, relay URL, and encryption key
3. Wallet receives URI via QR code or deep link
4. Relay server facilitates encrypted WebSocket communication

### Connection URI Format
```
wc:94caa59c77dae0dd234b5818fb7292540d017b27d41f7f387ee75b22b9738c94@2?relay-protocol=irn&symKey=...
```

### Key Insight: Modal is Optional
The WalletConnect modal is **purely UI**. The protocol works with `showQrModal: false` - you just need to handle the `display_uri` event yourself.

## App Implementation

### File Structure
```
src/context/WalletProvider/WalletConnectV2/
├── README.md                           # This file
├── config.ts                           # Provider configs
├── constants.ts                        # Wallet configs, types
├── useDirectConnect.ts                 # Direct connection hook
├── useWalletConnectV2EventHandler.ts  # Provider event handlers
└── components/
    ├── Connect.tsx                     # Standard modal flow
    └── WalletConnectDirectRow.tsx      # Direct connection buttons
```

### Configuration Files

**config.ts** - Two provider configurations:
- `walletConnectV2ProviderConfig` - Standard flow with modal
- `walletConnectV2DirectProviderConfig` - Direct connection without modal

**constants.ts** - Wallet configurations:
- `WalletConnectWalletId` type - Union of supported wallets
- `WALLET_CONFIGS` - Wallet metadata (names, icons)
- `EthereumProviderOptions` type - Provider config types

### State Management

**Provider State** (`SET_WCV2_PROVIDER`):
Stores the `EthereumProvider` instance for event handling and session management.

**Connection State**:
- `SET_WALLET` - HDWallet instance and metadata
- `SET_IS_CONNECTED` - Connection status
- `SET_WALLET_MODAL` - Modal visibility

**Local Storage**:
Persists wallet selection via `localWallet.setLocalWallet()`

### HDWallet Abstraction
All wallets are wrapped in `WalletConnectV2HDWallet` from `@shapeshiftoss/hdwallet-walletconnectv2`, providing a consistent interface for:
- Transaction signing
- Message signing
- Network switching
- Account management

## Direct Connection Feature

### Overview
Bypass the WalletConnect modal and open specific wallets directly via deep links.

**Feature Flag**: `VITE_FEATURE_WC_DIRECT_CONNECTION`
- OFF in production
- ON in development environments (gome, develop, etc.)

### How It Works

#### The Escape Hatch
```typescript
// Create provider without modal
const provider = await EthereumProvider.init({
  ...walletConnectV2DirectProviderConfig,  // showQrModal: false
})

// Intercept URI and build custom deep link
provider.on('display_uri', (uri: string) => {
  const deepLink = `${walletId}://wc?uri=${encodeURIComponent(uri)}`
  window.open(deepLink, '_blank')
})

// Wait for connection (promise survives app switch!)
await provider.enable()

// Register wallet in app state
await setWallet(provider, dispatch, localWallet)
```

#### Deep Link Pattern
All WalletConnect wallets follow: `{scheme}://wc?uri={encodedURI}`

Examples:
- MetaMask: `metamask://wc?uri=...`
- Trust: `trust://wc?uri=...`
- Zerion: `zerion://wc?uri=...`

**Implementation**: Since wallet IDs match their schemes, we build deep links directly without a lookup table.

#### Mobile Flow
1. User clicks wallet button
2. Deep link opens wallet app (browser shows "Open in [Wallet]?" popup)
3. User approves in wallet app
4. Browser returns to web app
5. `provider.enable()` promise resolves (survives app switch!)
6. Connection registered, modal closes

### Key Files

**useDirectConnect.ts** - Core logic:
- `connect(walletId)` - Main connection function
- `openDeepLink()` - Builds and opens deep link
- `setWallet()` - Registers connection in app state

**WalletConnectDirectRow.tsx** - UI component:
- Renders horizontal row of wallet buttons
- Per-button loading states
- Only shown when `WcDirectConnection` flag is enabled

**constants.ts** - Configuration:
- `WalletConnectWalletId` - Wallet ID union type
- `WALLET_CONFIGS` - Wallet metadata (names, icons)

### Icons
Icons are bundled as static assets (not fetched at runtime):
- **MetaMask**: SVG component (`MetaMaskIcon`)
- **Trust**: `src/assets/trust-wallet.png`
- **Zerion**: `src/assets/zerion-wallet.png`

## Adding New Wallets

### Step 1: Find Wallet Metadata
Use WalletConnect Explorer API:
```bash
curl "https://explorer-api.walletconnect.com/v3/wallets?projectId=YOUR_PROJECT_ID&search=rainbow"
```

Response includes:
- `image_id` - For downloading the icon
- `mobile.native` - Deep link scheme (e.g., `rainbow://`)
- `name` - Official wallet name

### Step 2: Download Icon
```bash
curl "https://explorer-api.walletconnect.com/v3/logo/md/{image_id}?projectId=YOUR_PROJECT_ID" \
  -o src/assets/rainbow-wallet.png
```

### Step 3: Update Code

**constants.ts:**
```typescript
// Add to type
export type WalletConnectWalletId = 'metamask' | 'trust' | 'zerion' | 'rainbow'

// Import icon
import RainbowWalletIcon from '@/assets/rainbow-wallet.png'

// Add to configs
export const WALLET_CONFIGS: WalletConfig[] = [
  // ... existing wallets
  {
    id: 'rainbow',
    name: 'Rainbow',
    imageUrl: RainbowWalletIcon,
  },
]
```

**Note**: Deep link is built automatically from wallet ID: `rainbow://wc?uri={uri}`

### Step 4: Test
- Deploy to proper domain (WalletConnect rejects localhost)
- Test on mobile web (iOS Safari, Android Chrome)
- Verify deep link opens wallet app
- Verify connection completes and modal closes

## Environment Requirements

**IMPORTANT**: WalletConnect only works on proper domains, not localhost.

- ✅ Works: `*.shapeshift.com` (gome, app, private, etc.)
- ❌ Fails: `localhost`, `192.168.x.x`, local IPs

This applies to both standard modal and direct connection flows.

## Resources

### Official Documentation
- [WalletConnect v2 Docs](https://docs.walletconnect.com/)
- [WalletConnect Explorer API](https://explorer-api.walletconnect.com/)

### Related Code
- `@shapeshiftoss/hdwallet-walletconnectv2` - HDWallet adapter
- `src/context/WalletProvider/actions.ts` - Wallet state actions
- `src/state/slices/preferencesSlice/` - Feature flags
