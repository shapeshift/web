# WalletConnect Integration in ShapeShift

## Overview

WalletConnect is a protocol that enables secure communication between wallets and decentralized applications (DApps). [ShapeShift web](https://github.com/shapeshift/web) implements WalletConnect v2 in two distinct ways:

1. **[WalletConnect Wallet](./walletconnect-wallet.md)** - Connect ShapeShift to external wallets (MetaMask, Trust Wallet, etc.)
2. **[WalletConnect dApps](./walletconnect-dapps.md)** - Allow DApps to connect to ShapeShift

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ShapeShift Platform                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              WalletConnect Wallet                        │       │
│  │         (Connecting to External Wallets)                 │       │
│  │                                                          │       │
│  │  • Traditional QR Code Connection                        │       │
│  │  • Direct Connection (WIP - Mobile Web Only)             │       │
│  │  • Deep Links: metamask://, trust://, zerion://          │       │
│  │                                                          │       │
│  └────────────────────┬─────────────────────────────────────┘       │
│                       │                                              │
│                       ↓                                              │
│         ┌──────────────────────────────┐                           │
│         │   WalletConnect v2 Protocol   │                           │
│         │    (Encrypted WebSocket)      │                           │
│         │   relay.walletconnect.com     │                           │
│         └──────────────────────────────┘                           │
│                       ↓                                              │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              WalletConnect dApps                         │       │
│  │         (DApps Connecting to ShapeShift)                 │       │
│  │                                                          │       │
│  │  • Incoming Deep Links: /wc?uri=...                      │       │
│  │  • Session Management                                    │       │
│  │  • Transaction & Message Signing                         │       │
│  │  • Multi-chain Support (EVM + Cosmos)                    │       │
│  │                                                          │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Platform Support Matrix

| Feature | Desktop Web | Mobile Web | Native Mobile App |
|---------|------------|------------|-------------------|
| **Connect to External Wallets** | ✅ Full Support | ✅ Full Support* | ⚠️ Via WebView** |
| **QR Code Scanning** | ✅ Yes | ✅ Yes | ⚠️ Via WebView |
| **Direct Connection (WIP)** | ❌ No | 🚧 In Progress* | ❌ No |
| **DApps Connect to ShapeShift** | ✅ Yes | ✅ Yes | ⚠️ Via WebView |
| **Deep Link Support** | ❌ N/A | ✅ Yes* | ✅ Yes*** |

\* Mobile web requires deployment to `*.shapeshift.com` domain. Deep links don't work on localhost or local IP addresses.
\** Native mobile app is a WebView wrapper - all WalletConnect logic is in the web app.
\*** Native app handles `shapeshift://` and `wc://` schemes for deep link routing.

## Key Features

### 🔗 Dual Implementation
- **Two Project IDs**: Separate WalletConnect projects for wallet connections vs DApp connections
- **Bidirectional Support**: ShapeShift can both connect to wallets and accept connections from DApps
- **Unified Experience**: Seamless integration across desktop and mobile platforms

### 🚀 Recent Innovations (October 2025)

#### Direct Wallet Connection (Work in Progress)
- **Status**: WIP - [PR #10879](https://github.com/shapeshift/web/pull/10879) expected to land in [PR #10912](https://github.com/shapeshift/web/pull/10912)
- **Platform**: Initially **mobile web only** (not desktop, not native mobile app)
- **Supported Wallets**: MetaMask, Trust Wallet, Zerion (expandable)
- **Feature Flag**: `VITE_FEATURE_WC_DIRECT_CONNECTION`
- **How it Works**: Bypasses WalletConnect modal, opens wallet apps directly via deep links

### 🔒 Security Features
- **Encrypted Communication**: All data transmitted via WalletConnect relay is encrypted
- **Transaction Simulation**: Tenderly integration for transaction preview before signing
- **Session Management**: Automatic session cleanup on wallet change
- **Permission Controls**: Granular approval for connected DApps and chains

## Technical Stack

### Dependencies
- `@reown/walletkit` - Reown's WalletKit (WalletConnect v2 successor)
- `@walletconnect/core` - Core WalletConnect protocol
- `@walletconnect/ethereum-provider` - Ethereum-specific provider
- `@shapeshiftoss/hdwallet-walletconnectv2` - ShapeShift's HDWallet adapter

### Configuration
```typescript
// Environment Variables
VITE_WALLET_CONNECT_WALLET_PROJECT_ID      // For wallet connections
VITE_WALLET_CONNECT_TO_DAPPS_PROJECT_ID    // For DApp connections
VITE_WALLET_CONNECT_RELAY_URL              // Custom relay URL (optional)
VITE_FEATURE_WALLET_CONNECT_TO_DAPPS_V2    // Enable DApp connections
VITE_FEATURE_WC_DIRECT_CONNECTION          // Enable direct wallet connection
```

## Documentation

### 📱 [WalletConnect Wallet](./walletconnect-wallet.md)
Learn how ShapeShift connects to external wallets like MetaMask, Trust Wallet, and more. Covers both traditional QR code flow and the new direct connection feature.

**Topics covered:**
- Traditional WalletConnect modal with QR codes
- Direct connection to specific wallets (WIP - Mobile Web Only)
- Deep linking implementation
- Mobile vs Desktop differences
- Adding support for new wallets

### 🌐 [WalletConnect dApps](./walletconnect-dapps.md)
Understand how ShapeShift enables DApps to connect to it via WalletConnect. Covers session management, transaction signing, and multi-chain support.

**Topics covered:**
- Incoming WalletConnect URIs
- Session proposal and management
- Transaction and message signing
- Multi-chain support (EVM + Cosmos)
- Integration with wallet browsers

## Quick Start Examples

### Connecting to a Wallet
```typescript
// Traditional modal approach
const provider = await EthereumProvider.init({
  projectId: WALLET_CONNECT_PROJECT_ID,
  showQrModal: true, // Shows WalletConnect modal
  chains: [1], // Ethereum mainnet
})

// Direct connection approach (NEW)
const provider = await EthereumProvider.init({
  projectId: WALLET_CONNECT_PROJECT_ID,
  showQrModal: false, // No modal
})

provider.on('display_uri', (uri) => {
  // Open specific wallet directly
  window.open(`metamask://wc?uri=${encodeURIComponent(uri)}`, '_blank')
})

await provider.enable() // Waits for connection
```

### Accepting DApp Connection
```typescript
// Deep link format: https://app.shapeshift.com/wc?uri={encodedWalletConnectV2Uri}

// The app automatically:
// 1. Validates the WalletConnect URI
// 2. Shows session proposal modal
// 3. Allows user to approve/reject
// 4. Manages ongoing session
```

## Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 67+ | Full support |
| Firefox | 68+ | Full support |
| Safari | 14+ | Full support on iOS/macOS |
| Edge | 79+ | Full support |
| Opera | 54+ | Full support |

## Mobile App Integration

The [ShapeShift mobile app](https://github.com/shapeshift/mobile-app) (iOS/Android) is built with React Native and Expo. It uses a WebView to display the [ShapeShift web](https://github.com/shapeshift/web) application, which contains all WalletConnect logic.

### Deep Link Configuration

#### iOS (`ios/ShapeShift/Info.plist`)
```xml
<key>CFBundleURLSchemes</key>
<array>
  <string>shapeshift</string>
</array>
```

#### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<intent-filter>
  <data android:scheme="shapeshift"/>
  <data android:scheme="wc"/>
</intent-filter>
```

## Troubleshooting

### Common Issues

1. **Deep links not working on mobile**
   - Ensure you're testing on a deployed environment (`*.shapeshift.com`)
   - Local IP addresses (`192.168.x.x`) don't work with WalletConnect relay

2. **Direct connection buttons not showing**
   - Check if `VITE_FEATURE_WC_DIRECT_CONNECTION` is enabled
   - Currently only available in development environments

3. **Session not persisting**
   - Sessions are automatically cleared when switching wallets
   - Check browser's local storage for WalletConnect data

## Future Enhancements

- [ ] Detect installed wallets on mobile devices
- [ ] Automatic wallet app opening for transaction signing
- [ ] Support for more wallets in direct connection
- [ ] Native WalletConnect implementation in mobile app
- [ ] Enhanced session management UI

## Resources

- [WalletConnect v2 Documentation](https://docs.walletconnect.com/)
- [WalletConnect Explorer API](https://explorer-api.walletconnect.com/)
- [Reown WalletKit Documentation](https://docs.reown.com/walletkit/overview)
- [ShapeShift HDWallet](https://github.com/shapeshift/hdwallet)

---

*Last Updated: October 2025*