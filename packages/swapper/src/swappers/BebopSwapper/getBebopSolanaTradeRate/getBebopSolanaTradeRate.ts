import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  GetSolanaTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { BEBOP_SOLANA_DUMMY_ADDRESS } from '../types'
import { getBebopSolanaTradeContext } from '../utils/getBebopSolanaTradeContext'

export const getBebopSolanaTradeRate = async (
  input: GetSolanaTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { receiveAddress } = input

  // Rates are display-only; price against the dummy taker walletless (the quote validates the real taker)
  const address = receiveAddress ?? BEBOP_SOLANA_DUMMY_ADDRESS

  const maybeContext = await getBebopSolanaTradeContext({
    input,
    deps,
    takerAddress: address,
    receiverAddress: address,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon } = maybeContext.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate',
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber: undefined,
        // Bebop Solana is gasless - Bebop pays the network fees via co-signing
        feeData: { protocolFees: {}, networkFeeCryptoBaseUnit: '0' },
      },
    ],
  }

  return Ok([tradeRate])
}
