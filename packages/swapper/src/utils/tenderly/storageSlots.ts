import type { Address, Hex } from 'viem'
import { concat, keccak256, maxUint256, pad, toHex } from 'viem'

// keccak256(concat(pad(address), pad(slot)))
export function getBalanceStorageSlot(userAddress: Address, balanceSlotNumber: number = 0): Hex {
  const paddedAddress = pad(userAddress.toLowerCase() as Address, { size: 32 })
  const paddedSlot = pad(toHex(balanceSlotNumber), { size: 32 })
  return keccak256(concat([paddedAddress, paddedSlot]))
}

// keccak256(spender, keccak256(owner, slot))
export function getAllowanceStorageSlot(
  ownerAddress: Address,
  spenderAddress: Address,
  allowanceSlotNumber: number = 1,
): Hex {
  const paddedOwner = pad(ownerAddress.toLowerCase() as Address, { size: 32 })
  const paddedAllowanceSlot = pad(toHex(allowanceSlotNumber), { size: 32 })
  const innerSlot = keccak256(concat([paddedOwner, paddedAllowanceSlot]))

  const paddedSpender = pad(spenderAddress.toLowerCase() as Address, { size: 32 })
  return keccak256(concat([paddedSpender, innerSlot]))
}

// Most ERC20s use slot 0, USDC uses slot 9
export const KNOWN_BALANCE_SLOTS: Record<string, number> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 2, // USDT Ethereum
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 9, // USDC Ethereum
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 9, // USDC Arbitrum
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 9, // USDC.e Arbitrum
} as const

// Most ERC20s use slot 1, USDC uses slot 10
export const KNOWN_ALLOWANCE_SLOTS: Record<string, number> = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 10, // USDC Ethereum
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 10, // USDC Arbitrum
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 10, // USDC.e Arbitrum
} as const

export function getTokenBalanceSlot(tokenAddress: Address): number {
  return KNOWN_BALANCE_SLOTS[tokenAddress.toLowerCase()] ?? 0
}

export function getTokenAllowanceSlot(tokenAddress: Address): number {
  return KNOWN_ALLOWANCE_SLOTS[tokenAddress.toLowerCase()] ?? 1
}

// USDC slot 9: bit 255 is blacklist flag, must keep cleared
export function getMaxBalanceValue(tokenAddress: Address): Hex {
  const slot = getTokenBalanceSlot(tokenAddress)
  return slot === 9 ? toHex(maxUint256 >> 1n) : toHex(maxUint256)
}
