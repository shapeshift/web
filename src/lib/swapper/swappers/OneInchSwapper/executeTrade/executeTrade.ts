import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { isEvmChainAdapter } from 'lib/utils'

import { getFeesFromContractData, isNativeEvmAsset } from '../../utils/helpers/helpers'
import type { OneInchExecuteTradeInput } from '../utils/types'

export async function executeTrade({
  trade,
  wallet,
}: OneInchExecuteTradeInput<EvmChainId>): Promise<Result<TradeResult, SwapErrorRight>> {
  if (!supportsETH(wallet)) {
    return Err(
      makeSwapErrorRight({
        message: 'eth wallet required',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { wallet },
      }),
    )
  }

  const { accountNumber, sellAsset, buyAsset, tx } = trade

  const { assetNamespace: sellAssetNamespace, chainId: sellAssetChainId } = fromAssetId(
    sellAsset.assetId,
  )
  const { assetNamespace: buyAssetNamespace, chainId: buyAssetChainId } = fromAssetId(
    buyAsset.assetId,
  )

  if (buyAssetChainId !== sellAssetChainId) {
    throw new SwapError('[executeTrade] - 1inch only supports same chain swaps', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
      details: { buyAssetChainId, sellAssetChainId },
    })
  }

  // TODO: in the future we could extend this to convert eth to WETH.
  if (isNativeEvmAsset(sellAsset.assetId) || isNativeEvmAsset(buyAsset.assetId)) {
    throw new SwapError('[executeTrade] - no support for native assets', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
      details: { sellAssetNamespace, buyAssetNamespace },
    })
  }

  try {
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(sellAssetChainId)

    if (!adapter || !isEvmChainAdapter(adapter)) {
      throw new SwapError(
        '[executeTrade] - invalid chain adapter, 1inch only supports EVM chain swaps',
        {
          code: SwapErrorType.UNSUPPORTED_PAIR,
          details: { sellAssetChainId, adapter },
        },
      )
    }

    if (adapter === undefined) {
      throw new SwapError('[executeTrade] - getChainAdapterManager returned undefined', {
        code: SwapErrorType.UNSUPPORTED_NAMESPACE,
        details: { chainId: sellAsset.chainId },
      })
    }

    const value = '0' // ERC20, so don't send any ETH with the tx
    const { from, to, data } = tx

    const eip1559Support = await wallet.ethSupportsEIP1559()

    const { feesWithGasLimit } = await getFeesFromContractData({
      eip1559Support,
      adapter,
      from,
      to,
      value,
      data,
    })

    const buildTxResponse = await adapter.buildSendTransaction({
      value,
      wallet,
      to,
      chainSpecific: feesWithGasLimit,
      accountNumber,
    })

    const { txToSign } = buildTxResponse
    const txWithQuoteData = { ...txToSign, data: data ?? '' }

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({
        txToSign: txWithQuoteData,
        wallet,
      })
      const txid = await adapter.broadcastTransaction(signedTx)
      return Ok({ tradeId: txid })
    } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction?.({
        txToSign: txWithQuoteData,
        wallet,
      })

      return Ok({ tradeId: txid })
    } else {
      throw new SwapError('[executeTrade]', {
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      })
    }
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
        message: '[cowExecuteTrade]',
        cause: e,
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
      }),
    )
  }
}
