import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
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
  Rates,
  ThorChainId,
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainAdapter,
  ThorEvmSupportedChainId,
  ThorTrade,
  ThorUtxoSupportedChainId,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import { DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'

export const buildTrade = async (
  input: BuildTradeInput,
  rates: Rates,
): Promise<Result<ThorTrade<ThorChainId>, SwapErrorRight>> => {
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

  const { buyAssetUsdRate, feeAssetUsdRate } = rates

  const chainAdapterManager = getChainAdapterManager()
  const sellAdapter = chainAdapterManager.get(sellAsset.chainId)

  if (!sellAdapter) {
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade]: unsupported sell asset',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { sellAsset },
      }),
    )
  }

  // A THORChain quote can be gotten without a destinationAddress, but a trade cannot be built without one.
  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[buildThorTrade]: receiveAddress is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  const maybeQuote = await getThorTradeQuote(input, rates)

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    const evmQuote = quote as ThorEvmTradeQuote

    if (!supportsETH(wallet)) throw new Error('eth wallet required')

    const adapter = sellAdapter as unknown as ThorEvmSupportedChainAdapter

    const supportsEIP1559 = await wallet.ethSupportsEIP1559()
    const from = await adapter.getAddress({ accountNumber, wallet })
    const maybeEthTradeTx = await makeTradeTx({
      accountNumber,
      adapter,
      data: evmQuote.data,
      router: evmQuote.router,
      sellAmountCryptoBaseUnit,
      sellAsset,
      from,
      supportsEIP1559,
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
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit,
      slippageTolerance,
      destinationAddress: receiveAddress,
      xpub: (input as GetUtxoTradeQuoteInput).xpub,
      protocolFees: quote.steps[0].feeData.protocolFees,
      affiliateBps,
      buyAssetUsdRate,
      feeAssetUsdRate,
    })

    if (maybeThorTxInfo.isErr()) return Err(maybeThorTxInfo.unwrapErr())
    const { vault, opReturnData } = maybeThorTxInfo.unwrap()

    const adapter = sellAdapter as unknown as UtxoBaseAdapter<ThorUtxoSupportedChainId>
    const { xpub } = await adapter.getPublicKey(
      wallet,
      accountNumber,
      (input as GetUtxoTradeQuoteInput).accountType,
    )

    const buildTxResponse = await adapter.buildSendApiTransaction({
      xpub,
      value: sellAmountCryptoBaseUnit,
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
      txData: buildTxResponse,
    })
  } else if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
    const from = await sellAdapter.getAddress({ accountNumber, wallet })

    const maybeTxData = await getCosmosTxData({
      accountNumber,
      sellAdapter: sellAdapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>,
      sellAmountCryptoBaseUnit,
      sellAsset,
      slippageTolerance,
      chainId: input.chainId,
      buyAsset,
      from,
      destinationAddress: receiveAddress,
      quote: quote as TradeQuote<ThorCosmosSdkSupportedChainId>,
      affiliateBps,
      buyAssetUsdRate,
      feeAssetUsdRate,
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
