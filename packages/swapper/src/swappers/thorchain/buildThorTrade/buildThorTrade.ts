import { CHAIN_NAMESPACE, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { cosmos, ethereum, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import {
  BuildTradeInput,
  GetUtxoTradeQuoteInput,
  SwapError,
  SwapErrorTypes,
  TradeQuote,
  UtxoSupportedChainIds,
} from '../../../api'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { getThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import { ThorchainSwapperDeps, ThorTrade } from '../types'
import { getThorTxInfo as getBtcThorTxInfo } from '../utils/bitcoin/utils/getThorTxData'
import { cosmosTxData } from '../utils/cosmos/cosmosTxData'
import { makeTradeTx } from '../utils/ethereum/makeTradeTx'

export const buildTrade = async ({
  deps,
  input,
}: {
  deps: ThorchainSwapperDeps
  input: BuildTradeInput
}): Promise<ThorTrade<ChainId>> => {
  try {
    const {
      buyAsset,
      receiveAddress: destinationAddress,
      sellAmountCryptoPrecision,
      sellAsset,
      bip44Params,
      slippage: slippageTolerance = DEFAULT_SLIPPAGE,
      wallet,
      sendMax,
    } = input

    const quote = await getThorTradeQuote({ deps, input })
    const sellAdapter = deps.adapterManager.get(sellAsset.chainId)

    if (!sellAdapter)
      throw new SwapError('[buildTrade]: unsupported sell asset', {
        code: SwapErrorTypes.BUILD_TRADE_FAILED,
        fn: 'buildTrade',
        details: { sellAsset },
      })

    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    if (chainNamespace === CHAIN_NAMESPACE.Evm) {
      const ethTradeTx = await makeTradeTx({
        wallet,
        slippageTolerance,
        bip44Params,
        sellAsset,
        buyAsset,
        adapter: sellAdapter as unknown as ethereum.ChainAdapter,
        sellAmountCryptoPrecision,
        destinationAddress,
        deps,
        gasPrice:
          (quote as TradeQuote<KnownChainIds.EthereumMainnet>).feeData.chainSpecific?.gasPrice ??
          '0',
        gasLimit:
          (quote as TradeQuote<KnownChainIds.EthereumMainnet>).feeData.chainSpecific
            ?.estimatedGas ?? '0',
        buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
      })

      return {
        chainId: KnownChainIds.EthereumMainnet,
        ...quote,
        receiveAddress: destinationAddress,
        txData: ethTradeTx.txToSign,
      }
    } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
      const { vault, opReturnData } = await getBtcThorTxInfo({
        deps,
        sellAsset,
        buyAsset,
        sellAmountCryptoPrecision,
        slippageTolerance,
        destinationAddress,
        xpub: (input as GetUtxoTradeQuoteInput).xpub,
        buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
      })

      const buildTxResponse = await (
        sellAdapter as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
      ).buildSendTransaction({
        value: sellAmountCryptoPrecision,
        wallet,
        to: vault,
        bip44Params: (input as GetUtxoTradeQuoteInput).bip44Params,
        chainSpecific: {
          accountType: (input as GetUtxoTradeQuoteInput).accountType,
          satoshiPerByte: (quote as TradeQuote<KnownChainIds.BitcoinMainnet>).feeData.chainSpecific
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
      if (!bip44Params) {
        throw new Error('bip44Params required as input')
      }

      const txData = await cosmosTxData({
        bip44Params,
        deps,
        sellAdapter: sellAdapter as unknown as cosmos.ChainAdapter,
        sellAmountCryptoPrecision,
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
        code: SwapErrorTypes.BUILD_TRADE_FAILED,
        fn: 'buildTrade',
        details: { sellAsset },
      })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[buildTrade]: error building trade', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      fn: 'buildTrade',
      cause: e,
    })
  }
}
