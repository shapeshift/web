import type { Address, Hex } from 'viem'
import { concat, keccak256, maxUint256, pad, toHex } from 'viem'

// keccak256(concat(pad(address), pad(slot)))
export const getBalanceStorageSlot = (userAddress: Address, balanceSlotNumber: number = 0): Hex => {
  const paddedAddress = pad(userAddress.toLowerCase() as Address, { size: 32 })
  const paddedSlot = pad(toHex(balanceSlotNumber), { size: 32 })
  return keccak256(concat([paddedAddress, paddedSlot]))
}

// keccak256(spender, keccak256(owner, slot))
export const getAllowanceStorageSlot = (
  ownerAddress: Address,
  spenderAddress: Address,
  allowanceSlotNumber: number = 1,
): Hex => {
  const paddedOwner = pad(ownerAddress.toLowerCase() as Address, { size: 32 })
  const paddedAllowanceSlot = pad(toHex(allowanceSlotNumber), { size: 32 })
  const innerSlot = keccak256(concat([paddedOwner, paddedAllowanceSlot]))

  const paddedSpender = pad(spenderAddress.toLowerCase() as Address, { size: 32 })
  return keccak256(concat([paddedSpender, innerSlot]))
}

// Most ERC20s: balance at slot 0, allowance at slot 1
// Slot 51/52 pattern (StandardArbERC20, some L2 implementations)
// Slot 5/6 pattern (Wormhole bridge)
// USDT (native Tether - Ethereum): balance at slot 2, allowance at slot 5
// USDT (BEP20 - BSC): balance at slot 1, allowance at slot 2
// USDT (xDai bridge - Gnosis): balance at slot 3, allowance at slot 4
// USDC (Circle native): balance at slot 9, allowance at slot 10
// USDC (BEP20 - BSC): balance at slot 1, allowance at slot 2
export const KNOWN_BALANCE_SLOTS: Record<string, number> = {
  // USDT - Native Tether deployment (custom slot 2)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 2, // USDT Ethereum

  // Slot 51 pattern (L2GatewayToken + ERC20Upgradeable + storage gaps)
  // Various L2 tokens use this pattern with different implementations
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 51, // USDT Arbitrum (StandardArbERC20)
  '0x912ce59144191c1204e64559fe8253a0e49e6548': 51, // ARB Arbitrum (StandardArbERC20)
  '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7': 51, // USDT Avalanche (TransparentProxy)
  '0x01bff41798a0bcf287b996046ca68b395dbc1071': 51, // USDT0 Optimism (LayerZero OFT - https://docs.usdt0.to)

  // Wormhole bridge pattern (slot 5)
  '0xca7dec8550f43a5e46e3dfb95801f64280e75b27': 5, // SWEAT Arbitrum (Wormhole bridge)

  // USDT - BEP20 pattern (slot 1 - Binance-Peg token)
  '0x55d398326f99059ff775485246999027b3197955': 1, // USDT BSC (confirmed)

  // USDT - xDai bridge pattern (slot 3)
  '0x4ecaba5870353805a9f068101a40e0f32ed605c6': 3, // USDT Gnosis (confirmed)

  // USDT - Standard ERC20 deployments (slot 0)
  // Polygon confirmed, Optimism bridged USDT (0x94b008aa...) also uses slot 0

  // USDC (Circle native deployments - all use slot 9)
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 9, // USDC Ethereum
  '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': 9, // USDC Avalanche
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': 9, // USDC Optimism
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 9, // USDC Polygon
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 9, // USDC Arbitrum
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 9, // USDC Base

  // USDC (BEP20 pattern on BSC - slot 1)
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 1, // USDC BSC (BEP20)
} as const

export const KNOWN_ALLOWANCE_SLOTS: Record<string, number> = {
  // USDT allowance slots (explicit mapping for all non-standard implementations)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 5, // USDT Ethereum (native Tether)
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 52, // USDT Arbitrum (StandardArbERC20)
  '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7': 52, // USDT Avalanche (StandardArbERC20)
  '0x01bff41798a0bcf287b996046ca68b395dbc1071': 52, // USDT0 Optimism (LayerZero OFT)
  '0x55d398326f99059ff775485246999027b3197955': 2, // USDT BSC (BEP20)
  '0x4ecaba5870353805a9f068101a40e0f32ed605c6': 4, // USDT Gnosis (xDai bridge)
  // Note: Polygon and Optimism standard bridged USDT (0x94b008aa...) use slot 1 (fallback)
  // Note: SWEAT (slot 5) allowance auto-inferred to slot 6 via Wormhole pattern

  // USDC allowance slots (BSC uses BEP20 pattern, not Circle FiatToken)
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 2, // USDC BSC (BEP20)
  // Note: All other USDC (Circle native) use slot 10 (handled by USDC pattern check)
} as const

export const getTokenBalanceSlot = (tokenAddress: Address): number =>
  KNOWN_BALANCE_SLOTS[tokenAddress.toLowerCase()] ?? 0

export const getTokenAllowanceSlot = (tokenAddress: Address): number => {
  // Check explicit allowance mapping first
  const explicitSlot = KNOWN_ALLOWANCE_SLOTS[tokenAddress.toLowerCase()]
  if (explicitSlot !== undefined) return explicitSlot

  // Infer allowance slot from balance slot for known patterns
  const balanceSlot = getTokenBalanceSlot(tokenAddress)
  if (balanceSlot === 9) return 10 // USDC pattern
  if (balanceSlot === 51) return 52 // StandardArbERC20 pattern
  if (balanceSlot === 5) return 6 // Wormhole pattern

  // Standard ERC20: allowance at slot 1
  return 1
}

// USDC slot 9: bit 255 is blacklist flag, must keep cleared
export const getMaxBalanceValue = (tokenAddress: Address): Hex => {
  const slot = getTokenBalanceSlot(tokenAddress)
  return slot === 9 ? toHex(maxUint256 >> 1n) : toHex(maxUint256)
}
