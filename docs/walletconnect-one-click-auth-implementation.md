# WalletConnect One-Click Auth Implementation

## Problem
Venice.ai and other dApps use WalletConnect v2's `session_authenticate` for one-click authentication, combining session creation and SIWE (Sign-In with Ethereum) in a single step. ShapeShift was replacing these URIs with `session_proposal`, breaking the flow.

## Solution
Implemented full support for `session_authenticate` events:

1. **New modal component** - `SessionAuthenticateConfirmation.tsx` handles the auth request
2. **Event routing** - Listen for `session_authenticate` events and route to new modal
3. **CACAO signing** - Build Chain Agnostic Capability Objects with DID:PKH identifiers
4. **Reuse existing UI** - Leverage `SessionProposalOverview` for consistent experience

## Implementation

### Key Files
```
src/plugins/walletConnectToDapps/
├── components/modals/
│   ├── SessionAuthenticateConfirmation.tsx  # Main modal
│   └── SessionAuthRoutes.ts                 # Route definitions
├── utils/
│   └── SessionAuthRequestHandlerUtil.ts     # Auth logic & CACAO
├── eventsManager/
│   └── useWalletConnectEventsHandler.ts     # Event routing
└── WalletConnectModalManager.tsx            # Modal orchestration
```

### Flow
1. dApp sends `session_authenticate` with SIWE payload and requested chains
2. Modal shows SIWE message preview with account selection
3. User approves → wallet signs message and builds CACAO
4. Session established with auth in one step

### Technical Details

**CACAO Structure**:
```typescript
{
  h: { t: 'caip122' },                    // Header type
  p: { ...authPayload, iss: 'did:pkh:...' }, // Payload with issuer
  s: { t: 'eip191', s: signature }        // EIP-191 signature
}
```

**DID:PKH Format**: `did:pkh:{accountId}` where accountId is already in `chainId:address` format

### Standards
- [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) - Sign-In with Ethereum
- [CAIP-74](https://chainagnostic.org/CAIPs/caip-74) - Chain Agnostic Capability Object
- [DID:PKH](https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md) - Decentralized Identifiers

## Result
Venice.ai and other dApps using one-click auth now connect properly with full SIWE support.