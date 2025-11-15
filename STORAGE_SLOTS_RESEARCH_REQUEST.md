# ERC20 Storage Slot Override Research Request

## Context

We've implemented Tenderly simulation with state overrides for accurate gas estimation in our DEX aggregator swappers. This allows us to estimate gas fees even when users lack sufficient token balances or approvals.

## What We've Implemented

### Current Approach: Known Slots Mapping

**File**: `packages/swapper/src/utils/tenderly/storageSlots.ts`

We maintain hardcoded mappings for token storage layouts:

```typescript
export const KNOWN_BALANCE_SLOTS: Record<string, number> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 2, // USDT Ethereum
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 9, // USDC Ethereum
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 9, // USDC Arbitrum
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 9, // USDC.e Arbitrum
} as const

export const getTokenBalanceSlot = (tokenAddress: Address): number =>
  KNOWN_BALANCE_SLOTS[tokenAddress.toLowerCase()] ?? 0

export const getTokenAllowanceSlot = (tokenAddress: Address): number => {
  const balanceSlot = getTokenBalanceSlot(tokenAddress)
  return balanceSlot === 9 ? 10 : 1 // USDC pattern
}
```

### Storage Slot Calculation

**Balance**: `keccak256(concat(pad(userAddress, 32), pad(slotNumber, 32)))`
**Allowance**: `keccak256(concat(pad(spender, 32), keccak256(concat(pad(owner, 32), pad(slotNumber, 32)))))`

### How It Works

1. **Standard ERC20** (~70-80% of tokens):
   - Balance at slot 0
   - Allowance at slot 1
   - Works by default

2. **USDC (Circle FiatToken)**:
   - Balance at slot 9 (`balanceAndBlacklistStates` - bit 255 is blacklist flag)
   - Allowance at slot 10 (`allowed` mapping)
   - Explicitly mapped

3. **USDT**:
   - Balance at slot 2
   - Explicitly mapped

## The Problem

### Flakiness Concerns

1. **Coverage**: Only covers explicitly mapped tokens
2. **Maintenance**: Must manually discover and add each non-standard token
3. **Scaling**: Hundreds of tokens exist across multiple chains
4. **Errors**: Wrong slot = simulation fails silently or shows incorrect gas

### When It Fails

- Vyper-based contracts (different storage layout)
- Upgradeable proxies with custom storage
- Tokens with non-sequential storage slots
- New token deployments we haven't mapped

## Research Questions

### 1. Generalization

**Can we automatically detect storage slots without hardcoding?**

Potential approaches:
- EIP-6823: Token Mapping Slot Retrieval Extension (do any tokens implement this?)
- slotseek library (https://github.com/d3or/slotseek) - programmatic slot discovery
- Tenderly's `tenderly_setErc20Balance` RPC method (does it work in simulation API?)
- Binary search with test transactions
- Static analysis of verified contracts (Etherscan API + parsing)

### 2. Standard Patterns

**What percentage of ERC20s follow the standard layout?**

Research:
- Top 100 ERC20s by market cap - what slots do they use?
- OpenZeppelin ERC20 (the de facto standard)
- Solmate ERC20 (popular minimal implementation)
- Are there common patterns beyond standard/USDC/USDT?

### 3. Existing Solutions

**How do other projects handle this?**

Research:
- Hardhat mainnet forking (how do they override balances?)
- Foundry's `vm.deal` and `deal` (how does it work?)
- Tenderly's own tooling (do they have helpers?)
- Fork testing frameworks (do they auto-detect slots?)
- RPC state override implementations (Geth, Erigon)

### 4. Alternative Strategies

**What if we can't detect slots reliably?**

Options:
- Fall back to simulation without overrides (accept failures)
- Use Tenderly's RPC helpers if available
- Maintain curated list of top 50 tokens only
- Combine multiple strategies (try standard, then known, then give up)
- Use transaction traces to infer slots from real usage

### 5. USDC Specifics

**The USDC pattern (balance=9, allowance=10):**

Questions:
- Do ALL Circle USDC deployments follow this? (Ethereum, Arbitrum, Polygon, etc.)
- What about bridged USDC (USDC.e)?
- Can we detect "is this a FiatToken contract" programmatically?
- Are there other major tokens with the blacklist pattern?

## What We Need

### Actionable Research Outputs

1. **Coverage analysis**: What % of tokens work with standard slots?
2. **Discovery methods**: Ranked list of programmatic slot detection approaches
3. **Fallback strategy**: What to do when slots unknown?
4. **Maintenance plan**: How to keep mappings up-to-date as new tokens deploy?
5. **Risk assessment**: What happens if we get slots wrong?

### Specific Questions

1. Does EIP-6823 have any adoption? Can we rely on it?
2. Does slotseek work reliably? Should we integrate it?
3. Can we query Etherscan API for verified contract storage layouts?
4. Do any tokens follow patterns beyond standard/USDC/USDT?
5. Is there a Tenderly RPC method we're missing that handles this?

## Current Test Results

### Working Scenarios

✅ **Native ETH**: Always works (just balance override)
✅ **USDC (Arbitrum)**: Works with slot 9/10 mapping
✅ **Standard ERC20 (assumption)**: Should work with slot 0/1 default

### Unknown/Untested

❓ **WETH, DAI, LINK, UNI**: Do they use standard slots?
❓ **Vyper tokens**: Different ABI encoding?
❓ **Upgradeable proxies**: Storage collision risks?
❓ **Exotic tokens**: Non-standard patterns?

## Technical Constraints

- Can't make external calls during simulation (synchronous operation)
- Can't rely on contract source code being available
- Can't assume tokens follow standards
- Must handle thousands of tokens across 10+ chains

## Success Criteria for Research

Ideal outcome:
1. **95%+ token coverage** with minimal maintenance
2. **Programmatic detection** for unknown tokens
3. **Graceful degradation** when detection fails
4. **Clear documentation** of edge cases and limitations

## References

- [EIP-6823](https://eips.ethereum.org/EIPS/eip-6823): Token Mapping Slot Retrieval
- [slotseek](https://github.com/d3or/slotseek): Programmatic slot discovery
- [Circle USDC Storage](https://github.com/circlefin/stablecoin-evm/blob/master/test/helpers/storageSlots.behavior.ts)
- [Tenderly State Overrides](https://docs.tenderly.co/simulations/state-overrides)
- [Solidity Storage Layout](https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html#mappings-and-dynamic-arrays)

## Current Implementation Files

For context when researching:

- `packages/swapper/src/utils/tenderly/storageSlots.ts` - Storage slot calculations
- `packages/swapper/src/utils/tenderly/simulate.ts` - Tenderly simulation with overrides
- `packages/swapper/src/utils/tenderly/RESEARCH.md` - Our findings so far
- `packages/swapper/src/utils/tenderly/IMPLEMENTATION.md` - Implementation details

## Questions to Answer

1. **Is the KNOWN_BALANCE_SLOTS approach fundamentally flawed, or just incomplete?**
2. **Should we invest in programmatic slot discovery, or is manual mapping acceptable for top tokens?**
3. **What's the best fallback strategy when slots are unknown?**
4. **Are there patterns we're missing that would improve coverage?**
5. **How do production-grade DeFi apps solve this problem?**

Please research these questions and provide:
- Analysis of coverage vs effort tradeoffs
- Recommendations for improving our approach
- Code examples or libraries to integrate
- Risk assessment of current implementation
- Migration path if we need to change approaches
