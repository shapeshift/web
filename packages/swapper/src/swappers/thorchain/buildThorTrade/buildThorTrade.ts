import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkBaseAdapter,
  EvmBaseAdapter,
  UtxoBaseAdapter,
} from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  BuildTradeInput,
  GetUtxoTradeQuoteInput,
  SwapErrorRight,
  TradeQuote,
} from '../../../api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from '../../../api'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { getCosmosTxData } from '../cosmossdk/getCosmosTxData'
import { makeTradeTx } from '../evm/makeTradeTx'
import { getThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import type {
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainId,
  ThorUtxoSupportedChainId,
} from '../ThorchainSwapper'
import type { ThorchainSwapperDeps, ThorTrade } from '../types'
import { getThorTxInfo } from '../utxo/utils/getThorTxData'

type BuildTradeArgs = {
  deps: ThorchainSwapperDeps
  input: BuildTradeInput
}

export const buildTrade = async ({
  deps,
  input,
}: BuildTradeArgs): Promise<Result<ThorTrade<ChainId>, SwapErrorRight>> => {
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

    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    const sellAdapter = deps.adapterManager.get(sellAsset.chainId)

    if (!sellAdapter)
      return Err(
        makeSwapErrorRight({
          message: '[buildTrade]: unsupported sell asset',
          code: SwapErrorType.BUILD_TRADE_FAILED,
          details: { sellAsset },
        }),
      )

    const maybeQuote = await getThorTradeQuote({ deps, input })

    if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())

    const quote = maybeQuote.unwrap()

    if (chainNamespace === CHAIN_NAMESPACE.Evm) {
      const maybeEthTradeTx = await makeTradeTx({
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
          (quote as TradeQuote<ThorEvmSupportedChainId>).feeData.chainSpecific
            ?.estimatedGasCryptoBaseUnit ?? '0',
        buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
      })

      return maybeEthTradeTx.map(ethTradeTx => ({
        chainId: sellAsset.chainId as ThorEvmSupportedChainId,
        ...quote,
        receiveAddress: destinationAddress,
        txData: ethTradeTx.txToSign,
      }))
    } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
      const maybethorTxInfo = await getThorTxInfo({
        deps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit,
        slippageTolerance,
        destinationAddress,
        xpub: (input as GetUtxoTradeQuoteInput).xpub,
        buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
      })

      if (maybethorTxInfo.isErr()) return Err(maybethorTxInfo.unwrapErr())
      const { vault, opReturnData } = maybethorTxInfo.unwrap()

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

      return Ok({
        chainId: sellAsset.chainId as ThorUtxoSupportedChainId,
        ...quote,
        receiveAddress: destinationAddress,
        txData: buildTxResponse.txToSign,
      })
    } else if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
      const maybeTxData = await getCosmosTxData({
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

      return maybeTxData.map(txData => ({
        chainId: sellAsset.chainId as ThorCosmosSdkSupportedChainId,
        ...quote,
        receiveAddress: destinationAddress,
        txData,
      }))
    } else {
      return Err(
        makeSwapErrorRight({
          message: '[buildTrade]: unsupported chain id',
          code: SwapErrorType.BUILD_TRADE_FAILED,
          details: { sellAsset },
        }),
      )
    }
    // TODO(gomes): once again, scrutinize where we can throw and don't.
  } catch (e) {
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade]: error building trade',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        cause: e,
      }),
    )
  }
}
