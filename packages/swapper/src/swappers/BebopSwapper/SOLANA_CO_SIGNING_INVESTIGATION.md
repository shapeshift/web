# Bebop Solana Co-Signing Investigation & Next Steps

## Current Status

**Quotes work ✅ Fees display correctly ✅ Broadcast fails ❌**

## Root Cause Analysis

### The Multi-Signature Requirement

Bebop Solana transactions require **2 signatures**:
1. **User's wallet** (taker)
2. **Bebop's ephemeral key** (`6ZUeThQ9FovzaS8HejAfGW2VqCXwRYPKKyUNsozpfrSx`)

Evidence from transaction analysis:
```javascript
numRequiredSignatures: 2
Account[0]: ETpdrEkK8n3jPLysUZCNe1LHdM76GSrbHgAtVpCvWYLp (user) - signer
Account[1]: 6ZUeThQ9FovzaS8HejAfGW2VqCXwRYPKKyUNsozpfrSx (Bebop) - signer
```

### What Happens When We Try Self-Execute

When we rebuild the transaction from Bebop's instructions:
- The decompiled instruction STILL marks Bebop's account as `isSigner: true`
- We build a transaction requiring 2 signatures
- We can only provide 1 signature (user's)
- Transaction gets broadcast with missing signature
- Solana network silently rejects it (returns txHash but tx never confirms)

**Both Phantom extension AND Native wallet exhibit the same behavior:**
- ✅ Simulation succeeds (transaction structure is valid)
- ✅ /send endpoint returns txHash
- ❌ Transaction never appears on-chain

### Why gasless=false Doesn't Mean Self-Execute

Looking at the API:
- `gasless=false` → `QUOTE_INDIC_ROUTE` status (indicative only)
- `gasless=true` → `QUOTE_SUCCESS` status (executable via /v3/order)

The `gasless=false` parameter only affects:
- Whether gas fees are included in the price quote
- The status indicator in the response

It does NOT change the transaction structure - both modes return a transaction requiring 2 signatures.

## Comparison with EVM

### EVM Bebop (Self-Execute Works)
```
User signs transaction → Direct broadcast to network → Done
```
- Transaction data from API is ready to broadcast
- No co-signing needed
- True self-execution

### Solana Bebop (Self-Execute Doesn't Work)
```
User signs → ??? → Transaction needs Bebop signature too → Fails
```
- Transaction requires Bebop's signature
- Cannot broadcast directly
- NOT true self-execution

## Potential Solution: Implement /v3/order Flow

Similar to **CowSwap** pattern (sign message, submit to API, protocol broadcasts):

### Flow Comparison

**CowSwap (EVM):**
1. Get quote with EIP-712 order data
2. User signs EIP-712 message (off-chain)
3. Submit signature to CowSwap API
4. CowSwap matches and broadcasts
5. Track via order ID

**Bebop Solana (Proposed):**
1. Get quote with `gasless=true`
2. User signs Solana transaction message
3. Submit signature to `/v3/order` endpoint
4. Bebop adds their signature
5. Bebop broadcasts
6. Track via returned txHash

### API Endpoint

**POST** `/v3/order`

Request:
```json
{
  "quote_id": "121-xxx",
  "signature": "<base58_user_signature>"
}
```

Response:
```json
{
  "txHash": "...",
  "status": "Pending",
  "expiry": 1234567890
}
```

### Implementation Requirements

1. **Get unsigned Solana message to sign**
   - Extract message bytes from `solana_tx`
   - User signs just the message (not the full transaction)

2. **Implement executeBebopSolanaMessage method**
   - Similar to CowSwap's `executeEvmMessage`
   - Signs the transaction message
   - POSTs to `/v3/order` with signature + quote_id
   - Returns txHash from Bebop's response

3. **Update BebopSwapper**
   - Add `executeSolanaMessage` to swapper interface (new type)
   - Handle in execution flow

4. **Add metadata to quote**
   - Store `quoteId` in step metadata
   - Store serialized transaction for signing

## Open Questions

### 1. What exactly does Bebop expect for "signature"?

- The user's signature of the transaction message bytes?
- A signature of some off-chain order data (like EVM)?
- The full partially-signed transaction?

**Need to test:** Get a real quote and try different signature formats

### 2. Does Bebop's /v3/order actually work for Solana?

- The OpenAPI schema is generic (same for all chains)
- The docs mention "EOA private key" (Ethereum term)
- May be EVM-only despite being in Solana API

**Need to test:** Actually call `/v3/order` with valid data

### 3. Is this architecture acceptable for ShapeShift?

**Pros:**
- Similar to existing CowSwap pattern
- User still controls signing
- Bebop handles broadcast complexity

**Cons:**
- Different from EVM Bebop (self-execute)
- We don't control the broadcast
- Adds API dependency for execution

## Next Steps

### Investigation Phase

1. **Test /v3/order endpoint with real quote**
   ```bash
   # Get quote
   curl /v3/quote?gasless=true → quote_id + solana_tx

   # Sign transaction message
   const message = VersionedTransaction.deserialize(solana_tx).message
   const signature = sign(message.serialize())

   # Submit order
   POST /v3/order { quote_id, signature: base58(signature) }

   # Check if it broadcasts successfully
   ```

2. **Compare with CowSwap implementation**
   - Read `/packages/swapper/src/swappers/CowSwapper/CowSwapper.ts`
   - Understand how `executeEvmMessage` works
   - Check how they handle the API submission

3. **Verify Solana multi-sig transactions work**
   - Research if other Solana protocols use this pattern
   - Check if it's a common approach
   - Validate this is production-ready

### Implementation Phase (If Investigation Succeeds)

1. **Add new execution method type**
   - Define `executeSolanaMessage` in Swapper interface
   - Similar to `executeEvmMessage` for CowSwap

2. **Implement Bebop Solana message signing**
   - Extract message from `solana_tx`
   - Sign with wallet
   - Convert to base58
   - POST to `/v3/order`

3. **Update execution flow**
   - Detect Bebop Solana in useTradeExecution
   - Use message signing flow instead of transaction flow
   - Handle Bebop's broadcast

4. **Add order status tracking**
   - Use `/v3/order-status` endpoint
   - Map to our swap status
   - Handle Bebop-specific states

## Decision Point

**Should we implement the /v3/order (gasless) flow?**

**Arguments For:**
- Multi-sig transactions are legitimate Solana pattern
- CowSwap precedent shows API-based execution works
- Would enable Bebop Solana support
- User still controls signing

**Arguments Against:**
- Significantly different from EVM Bebop
- More complex implementation
- Adds Bebop API dependency
- May confuse users (why is Solana different?)

**Recommendation:**
Test the `/v3/order` flow first to confirm it actually works for Solana, then decide if the implementation complexity is worth it.

## Related Files

- `/packages/swapper/src/swappers/CowSwapper/CowSwapper.ts` - Message signing pattern
- `/packages/swapper/src/swappers/BebopSwapper/SOLANA_BLOCKER.md` - Current blocker doc
- `/packages/swapper/src/types.ts` - May need new execution type

## Timeline

- **Investigation:** ~2 hours (test /v3/order flow)
- **Implementation:** ~1 day (if investigation succeeds)
- **Testing:** ~0.5 day

**Total:** ~2 days if we proceed
