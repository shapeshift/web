import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { DisplayFeeData, GetFormFeesArgs, GetReceiveAddressArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import type { TradeBase, TradeQuote } from 'lib/swapper/api'
import { sumProtocolFeesForAssetCryptoBaseUnit } from 'state/zustand/swapperStore/utils'

import { isCosmosSdkTrade, isEvmTrade, isUtxoTrade } from './typeGuards'

const moduleLogger = logger.child({ namespace: ['useSwapper', 'utils'] })

export const getSendMaxAmountCryptoPrecision = (
  sellAsset: Asset,
  feeAsset: Asset,
  quote: TradeQuote<ChainId>,
  sellAssetBalanceCryptoBaseUnit: string,
  networkFeeRequiresBalance: boolean,
  isBuyingOsmoWithOmosisSwapper: boolean,
) => {
  // Only subtract fee if sell asset is the fee asset
  const isFeeAsset = feeAsset.assetId === sellAsset.assetId
  const protocolFeeTotalForSellAssetCryptoBaseUnit = sumProtocolFeesForAssetCryptoBaseUnit(
    sellAsset,
    quote.steps,
    true,
  )
  const networkFeeCryptoBaseUnit = bnOrZero(quote.steps[0].feeData.networkFeeCryptoBaseUnit)
  // sell asset balance minus expected fees = maxTradeAmount
  return positiveOrZero(
    fromBaseUnit(
      bnOrZero(sellAssetBalanceCryptoBaseUnit)
        // only subtract if sell asset is fee asset
        .minus(networkFeeRequiresBalance && isFeeAsset ? networkFeeCryptoBaseUnit : 0)
        // subtract protocol fee if required
        .minus(
          // TEMP: handle osmosis protocol fee payable on buy side for specific case until we implement general solution
          !isBuyingOsmoWithOmosisSwapper ? protocolFeeTotalForSellAssetCryptoBaseUnit : 0,
        )
        .times(0.99), // reduce the computed amount by 1% to ensure we don't exceed the max
      sellAsset.precision,
    ),
  ).toFixed()
}

// creates an object representing a summary of the fees for a single trade step
export const getFormFees = ({
  tradeStep,
  tradeFeeSource,
  feeAsset,
}: GetFormFeesArgs): DisplayFeeData<KnownChainIds> => {
  const networkFeeCryptoHuman = fromBaseUnit(
    tradeStep.feeData?.networkFeeCryptoBaseUnit,
    feeAsset.precision,
  )

  if (isUtxoTrade(tradeStep) || isCosmosSdkTrade(tradeStep)) {
    return {
      networkFeeCryptoHuman,
      networkFeeCryptoBaseUnit: tradeStep.feeData.networkFeeCryptoBaseUnit,
      chainSpecific: tradeStep.feeData.chainSpecific,
      protocolFees: tradeStep.feeData.protocolFees,
      tradeFeeSource,
    }
  }

  if (isEvmTrade(tradeStep)) {
    return {
      tradeFeeSource,
      protocolFees: tradeStep.feeData.protocolFees,
      networkFeeCryptoHuman,
      networkFeeCryptoBaseUnit: tradeStep?.feeData?.networkFeeCryptoBaseUnit ?? '0',
    }
  }

  throw new Error('Unsupported chain ' + (tradeStep as TradeBase<ChainId>).sellAsset.chainId)
}

export const getReceiveAddress = async ({
  asset,
  wallet,
  accountMetadata,
}: GetReceiveAddressArgs): Promise<string | undefined> => {
  const { chainId } = fromAssetId(asset.assetId)
  const { accountType, bip44Params } = accountMetadata
  const chainAdapter = getChainAdapterManager().get(chainId)
  if (!(chainAdapter && wallet)) return
  const { accountNumber } = bip44Params
  try {
    return await chainAdapter.getAddress({ wallet, accountNumber, accountType })
  } catch (e) {
    moduleLogger.info(e, 'No receive address for buy asset, using default asset pair')
  }
}
