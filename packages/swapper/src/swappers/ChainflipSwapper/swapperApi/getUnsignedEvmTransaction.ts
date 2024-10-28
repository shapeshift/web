import { AxiosError } from 'axios'
import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getFees } from '@shapeshiftoss/chain-adapters/dist/evm/utils'

import type {
  EvmTransactionRequest, 
  GetUnsignedEvmTransactionArgs
} from '../../../types'
import { isExecutableTradeQuote } from '../../../utils'

import {
  chainIdToChainflipNetwork,
  CHAINFLIP_BAAS_COMMISSION
} from '../constants'
import { ChainflipBaasSwapDepositAddress } from '../models'
import { chainflipService } from '../utils/chainflipService'
import { getGasLimit } from '../utils/helpers'

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
  
  const depositAddress = swapResponse.address!
  const { assetReference } = fromAssetId(step.sellAsset.assetId)
  
  const adapter = assertGetEvmChainAdapter(chainId)

  // TODO: Are these the correct params for data and value?
  const fees = await getFees({
    adapter: adapter,
    data: '',
    to: depositAddress,
    value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    from: from,
    supportsEIP1559: supportsEIP1559
  })

  // TODO: Check what this does when you want to swap ETH
  // TODO: How to go from ETHSignTx to EvmTransactionRequest?
  return adapter.buildSendApiTransaction({
    to: depositAddress,
    from: from,
    value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    accountNumber: step.accountNumber,
    chainSpecific: {
      gasLimit: getGasLimit(sellChainflipChainKey),
      contractAddress: assetReference,
      maxFeePerGas: fees.maxFeePerGas!,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas!,
    }
  })
}