import type { SwapMachineContext } from './types'

// The mode is the amount that's set rather than a flag, so the two can never disagree
export const isExactOutput = (context: SwapMachineContext): boolean => !!context.buyAmountBaseUnit

export const hasValidInput = (context: SwapMachineContext): boolean => {
  if (!context.sellAsset || !context.buyAsset) return false

  const drivingAmount = isExactOutput(context)
    ? context.buyAmountBaseUnit
    : context.sellAmountBaseUnit

  return !!drivingAmount && drivingAmount !== '0'
}

export const hasQuote = (context: SwapMachineContext): boolean => context.quote !== null

export const isApprovalRequired = (context: SwapMachineContext): boolean => {
  if (context.quote?.approval?.isRequired !== true || context.chainType !== 'evm') return false
  const assetIdParts = context.sellAsset.assetId.split('/')
  const namespace = assetIdParts[1]?.split(':')[0]
  return namespace === 'erc20'
}

export const canRetry = (context: SwapMachineContext): boolean => context.retryCount < 3

export const isEvmChain = (context: SwapMachineContext): boolean => context.chainType === 'evm'

export const isUtxoChain = (context: SwapMachineContext): boolean => context.chainType === 'utxo'

export const isSolanaChain = (context: SwapMachineContext): boolean =>
  context.chainType === 'solana'

export const hasSendAddress = (context: SwapMachineContext): boolean => !!context.sendAddress

export const hasReceiveAddress = (context: SwapMachineContext): boolean => !!context.receiveAddress
