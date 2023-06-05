import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { DisplayFeeData, GetFormFeesArgs, GetReceiveAddressArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import type { ProtocolFee, SwapperName, TradeBase, TradeQuote } from 'lib/swapper/api'

const moduleLogger = logger.child({ namespace: ['useSwapper', 'utils'] })

// used to handle market fluctations and variations in gas estimates (e.g shapeshift vs metamask) to prevent failed trades
const FEE_FLUCTUATION_DECIMAL_PERCENTAGE = 0.25

export const getSendMaxAmountCryptoPrecision = (
  sellAsset: Asset,
  feeAsset: Asset,
  quote: TradeQuote<KnownChainIds>,
  sellAssetBalanceCryptoBaseUnit: string,
  networkFeeRequiresBalance: boolean,
  isBuyingOsmoWithOmosisSwapper: boolean,
) => {
  // Only subtract fee if sell asset is the fee asset
  const isFeeAsset = feeAsset.assetId === sellAsset.assetId
  const protocolFee: ProtocolFee | undefined =
    quote.steps[0].feeData.protocolFees[sellAsset.assetId]

  const protocolFeeCryptoBaseUnit =
    protocolFee?.requiresBalance && !isBuyingOsmoWithOmosisSwapper
      ? bn(protocolFee.amountCryptoBaseUnit)
      : bn(0)

  const networkFeeCryptoBaseUnit =
    networkFeeRequiresBalance && isFeeAsset
      ? bnOrZero(quote.steps[0].feeData.networkFeeCryptoBaseUnit)
      : bn(0)

  const totalFeesCryptoBaseUnit = networkFeeCryptoBaseUnit.plus(protocolFeeCryptoBaseUnit)
  // sell asset balance minus expected fees = maxTradeAmount
  return positiveOrZero(
    fromBaseUnit(
      bnOrZero(sellAssetBalanceCryptoBaseUnit).minus(
        totalFeesCryptoBaseUnit.times(1 + FEE_FLUCTUATION_DECIMAL_PERCENTAGE),
      ),
      sellAsset.precision,
    ),
  ).toFixed()
}

const getEvmFees = <T extends EvmChainId>(
  trade: TradeBase<T>,
  feeAsset: Asset,
  tradeFeeSource: SwapperName,
): DisplayFeeData<EvmChainId> => {
  const networkFeeCryptoPrecision = bnOrZero(trade?.feeData?.networkFeeCryptoBaseUnit)
    .div(bn(10).exponentiatedBy(feeAsset.precision))
    .toFixed()

  return {
    tradeFeeSource,
    protocolFees: trade.feeData.protocolFees,
    networkFeeCryptoHuman: networkFeeCryptoPrecision,
    networkFeeCryptoBaseUnit: trade?.feeData?.networkFeeCryptoBaseUnit ?? '0',
  }
}

export const getFormFees = ({
  trade,
  sellAsset,
  tradeFeeSource,
  feeAsset,
}: GetFormFeesArgs): DisplayFeeData<KnownChainIds> => {
  const networkFeeCryptoHuman = fromBaseUnit(
    trade.feeData?.networkFeeCryptoBaseUnit,
    feeAsset.precision,
  )

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return getEvmFees(trade, feeAsset, tradeFeeSource)
    case CHAIN_NAMESPACE.CosmosSdk: {
      return {
        networkFeeCryptoHuman,
        networkFeeCryptoBaseUnit: trade.feeData.networkFeeCryptoBaseUnit ?? '0',
        protocolFees: trade.feeData.protocolFees,
        tradeFeeSource,
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      return {
        networkFeeCryptoHuman,
        networkFeeCryptoBaseUnit: trade.feeData.networkFeeCryptoBaseUnit,
        chainSpecific: trade.feeData.chainSpecific,
        protocolFees: trade.feeData.protocolFees,
        tradeFeeSource,
      }
    }
    default:
      throw new Error('Unsupported chain ' + sellAsset.chainId)
  }
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
