import { type AssetId, type ChainId, foxAssetId, toAccountId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { PortalsSupportedChainId } from '../types'
import { PortalsSupportedChainIds } from '../types'

const WELL_FUNDED_ADDRESS = '0x267586F48043e159624c4FE24300c8ad2f352fc7'

export const isSupportedChainId = (chainId: ChainId): chainId is PortalsSupportedChainId => {
  return PortalsSupportedChainIds.includes(chainId as PortalsSupportedChainId)
}

export const getDummyQuoteParams = (chainId: ChainId) => {
  // Assume a token sell/buy - inherently slightly more expensive than having a native asset either on the buy or sell side, which works in our favor as a buffer
  const DUMMY_QUOTE_PARAMS_BY_CHAIN_ID: Record<
    Exclude<EvmChainId, KnownChainIds.ArbitrumNovaMainnet>,
    {
      sellAssetId: AssetId
      sellAmountCryptoBaseUnit: string
      buyAssetId: AssetId
    }
  > = {
    [KnownChainIds.EthereumMainnet]: {
      sellAssetId: foxAssetId,
      sellAmountCryptoBaseUnit: '100000000000000000000', // 100 FOX
      buyAssetId: 'eip155:1/erc20:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    },
    [KnownChainIds.AvalancheMainnet]: {
      sellAssetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab', // WETH
      sellAmountCryptoBaseUnit: '1000000000000000', // 0.001 WETH
      buyAssetId: 'eip155:43114/erc20:0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', // USDT
    },
    [KnownChainIds.ArbitrumMainnet]: {
      sellAssetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
      sellAmountCryptoBaseUnit: '3000000', // 3 USDC
      buyAssetId: 'eip155:42161/erc20:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
    },
    [KnownChainIds.PolygonMainnet]: {
      sellAssetId: 'eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // 5 USDC
      sellAmountCryptoBaseUnit: '5000000', // 5 USDC
      buyAssetId: 'eip155:137/erc20:0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
    },
    [KnownChainIds.OptimismMainnet]: {
      sellAssetId: 'eip155:10/erc20:0x0b2c639c533813f4aa9d7837caf62653d097ff85', // USDC
      sellAmountCryptoBaseUnit: '1000000', // 1 USDC
      buyAssetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000006', // WETH
    },
    [KnownChainIds.BnbSmartChainMainnet]: {
      sellAssetId: 'eip155:56/bep20:0xc5f0f7b66764f6ec8c8dff7ba683102295e16409', // FDUSD
      sellAmountCryptoBaseUnit: '1000000000000000000', // 1 FDUSD
      buyAssetId: 'eip155:56/bep20:0x2170ed0880ac9a755fd29b2688956bd959f933f8', // WETH
    },
    [KnownChainIds.BaseMainnet]: {
      sellAssetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
      sellAmountCryptoBaseUnit: '2000000', // 2 USDC
      buyAssetId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006', // WETH
    },
    [KnownChainIds.GnosisMainnet]: {
      sellAssetId: 'eip155:250/erc20:0x6b175474e89094c44da98b954eedeac495271d0f', // WETH
      sellAmountCryptoBaseUnit: '1000000000000000', // 0.001 WETH
      buyAssetId: 'eip155:100/erc20:0x8e5bbbb09ed1ebde8674cda39a0c169401db4252', // WBTC
    },
  }
  const params =
    DUMMY_QUOTE_PARAMS_BY_CHAIN_ID[
      chainId as Exclude<EvmChainId, KnownChainIds.ArbitrumNovaMainnet>
    ]
  const dummySellAssetId = params.sellAssetId
  const dummyBuyAssetId = params.buyAssetId
  const dummyAmountCryptoBaseUnit = params.sellAmountCryptoBaseUnit
  const dummyAccountId = toAccountId({
    chainId,
    account: WELL_FUNDED_ADDRESS, // well-enough funded addy with approvals granted for the assets above
  })

  return {
    accountId: dummyAccountId,
    accountAddress: WELL_FUNDED_ADDRESS,
    sellAssetId: dummySellAssetId,
    buyAssetId: dummyBuyAssetId,
    sellAmountCryptoBaseUnit: dummyAmountCryptoBaseUnit,
  }
}
