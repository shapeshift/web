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
      bip44Params,
      buyAsset,
      receiveAddress: destinationAddress,
      sellAmount,
      sellAsset,
      sellAssetAccountNumber,
      slippage: slippageTolerance = DEFAULT_SLIPPAGE,
      wallet,
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
      const sellAssetBip44Params = sellAdapter.buildBIP44Params({
        accountNumber: sellAssetAccountNumber,
      })
      const ethTradeTx = await makeTradeTx({
        wallet,
        slippageTolerance,
        bip44Params: sellAssetBip44Params,
        sellAsset,
        buyAsset,
        adapter: sellAdapter as unknown as ethereum.ChainAdapter,
        sellAmount,
        destinationAddress,
        deps,
        gasPrice:
          (quote as TradeQuote<KnownChainIds.EthereumMainnet>).feeData.chainSpecific?.gasPrice ??
          '0',
        gasLimit:
          (quote as TradeQuote<KnownChainIds.EthereumMainnet>).feeData.chainSpecific
            ?.estimatedGas ?? '0',
        tradeFee: quote.feeData.tradeFee,
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
        sellAmount,
        slippageTolerance,
        destinationAddress,
        xpub: (input as GetUtxoTradeQuoteInput).xpub,
        tradeFee: quote.feeData.tradeFee,
      })

      const buildTxResponse = await (
        sellAdapter as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
      ).buildSendTransaction({
        value: sellAmount,
        wallet,
        to: vault,
        bip44Params: (input as GetUtxoTradeQuoteInput).bip44Params,
        chainSpecific: {
          accountType: (input as GetUtxoTradeQuoteInput).accountType,
          satoshiPerByte: (quote as TradeQuote<KnownChainIds.BitcoinMainnet>).feeData.chainSpecific
            .satsPerByte,
          opReturnData,
        },
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
        sellAmount,
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
