import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { SwapperApi, UtxoFeeData } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { ChainflipStatusMessage } from './constants'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import type { ChainFlipStatus } from './types'
import { chainflipService } from './utils/chainflipService'
import { getLatestChainflipStatusMessage } from './utils/getLatestChainflipStatusMessage'

export const chainflipApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    assertGetEvmChainAdapter,
    supportsEIP1559,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, chainflipSpecific, sellAsset } = step

    if (!chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const to = chainflipSpecific.chainflipDepositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
    const data = evm.getErc20Data(to, value, contractAddress)

    const feeData = await evm.getFees({
      adapter,
      data: data || '0x',
      to: contractAddress ?? to,
      value: isNativeEvmAsset(sellAsset.assetId) ? value : '0',
      from,
      supportsEIP1559,
    })

    return adapter.buildSendApiTransaction({
      accountNumber,
      from,
      to,
      value,
      chainSpecific: { contractAddress, ...feeData },
    })
  },
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { chainflipSpecific, sellAsset } = step

    if (!chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

    const to = chainflipSpecific.chainflipDepositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit

    const data = evm.getErc20Data(to, value, contractAddress)

    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter,
      data: data || '0x',
      to: contractAddress ?? to,
      value: isNativeEvmAsset(sellAsset.assetId) ? value : '0',
      from,
      supportsEIP1559,
    })

    return networkFeeCryptoBaseUnit
  },
  getUnsignedUtxoTransaction: ({
    stepIndex,
    tradeQuote,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, chainflipSpecific, sellAsset } = step

    if (!chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    return adapter.buildSendApiTransaction({
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub,
      to: chainflipSpecific.chainflipDepositAddress,
      accountNumber,
      skipToAddressValidation: true,
      chainSpecific: {
        accountType,
        satoshiPerByte: (step.feeData.chainSpecific as UtxoFeeData).satsPerByte,
      },
    })
  },
  getUtxoTransactionFees: async ({ stepIndex, tradeQuote, xpub, assertGetUtxoChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { chainflipSpecific, sellAsset } = step

    if (!chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const { fast } = await adapter.getFeeData({
      to: chainflipSpecific.chainflipDepositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: { pubkey: xpub },
      sendMax: false,
    })

    return fast.txFee
  },
  getUnsignedSolanaTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, chainflipSpecific, sellAsset } = step

    if (!chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

    const to = chainflipSpecific.chainflipDepositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const tokenId = contractAddressOrUndefined(sellAsset.assetId)

    const { fast } = await adapter.getFeeData({
      to,
      value,
      chainSpecific: { from, tokenId },
    })

    return adapter.buildSendApiTransaction({
      to,
      from,
      value,
      accountNumber,
      chainSpecific: {
        tokenId,
        computeUnitLimit: fast.chainSpecific.computeUnits,
        computeUnitPrice: fast.chainSpecific.priorityFee,
      },
    })
  },
  getSolanaTransactionFees: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { chainflipSpecific, sellAsset } = step

    if (!chainflipSpecific?.chainflipDepositAddress) throw Error('Missing deposit address')
    if (!chainflipSpecific?.chainflipSwapId) throw Error('Missing swap id')

    const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

    const { fast } = await adapter.getFeeData({
      to: chainflipSpecific.chainflipDepositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: {
        from,
        tokenId: contractAddressOrUndefined(sellAsset.assetId),
      },
    })

    return fast.txFee
  },
  checkTradeStatus: async ({ config, swap }) => {
    const chainflipSwapId = swap?.metadata.chainflipSwapId
    if (!chainflipSwapId) throw Error(`chainflipSwapId is required`)

    const brokerUrl = config.VITE_CHAINFLIP_API_URL
    const apiKey = config.VITE_CHAINFLIP_API_KEY

    const maybeStatusResponse = await chainflipService.get<ChainFlipStatus>(
      `${brokerUrl}/status-by-id?apiKey=${apiKey}&swapId=${chainflipSwapId}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        // assume the swap is not yet seen on that call
        message: ChainflipStatusMessage.WaitingForDeposit,
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
