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
// USDT: balance at slot 2
// USDC (Circle native): balance at slot 9, allowance at slot 10
export const KNOWN_BALANCE_SLOTS: Record<string, number> = {
  // USDT
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 2, // USDT Ethereum

  // USDC (Circle native deployments - all use slot 9)
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 9, // USDC Ethereum
  '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': 9, // USDC Avalanche
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': 9, // USDC Optimism
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 9, // USDC Polygon
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 9, // USDC Arbitrum
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 9, // USDC Base
} as const

export const getTokenBalanceSlot = (tokenAddress: Address): number =>
  KNOWN_BALANCE_SLOTS[tokenAddress.toLowerCase()] ?? 0

export const getTokenAllowanceSlot = (tokenAddress: Address): number => {
  const balanceSlot = getTokenBalanceSlot(tokenAddress)
  return balanceSlot === 9 ? 10 : 1 // USDC uses slot 10, standard ERC20s use slot 1
}

// USDC slot 9: bit 255 is blacklist flag, must keep cleared
export const getMaxBalanceValue = (tokenAddress: Address): Hex => {
  const slot = getTokenBalanceSlot(tokenAddress)
  return slot === 9 ? toHex(maxUint256 >> 1n) : toHex(maxUint256)
}
