import { useToast } from '@chakra-ui/react'
import { get, isError } from 'lodash'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { SwapErrorType } from 'lib/swapper/api'

// TODO support more error types (non swapper errors)
export const ErrorTranslationMap: Record<string, string> = {
  [SwapErrorType.BUILD_TRADE_FAILED]: 'trade.errors.buildTradeFailed',
  [SwapErrorType.EXECUTE_TRADE_FAILED]: 'trade.errors.executeTradeFailed',
  [SwapErrorType.MANAGER_ERROR]: 'trade.errors.generalError',
  [SwapErrorType.MIN_MAX_FAILED]: 'trade.errors.minMaxError',
  [SwapErrorType.SIGN_AND_BROADCAST_FAILED]: 'trade.errors.broadcastFailed',
  [SwapErrorType.TRADE_QUOTE_FAILED]: 'trade.errors.quoteFailed',
  [SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL]: 'trade.errors.amountTooSmall',
  [SwapErrorType.TRADE_QUOTE_INPUT_LOWER_THAN_FEES]: 'trade.errors.sellAmountDoesNotCoverFee',
  [SwapErrorType.UNSUPPORTED_PAIR]: 'trade.errors.unsupportedPair',
  [SwapErrorType.USD_RATE_FAILED]: 'trade.errors.rateError',
  [SwapErrorType.UNSUPPORTED_CHAIN]: 'trade.errors.unsupportedChain',
  [SwapErrorType.VALIDATION_FAILED]: 'trade.errors.generalError',
  [SwapErrorType.RESPONSE_ERROR]: 'trade.errors.generalError',
  [SwapErrorType.TRADE_FAILED]: 'trade.errors.tradeFailed',
}

const getTranslationFromError = (error: unknown) => {
  if (isError(error)) {
    return ErrorTranslationMap[get(error, 'code')] ?? 'common.generalError'
  }
  return 'common.generalError'
}

export const useErrorHandler = () => {
  const toast = useToast()
  const translate = useTranslate()

  const showErrorToast = useCallback(
    (error: unknown) => {
      const description = translate(getTranslationFromError(error))

      console.error(error)

      toast({
        title: translate('trade.errors.title'),
        description,
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      })
    },
    [toast, translate],
  )

  return {
    showErrorToast,
  }
}
