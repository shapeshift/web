import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { numberToHex } from 'web3-utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn } from 'lib/bignumber/bignumber'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import type { OneInchExecuteTradeInput } from '../utils/types'

export async function executeTrade(
  input: OneInchExecuteTradeInput<EvmChainId>,
): Promise<Result<TradeResult, SwapErrorRight>> {
  const { sellAsset, buyAsset } = input.trade

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

  if (!isEvmChainId(sellAssetChainId)) {
    throw new SwapError('[executeTrade] - 1inch only supports EVM chain swaps', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
      details: { sellAssetChainId },
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
    // We guard against !isEvmChainId(chainId) above, so this cast is safe
    const adapter = adapterManager.get(sellAssetChainId) as unknown as EvmBaseAdapter<EvmChainId>

    if (adapter === undefined) {
      throw new SwapError('[executeTrade] - getChainAdapterManager returned undefined', {
        code: SwapErrorType.UNSUPPORTED_NAMESPACE,
        details: { chainId: sellAsset.chainId },
      })
    }

    const { average } = await adapter.getGasFeeData()

    // TODO: networkFeeCryptoBaseUnit should be a gas limit as well so this isnt necessary
    const gasLimit = bn(input.trade.feeData.networkFeeCryptoBaseUnit).div(average.gasPrice)

    const buildTxResponse = await adapter.buildSendTransaction({
      value: '0', // ERC20, so don't send any ETH with the tx
      wallet: input.wallet,
      to: input.trade.tx.to,
      chainSpecific: {
        gasPrice: numberToHex(average.gasPrice),
        gasLimit: numberToHex(gasLimit.toString()),
      },
      accountNumber: input.trade.accountNumber,
    })

    const { txToSign } = buildTxResponse
    const txWithQuoteData = { ...txToSign, data: input.trade.tx.data ?? '' }

    if (input.wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({
        txToSign: txWithQuoteData,
        wallet: input.wallet,
      })
      const txid = await adapter.broadcastTransaction(signedTx)
      return Ok({ tradeId: txid })
    } else if (input.wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction?.({
        txToSign: txWithQuoteData,
        wallet: input.wallet,
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
