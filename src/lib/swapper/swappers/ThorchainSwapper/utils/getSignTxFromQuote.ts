import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkBaseAdapter,
  EvmChainAdapter,
  utxo,
  UtxoBaseAdapter,
} from '@shapeshiftoss/chain-adapters'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { TradeQuote, UnsignedTx2 } from 'lib/swapper/api'
import { getCosmosTxData } from 'lib/swapper/swappers/ThorchainSwapper/cosmossdk/getCosmosTxData'
import type { ThorEvmTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import type {
  ThorCosmosSdkSupportedChainId,
  ThorUtxoSupportedChainId,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import { assertUnreachable } from 'lib/utils'
import { createBuildCustomApiTxInput } from 'lib/utils/evm'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { getQuote } from './getQuote/getQuote'

type GetSignTxFromQuoteArgs = {
  tradeQuote: TradeQuote
  receiveAddress: string
  affiliateBps?: string
  chainSpecific?: utxo.BuildTxInput
  buyAssetUsdRate: string
  feeAssetUsdRate: string
  supportsEIP1559: boolean
  slippageTolerancePercentage: string
} & ({ from: string; xpub?: never } | { from?: never; xpub: string })

export const getSignTxFromQuote = async ({
  tradeQuote: quote,
  receiveAddress,
  affiliateBps = '0',
  chainSpecific,
  buyAssetUsdRate,
  feeAssetUsdRate,
  from,
  xpub,
  supportsEIP1559,
  slippageTolerancePercentage,
}: GetSignTxFromQuoteArgs): Promise<UnsignedTx2> => {
  const { recommendedSlippage } = quote

  const slippageTolerance = slippageTolerancePercentage ?? recommendedSlippage

  const {
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
    accountNumber,
  } = quote.steps[0]

  const chainAdapterManager = getChainAdapterManager()
  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  const adapter = chainAdapterManager.get(sellAsset.chainId)

  // A THORChain quote can be gotten without a receiveAddress, but a trade cannot be built without one.
  if (!receiveAddress) throw Error('receiveAddress is required')
  if (!adapter) throw Error('unsupported sell asset')

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const evmChainAdapter = adapter as unknown as EvmChainAdapter
      const { router, data } = quote as ThorEvmTradeQuote
      const buildCustomTxInput = await createBuildCustomApiTxInput({
        accountNumber,
        adapter: evmChainAdapter,
        from: from!,
        to: router,
        value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
        data,
        supportsEIP1559,
      })
      return evmChainAdapter.buildCustomApiTx(buildCustomTxInput)
    }

    case CHAIN_NAMESPACE.CosmosSdk: {
      const maybeThornodeQuote = await getQuote({
        sellAsset,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit,
        receiveAddress,
        affiliateBps,
      })

      if (maybeThornodeQuote.isErr()) throw maybeThornodeQuote.unwrapErr()

      const cosmosSdkChainAdapter =
        adapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
      const maybeTxData = await getCosmosTxData({
        accountNumber,
        sellAdapter: cosmosSdkChainAdapter,
        sellAmountCryptoBaseUnit,
        sellAsset,
        slippageTolerance,
        chainId: sellAsset.chainId,
        buyAsset,
        from: from!,
        destinationAddress: receiveAddress,
        quote: quote as TradeQuote<ThorCosmosSdkSupportedChainId>,
        affiliateBps,
        buyAssetUsdRate,
        feeAssetUsdRate,
        thornodeQuote: maybeThornodeQuote.unwrap(),
      })

      if (maybeTxData.isErr()) throw maybeTxData.unwrapErr()

      return maybeTxData.unwrap()
    }

    case CHAIN_NAMESPACE.Utxo: {
      const maybeThornodeQuote = await getQuote({
        sellAsset,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit,
        receiveAddress,
        affiliateBps,
      })

      if (maybeThornodeQuote.isErr()) throw maybeThornodeQuote.unwrapErr()

      const utxoChainAdapter = adapter as unknown as UtxoBaseAdapter<ThorUtxoSupportedChainId>
      if (!chainSpecific) throw Error('missing UTXO chainSpecific parameters')

      const maybeThorTxInfo = await getThorTxInfo({
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit,
        slippageTolerance,
        destinationAddress: receiveAddress,
        xpub: xpub!,
        protocolFees: quote.steps[0].feeData.protocolFees,
        affiliateBps,
        buyAssetUsdRate,
        feeAssetUsdRate,
        thornodeQuote: maybeThornodeQuote.unwrap(),
      })

      if (maybeThorTxInfo.isErr()) throw maybeThorTxInfo.unwrapErr()

      const { vault, opReturnData } = maybeThorTxInfo.unwrap()

      return utxoChainAdapter.buildSendApiTransaction({
        value: sellAmountCryptoBaseUnit,
        xpub: xpub!,
        to: vault,
        accountNumber,
        chainSpecific: {
          ...chainSpecific,
          opReturnData,
        },
      })
    }

    default:
      assertUnreachable(chainNamespace)
  }
}
