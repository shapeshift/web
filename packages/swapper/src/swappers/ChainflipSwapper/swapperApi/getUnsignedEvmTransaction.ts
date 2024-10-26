import { evm } from '@shapeshiftoss/chain-adapters'
import { bn } from '@shapeshiftoss/utils'
import { fromChainId } from '@shapeshiftoss/caip'

import type { 
  EvmTransactionRequest, 
  GetUnsignedEvmTransactionArgs
} from '../../../types'
import { isExecutableTradeQuote } from '../../../utils'

export const getUnsignedEvmTransaction = async ({
  chainId,
  from,
  tradeQuote,
  supportsEIP1559,
  assertGetEvmChainAdapter,
  //config
}: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

  // const { transactionRequest } = await buildChainflipDepositChannel()
  //
  // if (!transactionRequest) {
  //   throw Error('undefined transactionRequest')
  // }
  //
  // const { to, value, data, gasLimit } = transactionRequest

  // TODO: Call CF to get deposit channel opened and use deposit address as "to"
  const to = ''
  const value = ''
  const data = ''
  const gasLimit = ''

  // checking values individually to keep type checker happy
  if (to === undefined || value === undefined || data === undefined || gasLimit === undefined) {
    const undefinedRequiredValues = [to, value, data, gasLimit].filter(
      value => value === undefined,
    )

    throw Error('undefined required values in transactionRequest', {
      cause: {
        undefinedRequiredValues,
      },
    })
  }

  const feeData = await evm.getFees({
    adapter: assertGetEvmChainAdapter(chainId),
    data: data.toString(),
    to,
    value: bn(value.toString()).toString(),
    from,
    supportsEIP1559,
  })

  return {
    to,
    from,
    value: value.toString(),
    data: data.toString(),
    chainId: Number(fromChainId(chainId).chainReference),
    ...{ ...feeData, gasLimit: gasLimit.toString() },
  }
}