# Bebop Solana Integration - BLOCKER IDENTIFIED

## Issue

Bebop Solana transactions **require 2 signatures** even in `gasless=false` mode:
1. User's wallet signature
2. Bebop's ephemeral key signature

## Evidence

### Transaction Analysis
Deserializing Bebop's `solana_tx` shows:
```
Num required signatures: 2
Account 0: ETpdrEkK8n3jPLysUZCNe1LHdM76GSrbHgAtVpCvWYLp (user) - signer
Account 1: 6ZUeThQ9FovzaS8HejAfGW2VqCXwRYPKKyUNsozpfrSx (Bebop) - signer
```

### API Behavior

**gasless=true:**
- Status: `QUOTE_SUCCESS`
- `requiredSignatures`: `[]`
- Bebop handles everything
- `/v3/order` endpoint submits with both signatures

**gasless=false:**
- Status: `QUOTE_INDIC_ROUTE` (indicative, not executable alone)
- Transaction still has 2 required signatures
- We can only provide 1 signature
- Transaction is invalid without Bebop's signature

## Why This Doesn't Work

ShapeShift's architecture requires **fully self-executable** transactions:
1. Get quote with transaction data
2. Sign with user's wallet
3. Broadcast directly to blockchain

Bebop Solana requires a **hybrid flow**:
1. Get quote
2. Sign with user's wallet
3. Submit signature to Bebop's `/v3/order` endpoint
4. Bebop adds their signature
5. Bebop broadcasts

## Comparison with EVM

### Bebop EVM (works)
- `gasless=false` returns transaction with only user signature required
- We can broadcast directly
- True self-execution

### Bebop Solana (doesn't work)
- `gasless=false` returns transaction requiring 2 signatures
- Cannot broadcast without Bebop's signature
- Not true self-execution

## Potential Solutions

### Option 1: Use Gasless Mode (Not Ideal)
- Set `gasless=true`
- Submit to `/v3/order` endpoint
- Bebop broadcasts (we don't control it)
- Doesn't match ShapeShift architecture
- Would need different execution flow

### Option 2: Request Bebop to Add True Self-Execute
- Ask Bebop to support single-signature transactions for Solana
- Would match EVM behavior
- They may not be willing/able to do this due to their settlement model

### Option 3: Don't Support Bebop Solana
- Keep Bebop for EVM chains only
- Use Jupiter for Solana swaps
- Simplest solution

## Recommendation

**Do not integrate Bebop Solana** until they provide true self-execute support (single-signature transactions).

The current `gasless=false` mode is misleading - it's not actually self-executable. The `QUOTE_INDIC_ROUTE` status is a hint that these quotes are "indicative" and cannot be directly executed by us.

## Test Commands

### Verify signature requirements:
```bash
node -e "
const { VersionedTransaction } = require('@solana/web3.js');
const tx = VersionedTransaction.deserialize(
  Buffer.from(BEBOP_SOLANA_TX_BASE64, 'base64')
);
console.log('Required signatures:', tx.message.header.numRequiredSignatures);
"
```

### Check both modes:
```bash
# gasless=true
curl "https://api.bebop.xyz/pmm/solana/v3/quote?gasless=true&..." | jq .status
# Returns: QUOTE_SUCCESS

# gasless=false
curl "https://api.bebop.xyz/pmm/solana/v3/quote?gasless=false&..." | jq .status
# Returns: QUOTE_INDIC_ROUTE (indicative only!)
```
