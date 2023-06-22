import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { buildAndBroadcast, createBuildCustomTxInput } from 'lib/utils/evm'

import { assertValidTrade, getAdapter } from '../utils/helpers'
import type { OneInchExecuteTradeInput } from '../utils/types'

export async function executeTrade({
  trade,
  wallet,
}: OneInchExecuteTradeInput<EvmChainId>): Promise<Result<TradeResult, SwapErrorRight>> {
  const { accountNumber, sellAsset, buyAsset, tx, receiveAddress } = trade

  const assertion = assertValidTrade({ buyAsset, sellAsset, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeAdapter = getAdapter(sellAsset.chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  try {
    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      to: tx.to,
      data: tx.data,
      value: '0', // erc20 support only
      wallet,
    })

    const txid = await buildAndBroadcast({ buildCustomTxInput, adapter })

    return Ok({ tradeId: txid })
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: '[OneInch: executeTrade] - failed to build and broadcast transaction',
        cause: e,
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
      }),
    )
  }
}
