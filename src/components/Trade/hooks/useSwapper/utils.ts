import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { GetReceiveAddressArgs } from 'components/Trade/types'
import { type DisplayFeeData, type GetFormFeesArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { type Asset } from 'lib/asset-service'
import { bn, bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import type { ProtocolFee, SwapperName, Trade, TradeQuote } from 'lib/swapper/api'

const moduleLogger = logger.child({ namespace: ['useSwapper', 'utils'] })

// Pure functions

export const getSendMaxAmountCryptoPrecision = (
  sellAsset: Asset,
  feeAsset: Asset,
  quote: TradeQuote<KnownChainIds>,
  sellAssetBalanceCryptoBaseUnit: string,
  networkFeeRequiresBalance: boolean,
) => {
  // Only subtract fee if sell asset is the fee asset
  const isFeeAsset = feeAsset.assetId === sellAsset.assetId
  const protocolFee: ProtocolFee | undefined = quote.feeData.protocolFees[sellAsset.assetId]
  const networkFeeCryptoBaseUnit = bnOrZero(quote.feeData.networkFeeCryptoBaseUnit)
  // sell asset balance minus expected fees = maxTradeAmount
  return positiveOrZero(
    fromBaseUnit(
      bnOrZero(sellAssetBalanceCryptoBaseUnit)
        // only subtract if sell asset is fee asset
        .minus(networkFeeRequiresBalance && isFeeAsset ? networkFeeCryptoBaseUnit : 0)
        // subtract protocol fee if required
        .minus(protocolFee?.requiresBalance ? protocolFee.amountCryptoBaseUnit : 0)
        .times(0.99), // reduce the computed amount by 1% to ensure we don't exceed the max
      sellAsset.precision,
    ),
  ).toFixed()
}

const getEvmFees = <T extends EvmChainId>(
  trade: Trade<T> | TradeQuote<T>,
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
    trade?.feeData?.networkFeeCryptoBaseUnit,
    feeAsset.precision,
  )

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return getEvmFees(
        trade as Trade<EvmChainId> | TradeQuote<EvmChainId>,
        feeAsset,
        tradeFeeSource,
      )
    case CHAIN_NAMESPACE.CosmosSdk: {
      return {
        networkFeeCryptoHuman,
        networkFeeCryptoBaseUnit: trade.feeData.networkFeeCryptoBaseUnit ?? '0',
        protocolFees: trade.feeData.protocolFees,
        tradeFeeSource,
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const utxoTrade = trade as Trade<UtxoChainId>
      return {
        networkFeeCryptoHuman,
        networkFeeCryptoBaseUnit: utxoTrade.feeData.networkFeeCryptoBaseUnit,
        chainSpecific: utxoTrade.feeData.chainSpecific,
        protocolFees: utxoTrade.feeData.protocolFees,
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
