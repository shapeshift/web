# Seeker Wallet Integration - POC Summary

## Overview

This document summarizes the Proof of Concept (POC) for integrating Solana Mobile's Seeker wallet into the ShapeShift application.

## Two Integration Approaches

We've implemented **two complementary approaches** for maximum compatibility:

### Approach 1: Wallet Standard (Primary - Recommended)

Uses `@solana-mobile/wallet-standard-mobile` to register MWA as a standard wallet option.

**How it works:**
```typescript
// In index.tsx at app startup
import { registerMwa } from '@solana-mobile/wallet-standard-mobile';

registerMwa({
  appIdentity: {
    name: 'ShapeShift',
    uri: 'https://app.shapeshift.com',
    icon: '/favicon.ico',
  },
  chains: ['solana:mainnet'],
});
```

**Pros:**
- Simple integration via standard Wallet Standard interface
- Works with existing Solana wallet adapter patterns
- Automatically adapts to device (mobile vs desktop)
- Seeker appears alongside other wallets like Phantom

**Cons:**
- May not work in React Native WebView (needs testing)
- Only tested on Android Chrome browser
- Does not work on iOS

**Reference:** [Solana Mobile Docs - Web Installation](https://docs.solanamobile.com/mobile-wallet-adapter/web-installation)

### Approach 2: postMessage via Mobile App (Fallback)

The mobile app handles MWA at the React Native layer and communicates with the web app via `postMessage`.

**Architecture:**
```
Mobile App (React Native)
├── SeekerWalletManager.ts  ← Uses MWA directly
├── useSeekerWallet.tsx     ← Message handlers
└── MessageManager          ← Routes messages
         │
    postMessage
         │
         ▼
WebView (Web App)
├── seekerMessageHandlers.ts ← Sends messages
└── SeekerConnect.tsx        ← Custom UI
```

**Pros:**
- Guaranteed to work in React Native WebView
- Full control over MWA flow
- Works even if Wallet Standard doesn't work in WebView

**Cons:**
- More complex implementation
- Requires changes in both mobile app and web app
- Custom signing flow (not standard wallet adapter)

## Current Implementation

### Web App Files (`clonedweb`)

| File | Purpose |
|------|---------|
| `src/context/WalletProvider/Seeker/registerMwa.ts` | Wallet Standard registration |
| `src/context/WalletProvider/Seeker/seekerMessageHandlers.ts` | postMessage communication |
| `src/context/WalletProvider/Seeker/config.ts` | Wallet configuration |
| `src/context/WalletProvider/Seeker/components/Connect.tsx` | Connection UI |
| `src/context/WalletProvider/Seeker/components/Failure.tsx` | Failure UI |
| `src/components/Icons/SeekerIcon.tsx` | Wallet icon |
| `src/index.tsx` | MWA registration at startup |

### Mobile App Files (`mobile-app`)
Branch: `feat/seeker-wallet-integration`

| File | Purpose |
|------|---------|
| `src/lib/SeekerWalletManager.ts` | Core MWA integration |
| `src/lib/getSeekerWalletManager.ts` | Singleton getter |
| `src/hooks/useSeekerWallet.tsx` | Message handlers |
| `docs/SEEKER_WALLET_INTEGRATION.md` | Mobile integration docs |

## Key Technical Findings

### Mobile Wallet Adapter (MWA) Protocol

1. **MWA uses Android Intents** - Works natively on Android devices
2. **Private keys stay in Seed Vault** - App never has key access
3. **Web SDK available** - `@solana-mobile/wallet-standard-mobile` for web apps
4. **Browser support limited** - Only Android Chrome officially supported

### Wallet Standard Integration

The [Mobile Wallet Standard library](https://docs.solanamobile.com/mobile-wallet-adapter/web-installation) provides:
- Automatic wallet behavior based on device type
- Integration with `@solana/wallet-adapter` ecosystem
- Authorization caching for session persistence
- Chain selection for multi-network support

### Key Differences from Regular Mobile Wallet

| Aspect | Regular Mobile Wallet | Seeker Wallet |
|--------|----------------------|---------------|
| Key Storage | Mnemonic in expo-secure-store | Seeker's Seed Vault |
| Key Access | App has mnemonic | App NEVER has keys |
| Signing | Local with hdwallet-native | Via MWA to Seed Vault |
| Chains | Multi-chain | Solana only |
| hdwallet | Uses NativeAdapter | No hdwallet needed |

## Dependencies Added

### Web App
```json
{
  "@solana-mobile/wallet-standard-mobile": "^0.4.4"
}
```

### Mobile App
```json
{
  "@solana-mobile/mobile-wallet-adapter-protocol-web3js": "^2.1.0",
  "@solana/web3.js": "^1.95.8"
}
```

## Testing Checklist

### Wallet Standard Approach (Primary)
- [ ] Test in Android Chrome browser
- [ ] Test in React Native WebView (critical!)
- [ ] Verify Seeker appears in wallet list via Wallet Standard
- [ ] Test authorization flow
- [ ] Test transaction signing

### postMessage Approach (Fallback)
- [ ] Build mobile app with Seeker integration
- [ ] Test message handlers
- [ ] Test authorization via mobile app
- [ ] Test transaction signing via mobile app

### Environment Requirements
- Android device/emulator with MWA-compatible wallet
- OR Seeker device
- Mobile app build with seeker branch

## Next Steps

### Phase 1: Test Wallet Standard Approach
1. Build the mobile app
2. Test if `@solana-mobile/wallet-standard-mobile` works in WebView
3. If yes, use Wallet Standard approach as primary
4. If no, fall back to postMessage approach

### Phase 2: Chain Adapter Integration
1. Ensure Solana chain adapter works with Wallet Standard wallets
2. OR update chain adapter to use postMessage handlers for Seeker

### Phase 3: Production Ready
1. Add feature flag for Seeker wallet
2. Handle edge cases (user cancellation, network errors)
3. Add comprehensive error handling
4. Performance testing

## Recommendations

1. **Test Wallet Standard first** - It's simpler and may "just work" in WebView
2. **Keep postMessage as fallback** - Guaranteed to work in React Native
3. **Feature flag** - Enable/disable until fully tested
4. **Solana-only UX** - Clearly communicate this limitation in UI
