import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { SwapperName, TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { getDaemonUrl, getInboundAddressDataForChain } from '@shapeshiftoss/swapper'
import { isToken } from '@shapeshiftoss/utils'
import { erc20Abi, getAddress } from 'viem'

import { getServerConfig } from '../../config'
import { extractTransactionData } from './extractTransactionData'
import type {
  ApiQuoteStep,
  ApprovalInfo,
  DepositContextResult,
  DepositExtractionContext,
  ThorLikeQuote,
} from './types'

export const fetchInboundAddress = async (
  assetId: string,
  swapperName: SwapperName,
): Promise<string | undefined> => {
  const config = getServerConfig()
  const daemonUrl = getDaemonUrl(config, swapperName)

  const result = await getInboundAddressDataForChain(daemonUrl, assetId, false, swapperName)

  if (result.isOk()) {
    return result.unwrap().address
  }

  console.error(
    `Failed to fetch inbound address for ${assetId} (${swapperName}):`,
    result.unwrapErr(),
  )
  return undefined
}

export const getEvmChainIdNumber = (chainId: string): number => {
  const { chainReference } = fromChainId(chainId)
  return parseInt(chainReference, 10)
}

export const buildApprovalInfo = async (
  step: TradeQuoteStep,
  owner: string,
): Promise<ApprovalInfo> => {
  const { chainNamespace } = fromChainId(step.sellAsset.chainId)

  const needsAllowanceCheck =
    chainNamespace === CHAIN_NAMESPACE.Evm &&
    isToken(step.sellAsset.assetId) &&
    Boolean(step.allowanceContract)

  if (!needsAllowanceCheck) return { isRequired: false, spender: '' }

  const spender = step.allowanceContract
  const client = viemClientByChainId[step.sellAsset.chainId]

  const allowance = await client.readContract({
    address: getAddress(fromAssetId(step.sellAsset.assetId).assetReference),
    abi: erc20Abi,
    functionName: 'allowance',
    args: [getAddress(owner), getAddress(spender)],
  })

  const requiredAmount = BigInt(step.sellAmountIncludingProtocolFeesCryptoBaseUnit)

  return { isRequired: allowance < requiredAmount, spender }
}

// Transform quote step to API format
export const transformQuoteStep = (
  step: TradeQuoteStep,
  context: DepositExtractionContext = {},
): ApiQuoteStep => ({
  sellAsset: step.sellAsset,
  buyAsset: step.buyAsset,
  sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
  allowanceContract: step.allowanceContract,
  estimatedExecutionTimeMs: step.estimatedExecutionTimeMs,
  source: step.source,
  transactionData: extractTransactionData(step, context),
})

export const resolveDepositContext = async (
  quote: TradeQuote,
  firstStep: TradeQuoteStep,
  swapperName: SwapperName,
): Promise<DepositContextResult> => {
  const thorLikeQuote = quote as ThorLikeQuote
  if (!thorLikeQuote.memo) return { ok: true, context: {} }

  const { chainNamespace } = fromChainId(firstStep.sellAsset.chainId)
  if (chainNamespace !== 'bip122' && chainNamespace !== 'cosmos') return { ok: true, context: {} }

  const depositAddress = await fetchInboundAddress(firstStep.sellAsset.assetId, swapperName)
  if (!depositAddress) {
    return {
      ok: false,
      statusCode: 503,
      error: {
        error: 'Failed to fetch deposit address for this swap',
        code: 'DEPOSIT_ADDRESS_UNAVAILABLE',
      },
    }
  }

  return { ok: true, context: { memo: thorLikeQuote.memo, depositAddress } }
}
