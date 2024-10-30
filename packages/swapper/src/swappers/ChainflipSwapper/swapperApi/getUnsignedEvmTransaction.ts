import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { getErc20Data, getFees } from '@shapeshiftoss/chain-adapters/dist/evm/utils'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { AxiosError } from 'axios'

import type { EvmTransactionRequest, GetUnsignedEvmTransactionArgs } from '../../../types'
import { isExecutableTradeQuote } from '../../../utils'
import { CHAINFLIP_BAAS_COMMISSION, chainIdToChainflipNetwork } from '../constants'
import type { ChainflipBaasSwapDepositAddress } from '../models'
import { chainflipService } from '../utils/chainflipService'
import { getGasLimit } from '../utils/helpers'

export const getUnsignedEvmTransaction = async ({
  chainId,
  from,
  tradeQuote,
  supportsEIP1559,
  assertGetEvmChainAdapter,
  config,
}: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

  const brokerUrl = config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = config.REACT_APP_CHAINFLIP_API_KEY

  const step = tradeQuote.steps[0]
  const sellChainflipChainKey = `${step.sellAsset.symbol.toLowerCase()}.${
    chainIdToChainflipNetwork[step.sellAsset.chainId as KnownChainIds]
  }`
  const buyChainflipChainKey = `${step.buyAsset.symbol.toLowerCase()}.${
    chainIdToChainflipNetwork[step.buyAsset.chainId as KnownChainIds]
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
  const isTokenSend = !!assetReference

  const adapter = assertGetEvmChainAdapter(chainId)

  const fees = await getFees({
    adapter,
    to: depositAddress,
    from,
    value: (isTokenSend
      ? 0n
      : BigInt(step.sellAmountIncludingProtocolFeesCryptoBaseUnit)
    ).toString(),
    data: await getErc20Data(
      depositAddress,
      step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      assetReference,
    ),
    supportsEIP1559,
  })

  const tx = await adapter.buildSendApiTransaction({
    to: depositAddress,
    from,
    value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    accountNumber: step.accountNumber,
    chainSpecific: {
      gasLimit: getGasLimit(sellChainflipChainKey),
      contractAddress: assetReference,
      maxFeePerGas: fees.maxFeePerGas!,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas!,
    },
  })

  return {
    chainId: Number(fromChainId(chainId).chainReference),
    data: tx.data,
    to: tx.to,
    from,
    value: tx.value,
    gasLimit: tx.gasLimit,
    maxFeePerGas: tx.maxFeePerGas,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    gasPrice: tx.gasPrice,
  }
}
