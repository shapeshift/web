import { AxiosError } from 'axios';
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types';

import {
  CHAINFLIP_BAAS_COMMISSION, 
  chainIdToChainflipNetwork
} from '../constants';
import { chainflipService } from '../utils/chainflipService';
import { ChainflipBaasSwapDepositAddress } from '../models';

import type { 
  GetUnsignedUtxoTransactionArgs, 
  UtxoFeeData
} from '../../../types'
import { isExecutableTradeQuote } from '../../../utils'

export const getUnsignedUtxoTransaction = async ({
  tradeQuote,
  xpub,
  accountType,
  assertGetUtxoChainAdapter,
  config,
}: GetUnsignedUtxoTransactionArgs): Promise<BTCSignTx> => {
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
  
  return assertGetUtxoChainAdapter(step.sellAsset.chainId).buildSendApiTransaction({
    value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    xpub: xpub!,
    to: depositAddress,
    accountNumber: step.accountNumber,
    skipToAddressValidation: true,
    chainSpecific: {
      accountType,
      satoshiPerByte: (step.feeData.chainSpecific as UtxoFeeData).satsPerByte,
    },
  })
}
