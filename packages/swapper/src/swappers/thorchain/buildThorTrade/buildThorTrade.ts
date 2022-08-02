import { ChainId } from '@shapeshiftoss/caip'
import { bitcoin, cosmos, ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { BuildTradeInput, SwapError, SwapErrorTypes, TradeQuote } from '../../../api'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { getThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import { ThorchainSwapperDeps, ThorTrade } from '../types'
import { getThorTxInfo as getBtcThorTxInfo } from '../utils/bitcoin/utils/getThorTxData'
import { cosmosTxData } from '../utils/cosmos/cosmosTxData'
import { makeTradeTx } from '../utils/ethereum/makeTradeTx'

export const buildTrade = async ({
  deps,
  input
}: {
  deps: ThorchainSwapperDeps
  input: BuildTradeInput
}): Promise<ThorTrade<ChainId>> => {
  try {
    const {
      buyAsset,
      sellAsset,
      sellAssetAccountNumber,
      sellAmount,
      wallet,
      slippage: slippageTolerance = DEFAULT_SLIPPAGE,
      receiveAddress: destinationAddress
    } = input

    const quote = await getThorTradeQuote({ deps, input })
    const sellAdapter = deps.adapterManager.get(sellAsset.chainId)

    if (!sellAdapter)
      throw new SwapError('[buildTrade]: unsupported sell asset', {
        code: SwapErrorTypes.BUILD_TRADE_FAILED,
        fn: 'buildTrade',
        details: { sellAsset }
      })
    const sellAssetBip44Params = sellAdapter.buildBIP44Params({
      accountNumber: sellAssetAccountNumber
    })

    if (input.chainId === KnownChainIds.EthereumMainnet) {
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
        tradeFee: quote.feeData.tradeFee
      })

      return {
        chainId: KnownChainIds.EthereumMainnet,
        ...quote,
        receiveAddress: destinationAddress,
        txData: ethTradeTx.txToSign
      }
    } else if (input.chainId === KnownChainIds.BitcoinMainnet) {
      const { vault, opReturnData } = await getBtcThorTxInfo({
        deps,
        sellAsset,
        buyAsset,
        sellAmount,
        slippageTolerance,
        destinationAddress,
        wallet,
        bip44Params: sellAssetBip44Params,
        accountType: input.accountType,
        tradeFee: quote.feeData.tradeFee
      })

      const buildTxResponse = await (
        sellAdapter as unknown as bitcoin.ChainAdapter
      ).buildSendTransaction({
        value: sellAmount,
        wallet,
        to: vault,
        chainSpecific: {
          accountType: input.accountType,
          satoshiPerByte: (quote as TradeQuote<KnownChainIds.BitcoinMainnet>).feeData.chainSpecific
            .satsPerByte,
          opReturnData
        }
      })

      return {
        chainId: KnownChainIds.BitcoinMainnet,
        ...quote,
        receiveAddress: destinationAddress,
        txData: buildTxResponse.txToSign
      }
    } else if (input.chainId === KnownChainIds.CosmosMainnet) {
      const txData = await cosmosTxData({
        deps,
        sellAdapter: sellAdapter as unknown as cosmos.ChainAdapter,
        sellAmount,
        sellAsset,
        slippageTolerance,
        chainId: input.chainId,
        buyAsset,
        wallet,
        destinationAddress,
        quote: quote as TradeQuote<KnownChainIds.CosmosMainnet>
      })

      return {
        chainId: KnownChainIds.CosmosMainnet,
        ...quote,
        receiveAddress: destinationAddress,
        txData
      }
    } else {
      throw new SwapError('[buildTrade]: unsupported chain id', {
        code: SwapErrorTypes.BUILD_TRADE_FAILED,
        fn: 'buildTrade',
        details: { sellAsset }
      })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[buildTrade]: error building trade', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      fn: 'buildTrade'
    })
  }
}
