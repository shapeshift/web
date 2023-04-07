import { CHAIN_NAMESPACE, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import {
  CosmosSdkBaseAdapter,
  EvmBaseAdapter,
  UtxoBaseAdapter,
} from '@shapeshiftoss/chain-adapters'

import {
  BuildTradeInput,
  GetUtxoTradeQuoteInput,
  SwapError,
  SwapErrorType,
  TradeQuote,
} from '../../../api'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { getCosmosTxData } from '../cosmossdk/getCosmosTxData'
import { makeTradeTx } from '../evm/makeTradeTx'
import { getThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import {
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainId,
  ThorUtxoSupportedChainId,
} from '../ThorchainSwapper'
import { ThorchainSwapperDeps, ThorTrade } from '../types'
import { getThorTxInfo } from '../utxo/utils/getThorTxData'

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
        adapter: sellAdapter as unknown as EvmBaseAdapter<ThorEvmSupportedChainId>,
        sellAmountCryptoBaseUnit,
        destinationAddress,
        deps,
        gasPriceCryptoBaseUnit:
          (quote as TradeQuote<ThorEvmSupportedChainId>).feeData.chainSpecific
            ?.gasPriceCryptoBaseUnit ?? '0',
        gasLimit:
          (quote as TradeQuote<ThorEvmSupportedChainId>).feeData.chainSpecific?.estimatedGas ?? '0',
        buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
      })

      return {
        chainId: sellAsset.chainId as ThorEvmSupportedChainId,
        ...quote,
        receiveAddress: destinationAddress,
        txData: ethTradeTx.txToSign,
      }
    } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
      const { vault, opReturnData } = await getThorTxInfo({
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
        sellAdapter as unknown as UtxoBaseAdapter<ThorUtxoSupportedChainId>
      ).buildSendTransaction({
        value: sellAmountCryptoBaseUnit,
        wallet,
        to: vault,
        accountNumber,
        chainSpecific: {
          accountType: (input as GetUtxoTradeQuoteInput).accountType,
          satoshiPerByte: (quote as TradeQuote<ThorUtxoSupportedChainId>).feeData.chainSpecific
            .satsPerByte,
          opReturnData,
        },
        sendMax,
      })

      return {
        chainId: sellAsset.chainId as ThorUtxoSupportedChainId,
        ...quote,
        receiveAddress: destinationAddress,
        txData: buildTxResponse.txToSign,
      }
    } else if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
      const txData = await getCosmosTxData({
        accountNumber,
        deps,
        sellAdapter: sellAdapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>,
        sellAmountCryptoBaseUnit,
        sellAsset,
        slippageTolerance,
        chainId: input.chainId,
        buyAsset,
        wallet,
        destinationAddress,
        quote: quote as TradeQuote<ThorCosmosSdkSupportedChainId>,
      })

      return {
        chainId: sellAsset.chainId as ThorCosmosSdkSupportedChainId,
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
