import type { Address, Hex } from 'viem'
import { concat, keccak256, maxUint256, pad, toHex } from 'viem'

/**
 * Calculate the storage slot for an ERC20 balance mapping.
 * Uses the correct Solidity mapping storage calculation: keccak256(concat(pad(address), pad(slot)))
 *
 * @param userAddress - The address whose balance slot to calculate
 * @param balanceSlotNumber - The storage slot where the balance mapping is stored (default: 0 for standard ERC20)
 * @returns The calculated storage slot as a hex string
 *
 * @example
 * // Standard ERC20 (balances at slot 0)
 * const slot = getBalanceStorageSlot('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 0)
 *
 * // Circle USDC (balanceAndBlacklistStates at slot 9)
 * const slot = getBalanceStorageSlot('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 9)
 */
export function getBalanceStorageSlot(userAddress: Address, balanceSlotNumber: number = 0): Hex {
  // Pad address to 32 bytes
  const paddedAddress = pad(userAddress.toLowerCase() as Address, { size: 32 })

  // Pad slot number to 32 bytes
  const paddedSlot = pad(toHex(balanceSlotNumber), { size: 32 })

  // Calculate storage slot: keccak256(address || slot)
  const storageSlot = keccak256(concat([paddedAddress, paddedSlot]))

  return storageSlot
}

/**
 * Calculate the storage slot for an ERC20 allowance mapping.
 * For nested mappings: mapping(address owner => mapping(address spender => uint256))
 *
 * Formula: keccak256(abi.encode(spender, keccak256(abi.encode(owner, slot))))
 *
 * @param ownerAddress - The token owner's address
 * @param spenderAddress - The address approved to spend tokens (typically tx.to)
 * @param allowanceSlotNumber - The storage slot where the allowance mapping is stored (default: 1 for standard ERC20)
 * @returns The calculated storage slot as a hex string
 *
 * @example
 * // Standard ERC20 (allowance at slot 1)
 * const slot = getAllowanceStorageSlot(
 *   '0xUserAddress',
 *   '0xRouterAddress',
 *   1
 * )
 *
 * // USDC (allowance at slot 10)
 * const slot = getAllowanceStorageSlot(
 *   '0xUserAddress',
 *   '0xRouterAddress',
 *   10
 * )
 */
export function getAllowanceStorageSlot(
  ownerAddress: Address,
  spenderAddress: Address,
  allowanceSlotNumber: number = 1,
): Hex {
  // First level: keccak256(owner || allowanceSlot)
  const paddedOwner = pad(ownerAddress.toLowerCase() as Address, { size: 32 })
  const paddedAllowanceSlot = pad(toHex(allowanceSlotNumber), { size: 32 })
  const innerSlot = keccak256(concat([paddedOwner, paddedAllowanceSlot]))

  // Second level: keccak256(spender || innerSlot)
  const paddedSpender = pad(spenderAddress.toLowerCase() as Address, { size: 32 })
  const finalSlot = keccak256(concat([paddedSpender, innerSlot]))

  return finalSlot
}

/**
 * Known balance slot positions for common tokens.
 * Most ERC20s use slot 0, but some have custom layouts.
 *
 * Note: This is a partial mapping. For unknown tokens, we default to slot 0
 * which works for ~70-80% of standard ERC20 implementations. Tokens with
 * non-standard layouts (Vyper, custom storage, etc.) will need to be added here.
 *
 * For production, consider:
 * - Expanding this map as issues are discovered
 * - Using a slot discovery tool (e.g., slotseek)
 * - Falling back to simulation without overrides if slot is wrong
 */
export const KNOWN_BALANCE_SLOTS: Record<string, number> = {
  // Ethereum Mainnet
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 2, // USDT (Ethereum)
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 9, // USDC (Ethereum)

  // Arbitrum
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 9, // USDC (Arbitrum native)
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 9, // USDC.e (Arbitrum bridged)

  // Add more as needed
} as const

/**
 * Known allowance slot positions for common tokens.
 * Most ERC20s use slot 1 for allowances, but some have custom layouts.
 */
export const KNOWN_ALLOWANCE_SLOTS: Record<string, number> = {
  // Ethereum Mainnet
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 10, // USDC (Ethereum) - allowed mapping

  // Arbitrum
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 10, // USDC (Arbitrum native) - allowed mapping
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 10, // USDC.e (Arbitrum bridged) - allowed mapping

  // Add more as needed
} as const

/**
 * Get the balance slot for a token, falling back to standard slot 0 if unknown.
 *
 * @param tokenAddress - The ERC20 token contract address
 * @returns The balance mapping storage slot number
 */
export function getTokenBalanceSlot(tokenAddress: Address): number {
  const normalizedAddress = tokenAddress.toLowerCase()
  return KNOWN_BALANCE_SLOTS[normalizedAddress] ?? 0
}

/**
 * Get the allowance slot for a token, falling back to standard slot 1 if unknown.
 *
 * @param tokenAddress - The ERC20 token contract address
 * @returns The allowance mapping storage slot number
 */
export function getTokenAllowanceSlot(tokenAddress: Address): number {
  const normalizedAddress = tokenAddress.toLowerCase()
  return KNOWN_ALLOWANCE_SLOTS[normalizedAddress] ?? 1
}

/**
 * Get the maximum safe balance value for a token.
 * For Circle USDC contracts, we need to keep bit 255 clear (blacklist flag).
 * For standard ERC20s, we can use max uint256.
 *
 * @param tokenAddress - The ERC20 token contract address
 * @returns The maximum balance value as a hex string
 */
export function getMaxBalanceValue(tokenAddress: Address): Hex {
  const slot = getTokenBalanceSlot(tokenAddress)

  // Circle USDC uses slot 9 with bit 255 as blacklist flag
  if (slot === 9) {
    // Max value with bit 255 cleared: maxUint256 >> 1n
    // This gives us 0x7FFF...FFFF (all bits except the highest bit set)
    return toHex(maxUint256 >> 1n)
  }

  // Standard max uint256
  return toHex(maxUint256)
}
