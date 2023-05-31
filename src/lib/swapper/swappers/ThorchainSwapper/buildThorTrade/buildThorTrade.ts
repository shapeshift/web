import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type {
  BuildTradeInput,
  GetUtxoTradeQuoteInput,
  QuoteFeeData,
  SwapErrorRight,
  TradeQuote,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { getCosmosTxData } from 'lib/swapper/swappers/ThorchainSwapper/cosmossdk/getCosmosTxData'
import { makeTradeTx } from 'lib/swapper/swappers/ThorchainSwapper/evm/makeTradeTx'
import { getThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import type {
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainAdapter,
  ThorEvmSupportedChainId,
  ThorUtxoSupportedChainId,
} from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import type { ThorchainSwapperDeps, ThorTrade } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import { DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'

type BuildTradeArgs = {
  deps: ThorchainSwapperDeps
  input: BuildTradeInput
}

export const buildTrade = async ({
  deps,
  input,
}: BuildTradeArgs): Promise<Result<ThorTrade<ChainId>, SwapErrorRight>> => {
  const {
    buyAsset,
    receiveAddress: destinationAddress,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
    accountNumber,
    slippage: slippageTolerance = DEFAULT_SLIPPAGE,
    wallet,
    sendMax,
    affiliateBps = '0',
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

  // A THORChain quote can be gotten without a destinationAddress, but a trade cannot be built without one.
  if (!destinationAddress)
    return Err(
      makeSwapErrorRight({
        message: '[buildThorTrade]: destinationAddress is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )

  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    const maybeEthTradeTx = await makeTradeTx({
      wallet,
      slippageTolerance,
      accountNumber,
      sellAsset,
      buyAsset,
      adapter: sellAdapter as unknown as ThorEvmSupportedChainAdapter,
      sellAmountCryptoBaseUnit,
      destinationAddress,
      feeData: quote.steps[0].feeData as QuoteFeeData<ThorEvmSupportedChainId>,
      deps,
      affiliateBps,
    })

    return maybeEthTradeTx.andThen(ethTradeTx =>
      Ok({
        chainId: sellAsset.chainId as ThorEvmSupportedChainId,
        ...quote.steps[0],
        receiveAddress: destinationAddress,
        txData: ethTradeTx.txToSign,
      }),
    )
  } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
    const maybeThorTxInfo = await getThorTxInfo({
      deps,
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit,
      slippageTolerance,
      destinationAddress,
      xpub: (input as GetUtxoTradeQuoteInput).xpub,
      protocolFees: quote.steps[0].feeData.protocolFees,
      affiliateBps,
    })

    if (maybeThorTxInfo.isErr()) return Err(maybeThorTxInfo.unwrapErr())
    const { vault, opReturnData } = maybeThorTxInfo.unwrap()

    const buildTxResponse = await (
      sellAdapter as unknown as UtxoBaseAdapter<ThorUtxoSupportedChainId>
    ).buildSendTransaction({
      value: sellAmountCryptoBaseUnit,
      wallet,
      to: vault,
      accountNumber,
      chainSpecific: {
        accountType: (input as GetUtxoTradeQuoteInput).accountType,
        satoshiPerByte: (quote as TradeQuote<ThorUtxoSupportedChainId>).steps[0].feeData
          .chainSpecific.satsPerByte,
        opReturnData,
      },
      sendMax,
    })

    return Ok({
      chainId: sellAsset.chainId as ThorUtxoSupportedChainId,
      ...quote.steps[0],
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
      affiliateBps,
    })

    return maybeTxData.andThen(txData =>
      Ok({
        chainId: sellAsset.chainId as ThorCosmosSdkSupportedChainId,
        ...quote.steps[0],
        receiveAddress: destinationAddress,
        txData,
      }),
    )
  } else {
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade]: unsupported chain id',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { sellAsset },
      }),
    )
  }
}
