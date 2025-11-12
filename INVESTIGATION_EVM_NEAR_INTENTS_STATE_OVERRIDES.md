# Investigation: Accurate Gas Estimation Using Tenderly State Overrides

## Context

We need accurate gas estimation for the Near Intents swapper (and eventually all swappers) even when:
- Users haven't approved tokens
- Users have insufficient balance
- We're generating quotes before wallet connection

**Primary file to modify**: `packages/swapper/src/swappers/NearIntentsSwapper/swapperApi/getTradeRate.ts`

See: https://github.com/shapeshift/web/pull/11016/files/cc3dee00393b34296acde36bcff389dfd47b977b#diff-43cc2751a8d80844d7fdd870baac93346c10386096365d47bf1ea1f9e5e0be04

**Current problem** (from my comment in the PR):
> "This will be inaccurate for users that haven't approved the swapper address, or that don't have enough balance. But otherwise, it's better than nothing"

## The Solution: Tenderly Simulation API with State Overrides

Tenderly's Simulation API allows us to temporarily override blockchain state during simulation:
- Override token balances to give user infinite tokens
- Override token approvals to max allowance
- Override ETH balance for gas

This makes the simulation **succeed** as if the user actually had the required balance and approvals, giving us accurate gas estimates.

## How State Overrides Work

State overrides modify storage slots during simulation without affecting actual on-chain state.

### For ERC20 Tokens

ERC20 contracts use storage mappings:
```solidity
// Typically at slot 0 (but can vary - USDC uses slot 9)
mapping(address => uint256) public balanceOf;

// Typically at slot 1  
mapping(address => mapping(address => uint256)) public allowance;
```

To override these, we calculate the storage slot using:
```typescript
// Balance slot: keccak256(abi.encode(userAddress, balanceSlot))
// Allowance slot: keccak256(abi.encode(spenderAddress, keccak256(abi.encode(ownerAddress, allowanceSlot))))
```

### For Native Assets

Simply override the account's balance field.

## Tenderly API Integration

Tenderly is already integrated in the ShapeShift codebase. You'll need to:

1. Find existing Tenderly integration patterns
2. Locate Tenderly config (access keys, account/project slugs)
3. Study the API response shapes and types

### Key Tenderly API Endpoint

```
POST https://api.tenderly.co/api/v1/account/{accountSlug}/project/{projectSlug}/simulate
```

### Request Body Structure

```typescript
{
  network_id: string,           // Chain ID as string
  from: string,                 // User address (lowercase)
  to: string,                   // Contract address (lowercase)
  input: string,                // Calldata (0x-prefixed hex)
  value: string,                // Native asset value (hex)
  gas: number,                  // High limit for simulation (e.g., 30000000)
  gas_price: string,            // Can be "0" for simulation
  save: boolean,                // false - don't save to dashboard
  save_if_fails: boolean,       // true - return gas even if reverts
  state_objects: {              // THE KEY PART: State overrides
    [address: string]: {
      balance?: string,         // Override ETH balance (hex)
      storage?: {               // Override storage slots
        [slot: string]: string  // slot => value (both hex, 0x-prefixed)
      }
    }
  }
}
```

### Response Structure

```typescript
{
  simulation: {
    status: boolean,            // true = success, false = revert
    gas_used: number,           // Gas consumed
    error_message?: string,     // If status is false
    // ... other fields
  }
}
```

## What You Need to Spike

### 1. Tenderly API Investigation

- Find existing Tenderly integration in codebase
- Locate types/interfaces for Tenderly requests/responses
- Find how Tenderly config is accessed (env vars, config files, etc.)
- Test actual API calls with curl/Postman to understand response shapes

### 2. Storage Slot Calculation

Research and implement:
```typescript
function getBalanceStorageSlot(
  userAddress: string,
  balanceSlot: number = 0
): string {
  // Calculate keccak256(abi.encode(userAddress, balanceSlot))
  // Return as 0x-prefixed hex string
}

function getAllowanceStorageSlot(
  ownerAddress: string,
  spenderAddress: string,
  allowanceSlot: number = 1
): string {
  // Calculate nested mapping slot
  // Return as 0x-prefixed hex string
}
```

Look into:
- `viem` utilities for keccak256, encodePacked, pad
- Or `ethers` utilities if that's what the codebase uses

### 3. AssetId Parsing

The codebase uses CAIP (Chain Agnostic Improvement Proposals) for asset identification.

Study `@shapeshiftoss/caip` to understand:
- What is an AssetId? (format, structure)
- How to determine if AssetId represents native asset vs ERC20 token
- How to extract token contract address from AssetId
- How to extract chain ID from AssetId

Example AssetId formats you might encounter:
- Native: `eip155:1/slip44:60` (Ethereum mainnet ETH)
- ERC20: `eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` (USDC on Ethereum)

### 4. Function Signature Design

Create a utility function with signature roughly like:

```typescript
async function estimateGasWithTenderly({
  from,                         // User address
  to,                           // Contract address to call
  data,                         // Calldata (Hex | '0x')
  value,                        // Native asset value if any
  sellAssetId,                  // CAIP AssetId being sold
  sellAmountCryptoBaseUnit,     // Amount in base units (string or bigint)
  chainId,                      // Numeric chain ID
}: {
  from: string
  to: string
  data: string                  // Hex | '0x'
  value?: string | bigint
  sellAssetId: string           // CAIP AssetId
  sellAmountCryptoBaseUnit: string | bigint
  chainId: number
}): Promise<{
  gasUsed: bigint
  gasLimit: bigint              // gasUsed * 1.1 (10% buffer)
  status: boolean
  errorMessage?: string
}>
```

**Key considerations for signature**:
- Near Intents might use native asset sends (value transfer, no calldata)
- Other swappers use contract calls (calldata, maybe with value)
- Need to support both patterns
- AssetId tells us if we're dealing with native or ERC20
- If ERC20, we need to override both balance and approval

**Don't implement the full function yet** - just spike on understanding:
- What inputs are needed
- What the Tenderly API expects
- How to transform our inputs to Tenderly's format
- What the response looks like

## Testing Strategy

### Manual Testing with Curl

Ask me to help generate test scenarios:

1. **Normal quote** (should work without overrides)
   ```bash
   # I'll provide you with a real quote that should succeed
   ```

2. **Insufficient balance** (will fail without overrides)
   ```bash
   # I'll provide a quote with amount > user balance
   # This should fail in standard simulation
   # But succeed with state overrides
   ```

3. **No approval** (will fail without overrides)
   ```bash
   # I'll provide a quote where user hasn't approved
   # This should fail in standard simulation
   # But succeed with state overrides
   ```

### What to Return from Spike

Create a summary document with:

1. **Tenderly Integration Findings**
   - Where Tenderly is already used
   - How config is accessed
   - Existing types/interfaces
   - Code examples from codebase

2. **API Understanding**
   - Request/response examples with real data
   - Any gotchas or edge cases discovered
   - Error response formats

3. **Storage Slot Implementation**
   - Working code for calculating balance slots
   - Working code for calculating allowance slots
   - Note: Most ERC20s use slot 0 for balance, slot 1 for allowance
   - Exception: USDC uses slot 9 for balance (we can handle this later)

4. **AssetId Parsing**
   - How to detect native vs ERC20
   - How to extract contract address
   - Code examples

5. **Proposed Function Signature**
   - Final signature recommendation
   - Rationale for parameter choices
   - Example usage in Near Intents swapper

6. **Next Steps**
   - What needs to be implemented
   - Integration points in existing code
   - Testing approach

## Important Notes

- **No canary addresses in initial version** - We'll start by requiring a `from` address
- **This pattern should work for ANY swapper**, not just Near Intents
- **Goal**: Make simulation **succeed** with overrides, not just "get gas from failed simulation"
- **State overrides are temporary** - They only affect the simulation, not actual blockchain state
- **The estimate should be accurate** - We're simulating the actual successful execution

## Questions to Answer

During your spike, try to answer:

1. Does Tenderly support all the chains we need? (Ethereum, Arbitrum, Optimism, Base, etc.)
2. What's the rate limit on Tenderly simulation API?
3. Are there any costs per simulation call?
4. What happens if we get storage slot wrong? (Does it gracefully fail?)
5. How do we handle tokens with non-standard storage layouts?
6. Should we batch multiple simulations or call one at a time?

## Success Criteria

You'll know the spike is complete when:

- [x] You understand Tenderly API request/response format
- [x] You can calculate storage slots for balance and allowance
- [x] You can parse AssetIds to determine native vs ERC20
- [x] You have working curl examples demonstrating state overrides
- [x] You have a proposed function signature with clear rationale
- [x] You have identified integration points in the codebase

## References

- Tenderly Simulation API Docs: https://docs.tenderly.co/simulations
- State Overrides Guide: https://docs.tenderly.co/simulations/state-overrides
- CAIP Standards: https://github.com/ChainAgnostic/CAIPs
- ERC20 Storage Layout: https://docs.openzeppelin.com/contracts/4.x/api/token/erc20

---

**Ready to start?** Begin by exploring the existing Tenderly integration in the codebase and making some test API calls!
