import type { SwapMachineContext } from './types'

export const hasValidInput = (context: SwapMachineContext): boolean => {
  return (
    !!context.sellAsset &&
    !!context.buyAsset &&
    !!context.sellAmountBaseUnit &&
    context.sellAmountBaseUnit !== '0'
  )
}

export const hasQuote = (context: SwapMachineContext): boolean => context.quote !== null

export const isApprovalRequired = (context: SwapMachineContext): boolean => {
  return context.quote?.approval?.isRequired === true && context.chainType === 'evm'
}

export const canRetry = (context: SwapMachineContext): boolean => context.retryCount < 3

export const isEvmChain = (context: SwapMachineContext): boolean => context.chainType === 'evm'

export const isUtxoChain = (context: SwapMachineContext): boolean => context.chainType === 'utxo'

export const isSolanaChain = (context: SwapMachineContext): boolean =>
  context.chainType === 'solana'

export const hasWallet = (context: SwapMachineContext): boolean => !!context.walletAddress

export const hasReceiveAddress = (context: SwapMachineContext): boolean =>
  !!context.effectiveReceiveAddress
