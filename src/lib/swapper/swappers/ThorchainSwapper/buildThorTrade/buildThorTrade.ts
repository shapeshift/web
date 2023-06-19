import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { UtxoAccountType } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuildTradeInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
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
import type { ThorTrade } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import { DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'

export const buildTrade = async (
  input: BuildTradeInput,
  {
    sellAssetUsdRate,
    buyAssetUsdRate,
    feeAssetUsdRate,
  }: { sellAssetUsdRate: string; buyAssetUsdRate: string; feeAssetUsdRate: string },
): Promise<Result<ThorTrade<ChainId>, SwapErrorRight>> => {
  const maybeQuote = await getThorTradeQuote(input, {
    sellAssetUsdRate,
    buyAssetUsdRate,
    feeAssetUsdRate,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())

  const tradeQuote = maybeQuote.unwrap()

  return buildTradeFromQuote({
    ...input,
    tradeQuote,
    buyAssetUsdRate,
    feeAssetUsdRate,
  })
}

export const buildTradeFromQuote = async ({
  tradeQuote: quote,
  wallet,
  receiveAddress: destinationAddress,
  affiliateBps = '0',
  xpub,
  accountType,
  buyAssetUsdRate,
  feeAssetUsdRate,
}: {
  tradeQuote: TradeQuote<ChainId>
  wallet: HDWallet
  receiveAddress: string
  affiliateBps?: string
  xpub?: string
  accountType?: UtxoAccountType
  buyAssetUsdRate: string
  feeAssetUsdRate: string
}): Promise<Result<ThorTrade<ChainId>, SwapErrorRight>> => {
  const { recommendedSlippage: slippageTolerance = DEFAULT_SLIPPAGE } = quote

  const {
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
    accountNumber,
  } = quote.steps[0]

  const chainAdapterManager = getChainAdapterManager()
  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  const sellAdapter = chainAdapterManager.get(sellAsset.chainId)

  if (!sellAdapter)
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade]: unsupported sell asset',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { sellAsset },
      }),
    )

  // A THORChain quote can be gotten without a destinationAddress, but a trade cannot be built without one.
  if (!destinationAddress)
    return Err(
      makeSwapErrorRight({
        message: '[buildThorTrade]: destinationAddress is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )

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
    return maybeEthTradeTx.andThen(ethTradeTx =>
      Ok({
        chainId: sellAsset.chainId as ThorEvmSupportedChainId,
        ...quote.steps[0],
        receiveAddress: destinationAddress,
        txData: ethTradeTx.txToSign,
      }),
    )
  } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
    if (!xpub || !accountType)
      return Err(
        makeSwapErrorRight({
          message: '[buildThorTrade]: missing utxo specific parameters',
          code: SwapErrorType.MISSING_INPUT,
        }),
      )

    const maybeThorTxInfo = await getThorTxInfo({
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit,
      slippageTolerance,
      destinationAddress,
      xpub,
      protocolFees: quote.steps[0].feeData.protocolFees,
      affiliateBps,
      buyAssetUsdRate,
      feeAssetUsdRate,
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
        accountType,
        satoshiPerByte: (quote as TradeQuote<ThorUtxoSupportedChainId>).steps[0].feeData
          .chainSpecific.satsPerByte,
        opReturnData,
      },
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
      sellAdapter: sellAdapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>,
      sellAmountCryptoBaseUnit,
      sellAsset,
      slippageTolerance,
      chainId: sellAsset.chainId,
      buyAsset,
      wallet,
      destinationAddress,
      quote: quote as TradeQuote<ThorCosmosSdkSupportedChainId>,
      affiliateBps,
      buyAssetUsdRate,
      feeAssetUsdRate,
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
