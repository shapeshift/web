# NEAR JS Libraries Usage Analysis

This document outlines where NEAR JS libraries could be leveraged in the ShapeShift codebase.

## Installed Packages

- `@near-js/transactions` (v2.5.1) - Transaction building and signing
- `@near-js/crypto` (v2.5.1) - Cryptographic primitives (Ed25519, key pairs)
- `@near-js/types` (v2.5.1) - TypeScript type definitions
- `@near-js/utils` (v2.5.1) - Utility functions (formatting, parsing)

## Potential Usage Locations

### 1. Chain Adapter (`packages/chain-adapters/src/near/`)

**Transaction Building:**
```typescript
import { createTransaction, signTransaction } from '@near-js/transactions'
import { PublicKey, KeyType } from '@near-js/crypto'
```

Use cases:
- `buildTransaction()` - Create NEAR transactions with proper Borsh serialization
- `signTransaction()` - Sign transactions with Ed25519 keys
- Action creation (Transfer, FunctionCall for NEP-141 tokens)

**Key Management:**
```typescript
import { PublicKey, KeyType } from '@near-js/crypto'
```

Use cases:
- Convert raw Ed25519 public keys to NEAR-formatted public keys
- Validate public key formats

### 2. HDWallet NEAR Adapter (`../shapeshiftHdWallet/packages/hdwallet-near/`)

**Already implemented without libs** - Uses raw Ed25519 from `@noble/curves/ed25519`

Could optionally use:
```typescript
import { Signature } from '@near-js/crypto'
```

For signature serialization/deserialization, but current implementation works fine.

### 3. NEAR Intents Swapper (`packages/swapper/src/swappers/NearIntentsSwapper/`)

**Transaction Parsing:**
```typescript
import { decodeTransaction, encodeTransaction } from '@near-js/transactions'
```

Use cases:
- Parse unsigned transactions from NEAR Intents API
- Encode signed transactions for broadcast

**Utility Functions:**
```typescript
import { parseNearAmount, formatNearAmount } from '@near-js/utils'
```

Use cases:
- Convert human-readable NEAR amounts to yoctoNEAR (24 decimals)
- Format yoctoNEAR back to human-readable

### 4. Asset Generation Scripts (`scripts/generateAssetData/`)

No direct need - uses CoinGecko API, not NEAR RPC.

### 5. Web Frontend Components

**Display Formatting:**
```typescript
import { formatNearAmount } from '@near-js/utils'
```

Could be used for consistent NEAR amount formatting, but we already have generic amount formatting utils.

## Library Benefits

| Feature | Without Libs | With @near-js/* |
|---------|-------------|-----------------|
| Transaction building | Manual Borsh serialization | Built-in helpers |
| Action types | Custom types | Predefined types |
| Signature format | Manual conversion | Automatic handling |
| Amount conversion | Manual (24 decimals) | `parseNearAmount`/`formatNearAmount` |
| Key types | Raw bytes | `PublicKey` class with methods |

## Recommendation

**Minimum Required:** For the chain adapter and NEAR intents swapper to work with native NEAR chain:
- `@near-js/transactions` - Essential for building/signing transactions
- `@near-js/types` - Type definitions (peer dep)

**Optional:**
- `@near-js/crypto` - Only if we need advanced key handling beyond raw Ed25519
- `@near-js/utils` - Only if we need NEAR-specific formatting utilities

## Bundle Size Impact

| Package | Size (minified) | Size (gzipped) |
|---------|-----------------|----------------|
| @near-js/transactions | ~45KB | ~12KB |
| @near-js/crypto | ~15KB | ~5KB |
| @near-js/types | ~3KB | ~1KB |
| @near-js/utils | ~8KB | ~3KB |
| **Total** | ~71KB | ~21KB |

Note: Includes `borsh` dependency (~10KB gzipped) which is essential for NEAR transaction serialization.

## Alternative: Direct Implementation

If bundle size is a concern, we could implement transaction building manually:
1. Use `borsh` directly for serialization
2. Define action types manually
3. Use `@noble/curves/ed25519` for signing (already used in HDWallet)

However, using official libraries ensures:
- Compatibility with NEAR protocol updates
- Correct Borsh schema definitions
- Battle-tested transaction building

## Current Status

Libraries are installed but **NOT integrated** into any codebase files yet. This document serves as a reference for where they could be used during chain adapter implementation.
