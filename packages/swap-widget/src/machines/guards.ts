import type { SwapMachineContext } from './types'

export const isExactOutput = (context: SwapMachineContext): boolean => !!context.buyAmountBaseUnit

export const hasValidInput = (context: SwapMachineContext): boolean => {
  if (!context.sellAsset || !context.buyAsset) return false

  const amountBaseUnit = isExactOutput(context)
    ? context.buyAmountBaseUnit
    : context.sellAmountBaseUnit

  return !!amountBaseUnit && amountBaseUnit !== '0'
}

export const canRetry = (context: SwapMachineContext): boolean => context.retryCount < 3
