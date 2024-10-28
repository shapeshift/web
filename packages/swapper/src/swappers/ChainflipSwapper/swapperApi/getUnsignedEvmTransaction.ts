import { AxiosError } from 'axios'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bn } from '@shapeshiftoss/utils'
import { fromChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { 
  EvmTransactionRequest, 
  GetUnsignedEvmTransactionArgs
} from '../../../types'
import { isExecutableTradeQuote } from '../../../utils'

import {
  chainIdToChainflipNetwork,
  CHAINFLIP_BAAS_COMMISSION,
} from '../constants'
import { ChainflipBaasSwapDepositAddress } from '../models'
import { chainflipService } from '../utils/chainflipService'
import { isNativeEvmAsset } from '../utils/helpers'

export const getUnsignedEvmTransaction = async ({
  chainId,
  from,
  tradeQuote,
  supportsEIP1559,
  assertGetEvmChainAdapter,
  config
}: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

  const brokerUrl = config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = config.REACT_APP_CHAINFLIP_API_KEY

  const step = tradeQuote.steps[0]
  const sellChainflipChainKey = `${step.sellAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[step.sellAsset.chainId as KnownChainIds]}`
  const buyChainflipChainKey = `${step.buyAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[step.buyAsset.chainId as KnownChainIds]}`

  
  // Subtract the BaaS fee to end up at the final displayed commissionBps
  let serviceCommission = parseInt(tradeQuote.affiliateBps) - CHAINFLIP_BAAS_COMMISSION
  if (serviceCommission < 0)
    serviceCommission = 0
  
  const maybeSwapResponse = await chainflipService.get<ChainflipBaasSwapDepositAddress>(
    `${brokerUrl}/swap` + 
      `?apiKey=${apiKey}` + 
      `&sourceAsset=${sellChainflipChainKey}` +
      `&destinationAsset=${buyChainflipChainKey}` +
      `&destinationAddress=${tradeQuote.receiveAddress}` +
      `&boostFee=10` +
      // TODO: Calculate minprice based on tradeQuote.slippageTolerancePercentageDecimal, step.sellAmountIncludingProtocolFeesCryptoBaseUnit
      // `&minimumPrice=` +
      // `&refundAddress=${from}` +
      // `&retryDurationInBlocks=10` +
      `&commissionBps=${serviceCommission}`,
    
    // TODO: For DCA swaps we need to add the numberOfChunks/chunkIntervalBlocks parameters
  )
  
  if (maybeSwapResponse.isErr()) {
    const error = maybeSwapResponse.unwrapErr()
    const cause = error.cause as AxiosError<any, any>
    throw Error(cause.response!.data.detail);
  }

  const { data: swapResponse } = maybeSwapResponse.unwrap()
  
  // TODO: Call CF to get deposit channel opened and use deposit address as "to"
  const to = swapResponse.address!
  const data = ''
  const gasLimit = ''

  const value = isNativeEvmAsset(step.sellAsset.assetId)
    ? step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    : '0'
  
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