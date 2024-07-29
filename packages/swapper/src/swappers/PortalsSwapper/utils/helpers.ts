import {
  arbitrumChainId,
  type AssetId,
  avalancheChainId,
  type ChainId,
  ethChainId,
  foxAssetId,
  // optimismChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'

import type { PortalsSupportedChainId } from '../types'
import { PortalsSupportedChainIds } from '../types'

export const isSupportedChainId = (chainId: ChainId): chainId is PortalsSupportedChainId => {
  return PortalsSupportedChainIds.includes(chainId as PortalsSupportedChainId)
}

export const getDummyQuoteParams = (chainId: ChainId) => {
  // @ts-ignore WIP
  // Assume a token sell/buy - inherently slightly more expensive than having a native asset either on the buy or sell side, which works in our favor as a buffer
  const DUMMY_QUOTE_PARAMS_BY_CHAIN_ID: Record<
    EvmChainId,
    {
      sellAssetId: AssetId
      sellAmountCryptoBaseUnit: string
      buyAssetId: AssetId
    }
  > = {
    [ethChainId]: {
      sellAssetId: foxAssetId,
      sellAmountCryptoBaseUnit: '100000000000000000000', // 100 FOX
      buyAssetId: 'eip155:1/erc20:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    },
    [avalancheChainId]: {
      sellAssetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab', // WETH
      sellAmountCryptoBaseUnit: '1000000000000000', // 0.001 WETH
      buyAssetId: 'eip155:43114/erc20:0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', // USDT
    },
    [arbitrumChainId]: {
      sellAssetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
      sellAmountCryptoBaseUnit: '3000000', // 3 USDC
      buyAssetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDT
    },
  }
  const dummySellAssetId = DUMMY_QUOTE_PARAMS_BY_CHAIN_ID[chainId as EvmChainId].sellAssetId
  const dummyAmountCryptoBaseUnit =
    DUMMY_QUOTE_PARAMS_BY_CHAIN_ID[chainId as EvmChainId].sellAmountCryptoBaseUnit
  const dummyAccountId = toAccountId({
    chainId,
    account: '0x267586F48043e159624c4FE24300c8ad2f352fc7', // well-enough funded addy with approvals granted for the assets above
  })

  return {
    accountId: dummyAccountId,
    accountAddress: '0x267586F48043e159624c4FE24300c8ad2f352fc7',
    sellAssetId: dummySellAssetId,
    sellAmountCryptoBaseUnit: dummyAmountCryptoBaseUnit,
  }
}
