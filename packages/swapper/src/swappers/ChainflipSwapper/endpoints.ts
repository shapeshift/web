import { fromAssetId, fromChainId, solAssetId } from '@shapeshiftoss/caip'
import type { BuildSendApiTxInput, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx, SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type { EvmChainId, KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
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
import type { ChainflipBaasSwapDepositAddress } from './models'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import type { ChainFlipStatus } from './types'
import { chainflipService } from './utils/chainflipService'
import { getLatestChainflipStatusMessage } from './utils/getLatestChainflipStatusMessage'

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
    supportsEIP1559,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const step = tradeQuote.steps[0]

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')
    if (!step.chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!step.chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    tradeQuoteMetadata.set(tradeQuote.id, {
      id: step.chainflipSpecific.chainflipSwapId,
      address: step.chainflipSpecific?.chainflipDepositAddress,
    })

    const { assetReference } = fromAssetId(step.sellAsset.assetId)
    const adapter = assertGetEvmChainAdapter(step.sellAsset.chainId)
    const isTokenSend = isToken(step.sellAsset.assetId)
    const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
      to: step.chainflipSpecific.chainflipDepositAddress,
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
      to: step.chainflipSpecific.chainflipDepositAddress,
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
  getUnsignedUtxoTransaction: ({
    tradeQuote,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
  }: GetUnsignedUtxoTransactionArgs): Promise<BTCSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const step = tradeQuote.steps[0]

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')
    if (!step.chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!step.chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    tradeQuoteMetadata.set(tradeQuote.id, {
      id: step.chainflipSpecific.chainflipSwapId,
      address: step.chainflipSpecific.chainflipDepositAddress,
    })

    const adapter = assertGetUtxoChainAdapter(step.sellAsset.chainId)

    return adapter.buildSendApiTransaction({
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub: xpub!,
      to: step.chainflipSpecific.chainflipDepositAddress,
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
  }: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const step = tradeQuote.steps[0]

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')
    if (!step.chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!step.chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    tradeQuoteMetadata.set(tradeQuote.id, {
      id: step.chainflipSpecific.chainflipSwapId,
      address: step.chainflipSpecific.chainflipDepositAddress,
    })

    const adapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)

    const contractAddress =
      step.sellAsset.assetId === solAssetId
        ? undefined
        : fromAssetId(step.sellAsset.assetId).assetReference

    const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
      to: step.chainflipSpecific.chainflipDepositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: {
        from,
        tokenId: contractAddress,
      },
    }
    const { fast } = await adapter.getFeeData(getFeeDataInput)

    const buildSendTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
      to: step.chainflipSpecific.chainflipDepositAddress,
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
    if (!swap) throw Error(`Missing trade quote metadata for quoteId ${quoteId}`)
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
