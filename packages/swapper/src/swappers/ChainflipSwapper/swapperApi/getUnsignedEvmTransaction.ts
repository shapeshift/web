import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { FeeDataKey, type GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { AxiosError } from 'axios'

import type { EvmTransactionRequest, GetUnsignedEvmTransactionArgs } from '../../../types'
import { isExecutableTradeQuote, isToken } from '../../../utils'
import { CHAINFLIP_BAAS_COMMISSION, chainIdToChainflipNetwork } from '../constants'
import type { ChainflipBaasSwapDepositAddress } from '../models'
import { chainflipService } from '../utils/chainflipService'

export const getUnsignedEvmTransaction = async ({
  chainId,
  from,
  tradeQuote,
  assertGetEvmChainAdapter,
  config,
  supportsEIP1559,
}: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

  const brokerUrl = config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = config.REACT_APP_CHAINFLIP_API_KEY

  const step = tradeQuote.steps[0]
  const sellChainflipChainKey = `${step.sellAsset.symbol.toLowerCase()}.${
    chainIdToChainflipNetwork[step.sellAsset.chainId]
  }`
  const buyChainflipChainKey = `${step.buyAsset.symbol.toLowerCase()}.${
    chainIdToChainflipNetwork[step.buyAsset.chainId]
  }`

  // Subtract the BaaS fee to end up at the final displayed commissionBps
  let serviceCommission = parseInt(tradeQuote.affiliateBps) - CHAINFLIP_BAAS_COMMISSION
  if (serviceCommission < 0) serviceCommission = 0

  const maybeSwapResponse = await chainflipService.get<ChainflipBaasSwapDepositAddress>(
    `${brokerUrl}/swap` +
      `?apiKey=${apiKey}` +
      `&sourceAsset=${sellChainflipChainKey}` +
      `&destinationAsset=${buyChainflipChainKey}` +
      `&destinationAddress=${tradeQuote.receiveAddress}` +
      `&boostFee=10` +
      // TODO: Calculate minprice based on tradeQuote.slippageTolerancePercentageDecimal, step.sellAmountIncludingProtocolFeesCryptoBaseUnit, step.buyAmountAfterFeesCryptoBaseUnit
      // `&minimumPrice=` +
      // `&refundAddress=${from}` +
      // `&retryDurationInBlocks=10` +
      `&commissionBps=${serviceCommission}`,

    // TODO: Below is the reference code of Chainflip to calculate the minPrice parameter
    //     const tolerance = new BigNumber(params.slippageTolerancePercent);
    //     const estimatedPrice = new BigNumber(quote.estimatedPrice);
    //     minPrice = estimatedPrice
    //       .times(new BigNumber(100).minus(tolerance).dividedBy(100))
    //       .toFixed(assetConstants[destAsset].decimals);

    // TODO: For DCA swaps we need to add the numberOfChunks/chunkIntervalBlocks parameters
  )

  if (maybeSwapResponse.isErr()) {
    const error = maybeSwapResponse.unwrapErr()
    const cause = error.cause as AxiosError<any, any>
    throw Error(cause.response!.data.detail)
  }

  const { data: swapResponse } = maybeSwapResponse.unwrap()

  const depositAddress = swapResponse.address!
  const { assetReference } = fromAssetId(step.sellAsset.assetId)
  const isTokenSend = isToken(step.sellAsset.assetId)

  const adapter = assertGetEvmChainAdapter(step.sellAsset.chainId)

  const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
    to: depositAddress,
    value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    chainSpecific: {
      from,
      contractAddress: isTokenSend ? assetReference : undefined,
      data: undefined,
    },
    sendMax: false,
  }
  const feeData = await adapter.getFeeData(getFeeDataInput)
  const fees = feeData[FeeDataKey.Average]

  const unsignedTxInput = await adapter.buildSendApiTransaction({
    to: depositAddress,
    from,
    value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    accountNumber: step.accountNumber,
    chainSpecific: {
      gasLimit: fees.chainSpecific.gasLimit,
      contractAddress: isTokenSend ? assetReference : undefined,
      ...(supportsEIP1559
        ? {
            maxFeePerGas: fees.chainSpecific.maxFeePerGas!,
            maxPriorityFeePerGas: fees.chainSpecific.maxPriorityFeePerGas!,
          }
        : {
            gasPrice: fees.chainSpecific.gasPrice,
          }),
    },
  })

  return {
    chainId: Number(fromChainId(chainId).chainReference),
    data: unsignedTxInput.data,
    to: unsignedTxInput.to,
    from,
    value: unsignedTxInput.value,
    gasLimit: unsignedTxInput.gasLimit,
    maxFeePerGas: unsignedTxInput.maxFeePerGas,
    maxPriorityFeePerGas: unsignedTxInput.maxPriorityFeePerGas,
    gasPrice: unsignedTxInput.gasPrice,
  }
}
