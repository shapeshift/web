import { CHAIN_NAMESPACE, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { cosmos, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import {
  BuildTradeInput,
  EvmSupportedChainAdapter,
  EvmSupportedChainIds,
  GetUtxoTradeQuoteInput,
  SwapError,
  SwapErrorType,
  TradeQuote,
  UtxoSupportedChainIds,
} from '../../../api'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { getThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import { ThorchainSwapperDeps, ThorTrade } from '../types'
import { getThorTxInfo as getBtcThorTxInfo } from '../utils/bitcoin/utils/getThorTxData'
import { getCosmosTxData } from '../utils/cosmos/getCosmosTxData'
import { makeTradeTx } from '../utils/evm/makeTradeTx'

type BuildTradeArgs = {
  deps: ThorchainSwapperDeps
  input: BuildTradeInput
}

export const buildTrade = async ({ deps, input }: BuildTradeArgs): Promise<ThorTrade<ChainId>> => {
  try {
    const {
      buyAsset,
      receiveAddress: destinationAddress,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      sellAsset,
      accountNumber,
      slippage: slippageTolerance = DEFAULT_SLIPPAGE,
      wallet,
      sendMax,
    } = input

    const quote = await getThorTradeQuote({ deps, input })
    const sellAdapter = deps.adapterManager.get(sellAsset.chainId)

    if (!sellAdapter)
      throw new SwapError('[buildTrade]: unsupported sell asset', {
        code: SwapErrorType.BUILD_TRADE_FAILED,
        fn: 'buildTrade',
        details: { sellAsset },
      })

    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    if (chainNamespace === CHAIN_NAMESPACE.Evm) {
      const ethTradeTx = await makeTradeTx({
        wallet,
        slippageTolerance,
        accountNumber,
        sellAsset,
        buyAsset,
        adapter: sellAdapter as unknown as EvmSupportedChainAdapter,
        sellAmountCryptoBaseUnit,
        destinationAddress,
        deps,
        gasPriceCryptoBaseUnit:
          (quote as TradeQuote<EvmSupportedChainIds>).feeData.chainSpecific
            ?.gasPriceCryptoBaseUnit ?? '0',
        gasLimit:
          (quote as TradeQuote<EvmSupportedChainIds>).feeData.chainSpecific?.estimatedGas ?? '0',
        buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
      })

      return {
        chainId: sellAsset.chainId as EvmSupportedChainIds,
        ...quote,
        receiveAddress: destinationAddress,
        txData: ethTradeTx.txToSign,
      }
    } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
      const { vault, opReturnData } = await getBtcThorTxInfo({
        deps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit,
        slippageTolerance,
        destinationAddress,
        xpub: (input as GetUtxoTradeQuoteInput).xpub,
        buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
      })

      const buildTxResponse = await (
        sellAdapter as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
      ).buildSendTransaction({
        value: sellAmountCryptoBaseUnit,
        wallet,
        to: vault,
        accountNumber,
        chainSpecific: {
          accountType: (input as GetUtxoTradeQuoteInput).accountType,
          satoshiPerByte: (quote as TradeQuote<UtxoSupportedChainIds>).feeData.chainSpecific
            .satsPerByte,
          opReturnData,
        },
        sendMax,
      })

      return {
        chainId: sellAsset.chainId as UtxoSupportedChainIds,
        ...quote,
        receiveAddress: destinationAddress,
        txData: buildTxResponse.txToSign,
      }
    } else if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
      const txData = await getCosmosTxData({
        accountNumber,
        deps,
        sellAdapter: sellAdapter as unknown as cosmos.ChainAdapter,
        sellAmountCryptoBaseUnit,
        sellAsset,
        slippageTolerance,
        chainId: input.chainId,
        buyAsset,
        wallet,
        destinationAddress,
        quote: quote as TradeQuote<KnownChainIds.CosmosMainnet>,
      })

      return {
        chainId: KnownChainIds.CosmosMainnet,
        ...quote,
        receiveAddress: destinationAddress,
        txData,
      }
    } else {
      throw new SwapError('[buildTrade]: unsupported chain id', {
        code: SwapErrorType.BUILD_TRADE_FAILED,
        fn: 'buildTrade',
        details: { sellAsset },
      })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[buildTrade]: error building trade', {
      code: SwapErrorType.BUILD_TRADE_FAILED,
      fn: 'buildTrade',
      cause: e,
    })
  }
}
