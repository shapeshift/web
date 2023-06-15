import type { AssetId } from '@shapeshiftoss/caip'
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
import { KnownChainIds } from '@shapeshiftoss/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { GetTradeQuoteInput, TradeQuote } from 'lib/swapper/api'

/**
 * This function keeps 17 significant digits, so even if we try to trade 1 Billion of an
 * ETH or ERC20, we still keep 7 decimal places.
 * @param amount
 */
export const normalizeAmount = (amount: string | number | BigNumber): string => {
  return bnOrZero(amount).toNumber().toLocaleString('fullwide', { useGrouping: false })
}

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

export const createEmptyEvmTradeQuote = (
  input: GetTradeQuoteInput,
  minimumCryptoHuman: string,
): TradeQuote<EvmChainId, true> => {
  return {
    minimumCryptoHuman,
    steps: [
      {
        allowanceContract: '',
        buyAmountBeforeFeesCryptoBaseUnit: '0',
        sellAmountBeforeFeesCryptoBaseUnit: input.sellAmountBeforeFeesCryptoBaseUnit,
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
