import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type {
  BuildTradeInput,
  GetUtxoTradeQuoteInput,
  SwapErrorRight,
  TradeQuote,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { getCosmosTxData } from 'lib/swapper/swappers/ThorchainSwapper/cosmossdk/getCosmosTxData'
import { makeTradeTx } from 'lib/swapper/swappers/ThorchainSwapper/evm/makeTradeTx'
import type { ThorEvmTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
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
    receiveAddress,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
    accountNumber,
    slippage: slippageTolerance = DEFAULT_SLIPPAGE,
    wallet,
    affiliateBps = '0',
  } = input

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  const sellAdapter = deps.adapterManager.get(sellAsset.chainId)

  if (!sellAdapter) {
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade]: unsupported sell asset',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { sellAsset },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[buildThorTrade]: receiveAddress is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  const maybeQuote = await getThorTradeQuote({ deps, input })
  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    const evmQuote = quote as ThorEvmTradeQuote

    const maybeEthTradeTx = await makeTradeTx({
      accountNumber,
      adapter: sellAdapter as unknown as ThorEvmSupportedChainAdapter,
      data: evmQuote.data,
      router: evmQuote.router,
      sellAmountCryptoBaseUnit,
      sellAsset,
      wallet,
    })

    if (maybeEthTradeTx.isErr()) return Err(maybeEthTradeTx.unwrapErr())
    const ethTradeTx = maybeEthTradeTx.unwrap()

    return Ok({
      chainId: sellAsset.chainId as ThorEvmSupportedChainId,
      ...evmQuote.steps[0],
      receiveAddress,
      txData: ethTradeTx.txToSign,
    })
  } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
    const maybeThorTxInfo = await getThorTxInfo({
      deps,
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit,
      slippageTolerance,
      destinationAddress: receiveAddress,
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
    })

    return Ok({
      chainId: sellAsset.chainId as ThorUtxoSupportedChainId,
      ...quote.steps[0],
      receiveAddress,
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
      destinationAddress: receiveAddress,
      quote: quote as TradeQuote<ThorCosmosSdkSupportedChainId>,
      affiliateBps,
    })

    return maybeTxData.andThen(txData =>
      Ok({
        chainId: sellAsset.chainId as ThorCosmosSdkSupportedChainId,
        ...quote.steps[0],
        receiveAddress,
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
