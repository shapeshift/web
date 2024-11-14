import { fromAssetId, fromChainId, solAssetId } from '@shapeshiftoss/caip'
import type { BuildSendApiTxInput, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx, SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type { EvmChainId, KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { AxiosError } from 'axios'
import type { InterpolationOptions } from 'node-polyglot'

import type {
  EvmTransactionRequest,
  GetUnsignedEvmTransactionArgs,
  GetUnsignedSolanaTransactionArgs,
  GetUnsignedUtxoTransactionArgs,
  SwapperApi,
  UtxoFeeData,
} from '../../types'
import { isExecutableTradeQuote, isExecutableTradeStep, isToken } from '../../utils'
import { CHAINFLIP_BAAS_COMMISSION } from './constants'
import type { ChainflipBaasSwapDepositAddress } from './models/ChainflipBaasSwapDepositAddress'
import { getTradeQuote, getTradeRate } from './swapperApi/getTradeQuote'
import type { ChainFlipStatus } from './types'
import { chainflipService } from './utils/chainflipService'
import { getLatestChainflipStatusMessage } from './utils/getLatestChainflipStatusMessage'
import {
  calculateChainflipMinPrice,
  getChainFlipIdFromAssetId,
  getChainFlipSwap,
} from './utils/helpers'

// Persists the ID so we can look it up later when checking the status
const tradeQuoteMetadata: Map<string, ChainflipBaasSwapDepositAddress> = new Map()

export const chainflipApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  getUnsignedEvmTransaction: async ({
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

    const isTokenSend = isToken(step.sellAsset.assetId)
    const sourceAsset = await getChainFlipIdFromAssetId({
      assetId: step.sellAsset.assetId,
      brokerUrl,
    })
    const destinationAsset = await getChainFlipIdFromAssetId({
      assetId: step.buyAsset.assetId,
      brokerUrl,
    })

    const minimumPrice = calculateChainflipMinPrice({
      slippageTolerancePercentageDecimal: tradeQuote.slippageTolerancePercentageDecimal,
      sellAsset: step.sellAsset,
      buyAsset: step.buyAsset,
      buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit:
        step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    })

    // Subtract the BaaS fee to end up at the final displayed commissionBps
    let serviceCommission = parseInt(tradeQuote.affiliateBps) - CHAINFLIP_BAAS_COMMISSION
    if (serviceCommission < 0) serviceCommission = 0

    const maybeSwapResponse = await getChainFlipSwap({
      brokerUrl,
      apiKey,
      sourceAsset,
      destinationAsset,
      destinationAddress: tradeQuote.receiveAddress,
      minimumPrice,
      refundAddress: from,
      commissionBps: serviceCommission,
    })

    if (maybeSwapResponse.isErr()) {
      const error = maybeSwapResponse.unwrapErr()
      const cause = error.cause as AxiosError<any, any>
      throw Error(cause.response!.data.detail)
    }

    const { data: swapResponse } = maybeSwapResponse.unwrap()

    if (!swapResponse.id) throw Error('missing swap ID')

    tradeQuoteMetadata.set(tradeQuote.id, swapResponse)

    const depositAddress = swapResponse.address!
    const { assetReference } = fromAssetId(step.sellAsset.assetId)

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

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute trade step')

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
  },
  getUnsignedUtxoTransaction: async ({
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

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')

    const sourceAsset = await getChainFlipIdFromAssetId({
      assetId: step.sellAsset.assetId,
      brokerUrl,
    })
    const destinationAsset = await getChainFlipIdFromAssetId({
      assetId: step.buyAsset.assetId,
      brokerUrl,
    })

    // Subtract the BaaS fee to end up at the final displayed commissionBps
    let serviceCommission = parseInt(tradeQuote.affiliateBps) - CHAINFLIP_BAAS_COMMISSION
    if (serviceCommission < 0) serviceCommission = 0

    const minimumPrice = calculateChainflipMinPrice({
      slippageTolerancePercentageDecimal: tradeQuote.slippageTolerancePercentageDecimal,
      sellAsset: step.sellAsset,
      buyAsset: step.buyAsset,
      buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit:
        step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    })

    const adapter = assertGetUtxoChainAdapter(step.sellAsset.chainId)

    const sendAddress = await adapter.getAddress({
      accountNumber: step.accountNumber,
      // @ts-ignore this is a rare occurence of wallet not being passed but this being fine as we pass a pubKey instead
      // types are stricter than they should for the sake of paranoia
      wallet,
      accountType,
      pubKey: xpub,
    })

    const maybeSwapResponse = await getChainFlipSwap({
      brokerUrl,
      apiKey,
      sourceAsset,
      destinationAsset,
      destinationAddress: tradeQuote.receiveAddress,
      minimumPrice,
      refundAddress: sendAddress,
      commissionBps: serviceCommission,
    })

    if (maybeSwapResponse.isErr()) {
      const error = maybeSwapResponse.unwrapErr()
      const cause = error.cause as AxiosError<any, any>
      throw Error(cause.response!.data.detail)
    }

    const { data: swapResponse } = maybeSwapResponse.unwrap()

    tradeQuoteMetadata.set(tradeQuote.id, swapResponse)

    const depositAddress = swapResponse.address!

    return adapter.buildSendApiTransaction({
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
  },
  getUnsignedSolanaTransaction: async ({
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
    config,
  }: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const brokerUrl = config.REACT_APP_CHAINFLIP_API_URL
    const apiKey = config.REACT_APP_CHAINFLIP_API_KEY

    const step = tradeQuote.steps[0]

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')

    const sourceAsset = await getChainFlipIdFromAssetId({
      assetId: step.sellAsset.assetId,
      brokerUrl,
    })
    const destinationAsset = await getChainFlipIdFromAssetId({
      assetId: step.buyAsset.assetId,
      brokerUrl,
    })

    // Subtract the BaaS fee to end up at the final displayed commissionBps
    let serviceCommission = parseInt(tradeQuote.affiliateBps) - CHAINFLIP_BAAS_COMMISSION
    if (serviceCommission < 0) serviceCommission = 0

    const minimumPrice = calculateChainflipMinPrice({
      slippageTolerancePercentageDecimal: tradeQuote.slippageTolerancePercentageDecimal,
      sellAsset: step.sellAsset,
      buyAsset: step.buyAsset,
      buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit:
        step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    })

    const maybeSwapResponse = await getChainFlipSwap({
      brokerUrl,
      apiKey,
      sourceAsset,
      destinationAsset,
      destinationAddress: tradeQuote.receiveAddress,
      minimumPrice,
      refundAddress: from,
      commissionBps: serviceCommission,
    })

    if (maybeSwapResponse.isErr()) {
      const error = maybeSwapResponse.unwrapErr()
      const cause = error.cause as AxiosError<any, any>
      throw Error(cause.response!.data.detail)
    }

    const { data: swapResponse } = maybeSwapResponse.unwrap()

    tradeQuoteMetadata.set(tradeQuote.id, swapResponse)

    const adapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)

    const contractAddress =
      step.sellAsset.assetId === solAssetId
        ? undefined
        : fromAssetId(step.sellAsset.assetId).assetReference

    const depositAddress = swapResponse.address!

    const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
      to: depositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: {
        from,
        tokenId: contractAddress,
      },
    }
    const { fast } = await adapter.getFeeData(getFeeDataInput)

    const buildSendTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
      to: depositAddress,
      from,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      accountNumber: step.accountNumber,
      chainSpecific: {
        tokenId: contractAddress,
        computeUnitLimit: fast.chainSpecific.computeUnits,
        computeUnitPrice: fast.chainSpecific.priorityFee,
      },
    }

    return (await adapter.buildSendApiTransaction(buildSendTxInput)).txToSign
  },

  checkTradeStatus: async ({
    config,
    quoteId,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    const swap = tradeQuoteMetadata.get(quoteId)
    if (!swap) throw Error(`missing trade quote metadata for quoteId ${quoteId}`)
    // Note, the swapId isn't the quoteId - we set the swapId at pre-execution time, when getting the receive addy and instantiating a flip swap
    const swapId = swap.id

    const brokerUrl = config.REACT_APP_CHAINFLIP_API_URL
    const apiKey = config.REACT_APP_CHAINFLIP_API_KEY

    const maybeStatusResponse = await chainflipService.get<ChainFlipStatus>(
      `${brokerUrl}/status-by-id?apiKey=${apiKey}&swapId=${swapId}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()
    const {
      status: { swapEgress },
    } = statusResponse

    // Assume no outbound Tx is a pending Tx
    if (!swapEgress?.transactionReference) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Pending,
        message: getLatestChainflipStatusMessage(statusResponse),
      }
    }

    // Assume as soon as we have an outbound Tx, the swap is complete.
    // Chainflip waits for 3 confirmations to assume complete (vs. 1 for us), which is turbo long.
    return {
      buyTxHash: swapEgress.transactionReference,
      status: TxStatus.Confirmed,
      message: undefined,
    }
  },
}
