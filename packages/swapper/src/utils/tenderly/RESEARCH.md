# Tenderly State Overrides Research

## Problem

Near Intents (and other swappers) need accurate gas estimation for rates, but estimation fails when:
- User hasn't approved tokens
- User has insufficient balance
- No wallet connected yet (showing rates before connection)

This causes fees to show as "$0" in the UI, which is misleading.

## Solution

Use Tenderly's Simulation API with **state overrides** to temporarily modify blockchain state during simulation, allowing transactions to succeed even when the user lacks balance/approvals.

## Key Findings

### 1. State Overrides Work

Tenderly API supports `state_objects` field that can override:
- **Account balances** (native ETH, MATIC, etc.)
- **Contract storage** (ERC20 token balances, allowances, etc.)

### 1a. Allowance Overrides (CRITICAL for Contract Calls)

**Problem**: Swappers like Portals/Relay use multicall contracts that check `allowance[user][spender]` BEFORE embedded approvals execute.

**Solution**: Override allowance storage slots in addition to balance slots.

**Formula**: `keccak256(abi.encode(spender, keccak256(abi.encode(owner, slot))))`
- Order is CRITICAL: spender outer, owner inner
- Most ERC20s: allowance at slot 1
- USDC (all chains): allowance at slot 10

### 2. Storage Slot Calculation (CRITICAL)

**WRONG METHOD** (what we initially tried):
```typescript
// DON'T USE encodePacked!
keccak256(encodePacked(['address', 'uint256'], [address, slot]))
```

**CORRECT METHOD** (what actually works):
```typescript
// Use concat + pad
const paddedAddress = pad(address, { size: 32 })
const paddedSlot = pad(toHex(slot), { size: 32 })
const storageSlot = keccak256(concat([paddedAddress, paddedSlot]))
```

The encoding methods produce **different hashes**. Tenderly expects the `concat+pad` method.

### 3. ERC20 Storage Slots

Different tokens use different storage slots for balances and allowances:

#### Balance Slots

| Token | Chain | Slot | Notes |
|-------|-------|------|-------|
| Standard ERC20 | Any | 0 | ~70-80% of tokens |
| USDT | Ethereum | 2 | Native Tether (0xdac17f958...) |
| USDT | Arbitrum | 51 | StandardArbERC20 proxy (0xfd086bc7c...) |
| USDT | Avalanche | 51 | StandardArbERC20 proxy (0x9702230a8...) |
| USDT0 | Optimism | 51 | LayerZero OFT (0x01bff4179... - docs.usdt0.to) |
| USDT | Optimism | 0 | Standard bridge (0x94b008aa0...) |
| USDT | BSC | 1 | BEP20 (0x55d398326...) |
| USDT | Gnosis | 3 | xDai bridge (0x4ecaba587...) |
| USDT | Polygon | 0 | Standard bridge (0xc2132d05d...) |
| USDC (native) | Most chains | 9 | Circle FiatToken `balanceAndBlacklistStates` |
| USDC | BSC | 1 | BEP20 (0x8ac76a51c...) |

#### Allowance Slots

| Token | Chain | Slot | Notes |
|-------|-------|------|-------|
| Standard ERC20 | Any | 1 | ~70-80% of tokens |
| USDT | Ethereum | 5 | Native Tether (0xdac17f958...) |
| USDT | Arbitrum | 52 | StandardArbERC20 proxy (0xfd086bc7c...) |
| USDT | Avalanche | 52 | StandardArbERC20 proxy (0x9702230a8...) |
| USDT0 | Optimism | 52 | LayerZero OFT (0x01bff4179...) |
| USDT | Optimism | 1 | Standard bridge (0x94b008aa0...) |
| USDT | BSC | 2 | BEP20 (0x55d398326...) |
| USDT | Gnosis | 4 | xDai bridge (0x4ecaba587...) |
| USDT | Polygon | 1 | Standard bridge (0xc2132d05d...) |
| USDC (native) | Most chains | 10 | Circle FiatToken `allowed` mapping |
| USDC | BSC | 2 | BEP20 (0x8ac76a51c...) |
| DAI | Ethereum | 3 | Custom layout |

**USDC Special Case:**
- Slot 9 stores `balanceAndBlacklistStates` (combined value)
- Bit 255: Blacklist flag (1 = blacklisted)
- Bits 0-254: Balance

**IMPORTANT**: Must use `0x7FFF...` (not `0xFFFF...`) to keep bit 255 cleared, otherwise the address gets blacklisted during simulation!

**Allowance Calculation (Nested Mapping):**

For `mapping(address => mapping(address => uint256)) allowed`:

```typescript
// Step 1: Inner hash - owner with base slot
const ownerSlot = keccak256(concat([
  pad(owner, { size: 32 }),
  pad(toHex(10), { size: 32 })  // Slot 10 for USDC
]))

// Step 2: Outer hash - spender with inner result
const allowanceSlot = keccak256(concat([
  pad(spender, { size: 32 }),
  ownerSlot  // Use as bytes32
]))
```

**Order is CRITICAL**: `keccak256(spender, keccak256(owner, slot))` - NOT reversed!

### 3a. Spender Address Discovery

**For Portals/aggregators**:
- `tx.to`: The multicall router contract (what we call)
- `context.target`: The actual spender needing allowance (e.g., 0x protocol router)
- **Use `context.target`** for allowance overrides, NOT `tx.to`!

**For simple swappers**:
- Spender is usually `tx.to` (the contract being called)

### 4. Viem Constants

Use `maxUint256` from viem instead of hardcoded strings:
```typescript
import { maxUint256 } from 'viem'

// Standard ERC20
const maxBalance = toHex(maxUint256)

// USDC (clear bit 255)
const maxBalanceUSDC = toHex(maxUint256 >> 1n)
```

### 5. Test Results

All tests on Arbitrum with user address `0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986`:

| Test | Amount | Has Balance? | State Override? | Result | Gas Used |
|------|--------|--------------|-----------------|--------|----------|
| Native ETH | 1 ETH | ❌ No | ❌ No | ❌ Fail | N/A |
| Native ETH | 1 ETH | ❌ No | ✅ Yes | ✅ Success | 21,656 |
| USDC | 1 USDC | ✅ Yes (1.25) | ❌ No | ✅ Success | 63,278 |
| USDC | 10 USDC | ❌ No (1.25) | ❌ No | ❌ Fail | 37,342 |
| USDC | 10 USDC | ❌ No (1.25) | ✅ Yes | ✅ Success | 63,372 |

**Key Insight**: Gas estimates with overrides (63,372) match real balance scenarios (63,278), proving accuracy!

## Limitations

### Token Coverage

The `KNOWN_BALANCE_SLOTS` approach works for:
- ✅ Most standard ERC20s (~70-80%) - default to slot 0
- ✅ Explicitly mapped tokens (USDC, USDT, etc.)

Does NOT automatically work for:
- ❌ Non-standard storage layouts (Vyper, custom)
- ❌ Upgradeable proxies with unusual storage
- ❌ Tokens not yet mapped

### Production Considerations

For broader coverage:
1. Expand `KNOWN_BALANCE_SLOTS` as issues discovered
2. Use automated slot discovery (e.g., [slotseek](https://github.com/d3or/slotseek))
3. Fall back to simulation without overrides if slot wrong
4. Consider Tenderly's `tenderly_setErc20Balance` RPC method (if available in simulation API)

## References

- [Tenderly State Overrides Docs](https://docs.tenderly.co/simulations/state-overrides)
- [Stack Overflow: ERC20 State Overrides](https://stackoverflow.com/questions/75994040)
- [Circle USDC Contract](https://github.com/circlefin/stablecoin-evm/blob/master/contracts/v2/FiatTokenV2_2.sol)
- [Storage Slot Calculation](https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html#mappings-and-dynamic-arrays)

## Quick Reference: Tenderly API

**Endpoint**: `POST https://api.tenderly.co/api/v1/account/{accountSlug}/project/{projectSlug}/simulate`

**Request**:
```json
{
  "network_id": "42161",
  "from": "0xUserAddress",
  "to": "0xContractAddress",
  "input": "0xCalldata",
  "value": "0x0",
  "gas": 300000,
  "gas_price": "0",
  "save": false,
  "state_objects": {
    "0xuseraddress": {
      "balance": "0x56BC75E2D63100000",
      "storage": {
        "0xStorageSlot": "0x7FFFFFFF..."
      }
    }
  }
}
```

**Response**:
```json
{
  "transaction": {
    "status": true,
    "gas_used": 63372,
    "error_message": null
  }
}
```
