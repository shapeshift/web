import { KnownChainIds } from '@shapeshiftoss/types'
import type { Address } from 'viem'
import { parseAbi } from 'viem'

// https://cleave.fi/developers#contract-addresses
export const CLEAVE_CHAINS = {
  [KnownChainIds.EthereumMainnet]: {
    swapShell: '0x016750b998aab0b4b07aa6a2276335053a798758',
    wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  [KnownChainIds.ArbitrumMainnet]: {
    swapShell: '0x4052700f83324be5710d187b7bbea9837dffa8fc',
    wrappedNative: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  },
  [KnownChainIds.BaseMainnet]: {
    swapShell: '0xb08f28a3575805ee1e3729fc19ab7e869cbaf563',
    wrappedNative: '0x4200000000000000000000000000000000000006',
  },
  [KnownChainIds.OptimismMainnet]: {
    swapShell: '0xb08f28a3575805ee1e3729fc19ab7e869cbaf563',
    wrappedNative: '0x4200000000000000000000000000000000000006',
  },
  [KnownChainIds.PolygonMainnet]: {
    swapShell: '0x5b4a223d8489a3b97d4ebe8fe93c6a7ac3ec1ad6',
    wrappedNative: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  },
  [KnownChainIds.BnbSmartChainMainnet]: {
    swapShell: '0x48dd089939c9a29211e7de9417e91a141d37f697',
    wrappedNative: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  },
} as const satisfies Record<string, { swapShell: Address; wrappedNative: Address }>

export type CleaveSupportedChainId = keyof typeof CLEAVE_CHAINS

export const CLEAVE_NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
export const CLEAVE_MAX_REFERRAL_BPS = 100
export const CLEAVE_DEADLINE_SECONDS = 15 * 60

export const CLEAVE_SWAP_SHELL_ABI = parseAbi([
  'function swapWithBlob((address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline, address recipient, address referrer, uint16 referralFeeBps, bool wethAsErc20) params, bytes blob)',
])
