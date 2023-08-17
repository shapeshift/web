import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bscAssetId,
  ethAssetId,
  fromAssetId,
  gnosisAssetId,
  optimismAssetId,
  polygonAssetId,
} from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import {
  DAO_TREASURY_AVALANCHE,
  DAO_TREASURY_BSC,
  DAO_TREASURY_ETHEREUM_MAINNET,
  DAO_TREASURY_GNOSIS,
  DAO_TREASURY_OPTIMISM,
  DAO_TREASURY_POLYGON,
} from 'constants/treasury'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { GetTradeQuoteInput, TradeQuote } from 'lib/swapper/api'

export const normalizeIntegerAmount = (amount: string | number | BigNumber): string => {
  return bnOrZero(amount)
    .integerValue()
    .toNumber()
    .toLocaleString('fullwide', { useGrouping: false })
}

export const isNativeEvmAsset = (assetId: AssetId): boolean => {
  const { chainId } = fromAssetId(assetId)
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return assetId === ethAssetId
    case KnownChainIds.AvalancheMainnet:
      return assetId === avalancheAssetId
    case KnownChainIds.OptimismMainnet:
      return assetId === optimismAssetId
    case KnownChainIds.BnbSmartChainMainnet:
      return assetId === bscAssetId
    case KnownChainIds.PolygonMainnet:
      return assetId === polygonAssetId
    case KnownChainIds.GnosisMainnet:
      return assetId === gnosisAssetId
    default:
      return false
  }
}

export const createEmptyEvmTradeQuote = (input: GetTradeQuoteInput): TradeQuote<EvmChainId> => {
  return {
    rate: '0',
    steps: [
      {
        allowanceContract: '',
        buyAmountBeforeFeesCryptoBaseUnit: '0',
        sellAmountIncludingProtocolFeesCryptoBaseUnit:
          input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        feeData: {
          networkFeeCryptoBaseUnit: undefined,
          protocolFees: {},
        },
        rate: '0',
        sources: [],
        buyAsset: input.buyAsset,
        sellAsset: input.sellAsset,
        accountNumber: input.accountNumber,
      },
    ],
  }
}

const DAO_TREASURY_BY_CHAIN_ID: Record<EvmChainId, string> = {
  [KnownChainIds.EthereumMainnet]: DAO_TREASURY_ETHEREUM_MAINNET,
  [KnownChainIds.OptimismMainnet]: DAO_TREASURY_OPTIMISM,
  [KnownChainIds.AvalancheMainnet]: DAO_TREASURY_AVALANCHE,
  [KnownChainIds.PolygonMainnet]: DAO_TREASURY_POLYGON,
  [KnownChainIds.GnosisMainnet]: DAO_TREASURY_GNOSIS,
  [KnownChainIds.BnbSmartChainMainnet]: DAO_TREASURY_BSC,
}

export const getTreasuryAddressFromChainId = (chainId: ChainId): string => {
  const maybeEvmChainId = isEvmChainId(chainId) ? chainId : undefined
  const treasuryAddress = maybeEvmChainId ? DAO_TREASURY_BY_CHAIN_ID[maybeEvmChainId] : undefined
  if (!treasuryAddress)
    throw new Error(`[getTreasuryAddressFromChainId] - Unsupported chainId: ${chainId}`)
  return treasuryAddress
}
