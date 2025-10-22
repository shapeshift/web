# WalletConnect Direct Connection (UGLY POC)

## Overview

This document describes the "UGLY POC" (Proof of Concept) feature that enables direct WalletConnect connections to specific wallets without showing the standard WalletConnect modal. This was implemented as a spike to explore programmatic wallet selection.

**Last Updated**: October 22, 2025
**Status**: Working on remote environments (not localhost)
**Wallets Supported**: MetaMask, Trust Wallet, Zerion

## Background & Motivation

### The Problem
The standard WalletConnect flow shows a modal with all available wallets, requiring users to manually select their wallet each time. For users who consistently use the same wallet (e.g., MetaMask, Trust Wallet), this adds friction to the connection process.

### The Goal
Create a proof of concept that demonstrates:
1. **Bypassing the WalletConnect modal** - Connect directly to specific wallets
2. **Maintaining WalletConnect protocol** - Use real WalletConnect v2, not workarounds
3. **Mobile deep linking** - Properly handle mobile app deep links
4. **Clean UX** - Separate loading states, auto-close modal on success

## How WalletConnect Works

### Architecture
WalletConnect v2 uses a relay server architecture:

```
DApp → WalletConnect SDK → Relay Server ← Wallet App
```

1. **DApp** initiates connection via WalletConnect SDK
2. **SDK** generates a connection URI containing:
   - Topic (session identifier)
   - Relay server URL
   - Encryption key (symKey)
3. **Wallet App** receives URI via QR code or deep link
4. **Relay Server** facilitates encrypted communication

### Connection URI Format
```
wc:94caa59c77dae0dd234b5818fb7292540d017b27d41f7f387ee75b22b9738c94@2?relay-protocol=irn&symKey=...
```

### The Modal's Role
The WalletConnect modal is **purely UI** - it:
- Displays the QR code containing the URI
- Shows a list of supported wallets
- Constructs deep links for mobile wallets
- The actual connection happens through the relay server

## The Hack: How It Actually Works

### Key Discovery
**The modal can be bypassed!** This entire feature is essentially a clever hack to skip the WalletConnect modal while maintaining a fully functional WalletConnect connection.

### The Magic Explained

#### 1. Every Wallet Has WalletConnect Deep Link Support
All wallets that support WalletConnect provide a deep link format that accepts WalletConnect URIs:
- **Custom schemes**: `metamask://wc?uri=` or `zerion://wc?uri=`
- **Universal links**: `https://link.trustwallet.com/wc?uri=`

These variations ultimately do the same thing: open the wallet app with the connection URI.

#### 2. The WalletConnect Adapter Does (Almost) Nothing
This was the big revelation. The WalletConnect adapter's ONLY job is to:
- Trigger the modal
- That's it

The adapter itself is just a thin wrapper. The real work happens in:
- `EthereumProvider` from `@walletconnect/ethereum-provider`
- WalletConnect's relay server infrastructure

#### 3. The Relay Server Does The Heavy Lifting
When we instantiate an `EthereumProvider`:

```typescript
const provider = await EthProvider.init({
  ...walletConnectV2ProviderConfig,
  showQrModal: false,  // ← The magic flag
})
```

The provider:
1. Connects to WalletConnect's relay servers
2. Generates a connection URI with:
   - Topic (session ID)
   - Relay server URL
   - Symmetric encryption key
3. Fires the `display_uri` event with this URI
4. Establishes a WebSocket connection to the relay

**This all happens regardless of whether the modal is shown!**

The modal is **purely UI** - it's just a fancy way to:
- Display the QR code
- Show a list of wallets
- Construct deep links

#### 4. How The App Registers The Connection

Here's what we spiked on and discovered:

**When using the modal:**
```
User clicks wallet in modal
  → Modal constructs deep link
  → Opens wallet app
  → User approves in wallet
  → Wallet sends approval to relay server
  → provider.enable() resolves
  → We wrap provider in HDWallet
  → Dispatch SET_WALLET action
  → App state: connected ✅
```

**When bypassing the modal (our hack):**
```
User clicks our UGLY button
  → We create provider with showQrModal: false
  → Listen to display_uri event
  → We construct deep link ourselves
  → Opens wallet app (same as modal would)
  → User approves in wallet
  → Wallet sends approval to relay server (same path!)
  → provider.enable() resolves (same!)
  → We wrap provider in HDWallet (same!)
  → Dispatch SET_WALLET action (same!)
  → App state: connected ✅ (identical state!)
```

**The connection registration is IDENTICAL.** We just skip the modal UI.

#### 5. Once Connected, Everything Works Normally

After the connection is established:
- **Signing transactions**: Works ✅
- **Sending transactions**: Works ✅
- **Reading wallet state**: Works ✅
- **Chain switching**: Works ✅
- **All WalletConnect functionality**: Works ✅

Why? Because we're using **real WalletConnect v2**. The only thing we bypassed was the modal UI.

### What We're Actually Doing

```
┌─────────────────────────────────────────────────────────┐
│ Standard WalletConnect Flow                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Click "Connect Wallet"                                 │
│         ↓                                               │
│  [WalletConnect Modal Opens] ← We skip this!           │
│         ↓                                               │
│  User selects wallet from list                          │
│         ↓                                               │
│  Modal constructs deep link                             │
│         ↓                                               │
│  Opens wallet app                                       │
│         ↓                                               │
│  User approves connection                               │
│         ↓                                               │
│  WebSocket established via relay                        │
│         ↓                                               │
│  App registers connection                               │
│         ↓                                               │
│  Connected! ✅                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Our Hack (Direct Connection)                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Click "UGLY POC: Connect WC MM"                        │
│         ↓                                               │
│  Create provider with showQrModal: false                │
│         ↓                                               │
│  Listen to display_uri event                            │
│         ↓                                               │
│  WE construct deep link (same format as modal)          │
│         ↓                                               │
│  Opens wallet app (identical to modal flow)             │
│         ↓                                               │
│  User approves connection (same experience)             │
│         ↓                                               │
│  WebSocket established via relay (same relay!)          │
│         ↓                                               │
│  App registers connection (identical code path!)        │
│         ↓                                               │
│  Connected! ✅ (indistinguishable from modal flow)      │
└─────────────────────────────────────────────────────────┘
```

### The Beautiful Part

**We're not hacking WalletConnect.** We're hacking around the UI.

- The protocol: ✅ Standard WalletConnect v2
- The security: ✅ Same encryption, same relay
- The connection: ✅ Same WebSocket, same flow
- The functionality: ✅ Identical capabilities

We just discovered that the modal is **optional UI**, not a required component of the protocol.

## Implementation

### Files Created

#### 1. `WalletConnectDirectButton.tsx`
Location: `src/context/WalletProvider/WalletConnectV2/components/WalletConnectDirectButton.tsx`

Renders three "UGLY" buttons for direct wallet connections:
- **MetaMask**: Red button with yellow "UGLY!" badge
- **Trust Wallet**: Blue button with lime "SUPER UGLY!" badge
- **Zerion**: Purple button with orange "FUARKIN UGLY!" badge (thick, solid, tight!)

Button Text (simplified):
- MetaMask: "METAMASK"
- Trust: "TRUST"
- Zerion: "ZERION"

Features:
- Separate loading states per wallet
- Mobile-specific pending states
- No toast notifications (removed for cleaner UX)
- Auto-detects successful connection and closes modal
- Escalating UGLY levels via rotated badges (all positioned on the right)

#### 2. `useDirectConnect.ts`
Location: `src/context/WalletProvider/WalletConnectV2/useDirectConnect.ts`

Core hook managing direct connections:

```typescript
export const useDirectWalletConnect = () => {
  const connectToWallet = async (walletId: WalletConnectWalletId) => {
    // 1. Create provider WITHOUT modal
    const provider = await EthProvider.init({
      ...walletConnectV2ProviderConfig,
      showQrModal: false,
    })

    // 2. Capture URI via display_uri event
    provider.on('display_uri', (uri: string) => {
      const deepLink = WALLET_DEEP_LINKS[walletId]
      const fullDeepLink = deepLink + encodeURIComponent(uri)

      // 3. Open deep link
      if (isMobile) {
        window.open(fullDeepLink, '_blank')
      } else {
        // Show QR for desktop
        showQRCode(uri)
      }
    })

    // 4. Let connection complete through relay
    await provider.enable()

    // 5. Wrap in HDWallet and update state
    const wallet = new WalletConnectV2HDWallet(provider)
    dispatch({ type: WalletActions.SET_WALLET, payload: wallet })
  }
}
```

### Deep Link Formats

Each wallet uses a specific deep link schema:

| Wallet | Deep Link Format | Notes |
|--------|-----------------|-------|
| MetaMask | `metamask://wc?uri={uri}` | Standard custom URL scheme |
| Trust Wallet | `trust://wc?uri={uri}` | Custom scheme (avoids webpage redirect) |
| Zerion | `zerion://wc?uri={uri}` | Standard custom URL scheme |

**Note**: Trust Wallet originally used `https://link.trustwallet.com/wc?uri={uri}` (universal link) but this caused Safari to navigate to a webpage. Changed to `trust://` custom scheme for consistent behavior.

Reference: See `WALLET_DEEP_LINKS` constant in `useDirectConnect.ts`

**Icon Sources:**
- MetaMask: Custom SVG icon component (`MetaMaskIcon`)
- Trust Wallet: WalletConnect Explorer API - `image_id: 7677b54f-3486-46e2-4e37-bf8747814f00`
- Zerion: WalletConnect Explorer API - `image_id: 73f6f52f-7862-49e7-bb85-ba93ab72cc00`

### Mobile vs Desktop Handling

**Mobile (isMobile from react-device-detect)**:
- Opens deep link: `window.open(deepLink, '_blank')`
- User navigates to wallet app
- Approves connection in wallet
- Returns to web app
- Polling detects `state.isConnected` or `provider.connected`
- Modal auto-closes

**Desktop**:
- Shows QR code (currently via `alert()` for POC)
- User scans with mobile wallet
- Connection completes
- `provider.enable()` resolves
- Modal auto-closes

## What We Learned

### About WalletConnect
1. **Modal is optional** - WalletConnect SDK works fine without `showQrModal`
2. **display_uri event** - Provides the connection URI we need for deep links
3. **Relay architecture** - Connection security doesn't rely on the modal
4. **Mobile deep links** - Each wallet has documented deep link formats

### About ShapeShift App
1. **HDWallet abstraction** - All wallets wrapped in HDWallet interface
2. **WalletProvider state** - Uses Redux-style actions (SET_WALLET, SET_IS_CONNECTED)
3. **Modal management** - SET_WALLET_MODAL action controls visibility
4. **Adapter pattern** - `getAdapter(KeyManager.WalletConnectV2)` retrieves WC adapter

### About Mobile Connection Flow
1. **Page context lost** - Using `window.location.href` for deep links loses JavaScript execution
2. **window.open preferred** - Keeps page alive on most browsers
3. **Async completion** - Mobile connections resolve asynchronously
4. **Polling required** - Check `state.isConnected` to detect when user returns

### Environment Issues
1. **Local IP fails** - WalletConnect relay servers reject connections from local IPs (security)
2. **Works on remote** - Must deploy to proper domain (e.g., `*.shapeshift.com`)
3. **Both flows affected** - Regular modal AND direct connection need proper environment

## UX Improvements Made

### Before
- Shared loading state (both buttons loading at once)
- Modal stayed open after connection
- Toast notifications cluttered the UI
- Wrong wallet names in messages
- Janky, unpolished feel

### After
- **Separate loading states** - Only clicked button shows loading
- **Auto-close modal** - Modal closes automatically on successful connection
- **No toast spam** - Removed all toast notifications
- **Correct button states** - Each button tracks its own pending/loading state
- **Clean experience** - Smooth, polished connection flow

## Adding New Wallets

To add a new wallet (e.g., Rainbow), follow these steps:

### Step 1: Find Wallet Info Using WalletConnect Explorer API

Use the WalletConnect Explorer API to find wallet metadata including deep link format and icon:

```bash
# Search for the wallet
curl "https://explorer-api.walletconnect.com/v3/wallets?projectId=YOUR_PROJECT_ID&search=rainbow"
```

Replace `YOUR_PROJECT_ID` with your WalletConnect project ID from `.env` (`VITE_WALLET_CONNECT_WALLET_PROJECT_ID`).

The API response will include:
- `image_id` - For fetching the wallet's icon
- `mobile.native` - The deep link URI scheme (e.g., `rainbow://`)
- `mobile.universal` - Universal link format (if available)
- `name` - Official wallet name

**Example response structure:**
```json
{
  "listings": {
    "some-id": {
      "id": "some-id",
      "name": "Rainbow",
      "image_id": "abcd-1234-efgh-5678",
      "mobile": {
        "native": "rainbow://",
        "universal": "https://rainbow.me"
      }
    }
  }
}
```

**Icon URL format:**
```
https://explorer-api.walletconnect.com/v3/logo/md/{image_id}?projectId={YOUR_PROJECT_ID}
```

### Step 2: Update Type Definition

```typescript
// useDirectConnect.ts
type WalletConnectWalletId = 'metamask' | 'trust' | 'zerion' | 'rainbow'
```

### Step 3: Add Deep Link

```typescript
// useDirectConnect.ts
const WALLET_DEEP_LINKS: Record<WalletConnectWalletId, string> = {
  metamask: 'metamask://wc?uri=',
  trust: 'trust://wc?uri=',
  zerion: 'zerion://wc?uri=',
  rainbow: 'rainbow://wc?uri=', // ← Add new wallet
}
```

**Note:** Use the `mobile.native` scheme + `wc?uri=` suffix. For example, if the API returns `"native": "rainbow://"`, the deep link becomes `rainbow://wc?uri=`.

### Step 4: Add Wallet Config

```typescript
// WalletConnectDirectButton.tsx - Add to WALLET_CONFIGS array
{
  id: 'rainbow',
  name: 'Rainbow',
  imageId: 'abcd-1234-efgh-5678', // ← From API response
}
```

### Step 5: Add Click Handler

```typescript
// WalletConnectDirectButton.tsx
const handleRainbowClick = useCallback(
  () => handleDirectConnect('rainbow'),
  [handleDirectConnect],
)
```

### Step 6: Test

- Test on proper domain (not localhost)
- Test on mobile web
- Test on mobile app (via deep link)
- Verify modal closes automatically
- Verify icon loads correctly from WalletConnect API

## Technical Decisions

### Why react-device-detect isMobile?
- **Covers both cases** - Detects mobile web AND mobile app
- **Not internal constant** - Uses global detection, not ShapeShift's `isMobileApp`
- **Standard library** - Well-maintained, works across platforms

### Why Separate Loading States?
- **Better UX** - User knows which wallet is connecting
- **Prevents confusion** - Don't show all buttons as loading
- **TypeScript safety** - Type-safe wallet tracking via union type

### Why Remove Toasts?
- **Reduces noise** - Button state is sufficient feedback
- **Cleaner UI** - No popup notifications interrupting flow
- **Mobile friendly** - Toasts can obscure content on small screens

## Future Improvements

### If Moving to Production
1. **Remove "UGLY" branding** - Normal button styling
2. **Proper QR modal** - Replace `alert()` with actual QR code component
3. **Error handling** - Better error messages and recovery
4. **Wallet detection** - Only show installed wallets
5. **Remember preference** - Save user's preferred wallet
6. **Analytics** - Track which wallets users connect with

### Possible Enhancements
- Support more wallets (Rainbow, Coinbase Wallet, etc.)
- Desktop deep linking (for installed desktop apps)
- Fallback to modal if direct connection fails
- "Connect with [Wallet]" buttons in main UI
- Faster connection via cached sessions

## Testing Checklist

When testing this feature:

- [ ] Deploy to proper domain (not localhost)
- [ ] Test MetaMask on mobile web
- [ ] Test MetaMask on mobile app
- [ ] Test Trust Wallet on mobile web
- [ ] Test Trust Wallet on mobile app
- [ ] Test Zerion on mobile web
- [ ] Test Zerion on mobile app
- [ ] Verify modal auto-closes on success
- [ ] Verify only clicked button shows loading
- [ ] Verify connection persists after page reload
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test desktop QR code flow

## Resources

### Official Documentation
- [WalletConnect v2 Docs](https://docs.walletconnect.com/)
- [Trust Wallet Deep Linking](https://developer.trustwallet.com/developer/develop-for-trust/deeplinking)
- [Zerion Developer Docs](https://developers.zerion.io/reference/initiate-a-connection-from-dapp-to-zerion-wallet)

### Related Code
- `src/context/WalletProvider/WalletConnectV2/config.ts` - WalletConnect config
- `packages/hdwallet-walletconnectV2/` - HDWallet adapter implementation
- `src/context/WalletProvider/actions.ts` - Wallet state actions

## Implementation Journey & Issues Fixed

### Session 1: Initial Discovery (Opus)
- Discovered that WalletConnect modal can be bypassed with `showQrModal: false`
- Found the `display_uri` event that provides the connection URI
- Implemented first version with deep links
- Issue: Mobile connections were hanging because `provider.enable()` never resolved when navigating away

### Session 2: Polish & UX Improvements (Sonnet)
**Issues Fixed:**

1. **Shared Loading States**
   - Problem: All buttons showed loading when any was clicked
   - Solution: Individual `loadingWallet` state tracking per button

2. **No Modal Auto-Close**
   - Initial approach: Close modal immediately after setting wallet state
   - Problem: Modal closed before deep link even opened
   - Fixed approach: Removed all manual closes, let parent handle it
   - Final approach: Close modal only when connection is actually detected

3. **Toast Spam**
   - Removed all 🚨 toast notifications for cleaner UX
   - Button states provide sufficient feedback

4. **Added Zerion Support**
   - Added third UGLY button with purple/orange color scheme
   - Deep link: `zerion://wc?uri=`

5. **Trust Wallet Redirect Issue**
   - Problem: Using `https://link.trustwallet.com/wc?uri=` caused webpage redirect
   - Solution: Changed to `trust://wc?uri=` custom scheme
   - Result: Shows Safari popup instead of navigating to Trust website

6. **Loading State Persistence**
   - Problem: Loading state dropped after 1-2 seconds (when deep link opened)
   - Solution: Maintain `loadingWallet` state until connection actually completes or times out
   - Added polling with 60-second timeout

7. **Type Naming Conflict**
   - Changed `WalletId` to `WalletConnectWalletId` to avoid confusion with existing app terminology

8. **Button Text & Badge Styling (Final Polish)**
   - Simplified button text: Removed "POC: Connect WC" prefix, just show wallet names
   - Buttons now display: "METAMASK", "TRUST", "ZERION"
   - Badges maintain UGLY hierarchy: "UGLY!", "SUPER UGLY!", "FUARKIN UGLY!"
   - Fixed badge positioning: All badges on the right side with consistent rotation
   - Updated to proper terminology: "FUARKIN" means thick, solid, tight (trust me bro)
   - Attempted spinning animation: Tried keyframes animation but removed (didn't work, fuark it)

### Current Behavior

**Mobile Flow:**
1. User clicks UGLY button → Loading state begins
2. Deep link opens wallet app → Loading continues
3. User approves in wallet app
4. User returns to web app
5. Polling detects connection → Modal closes, loading stops

**Desktop Flow:**
1. User clicks UGLY button → Alert shows QR code
2. User scans with mobile wallet
3. Connection completes → Modal closes

### Environment Considerations

**IMPORTANT**: This feature only works on remote environments, not localhost!
- WalletConnect relay servers reject connections from local IPs for security
- Must deploy to proper domain (e.g., `*.shapeshift.com`)
- Both regular modal and direct connection need proper environment

## Credits

This UGLY feature was developed through pair programming sessions with Claude (Opus and Sonnet), exploring WalletConnect's internals and discovering that programmatic wallet selection is possible without custom backend infrastructure.

Key insight: **The modal is just UI. The protocol works without it. UGLY but functional!**
