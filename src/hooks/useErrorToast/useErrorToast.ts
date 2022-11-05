import { useToast } from '@chakra-ui/react'
import { SwapErrorTypes } from '@keepkey/swapper'
import { get, isError } from 'lodash'
import { useTranslate } from 'react-polyglot'
import { logger } from 'lib/logger'

// TODO support more error types (non swapper errors)
export const ErrorTranslationMap: Record<string, string> = {
  [SwapErrorTypes.ALLOWANCE_REQUIRED_FAILED]: 'trade.errors.allowanceRequiredFailed',
  [SwapErrorTypes.CHECK_APPROVAL_FAILED]: 'trade.errors.checkApprovalNeededFailed',
  [SwapErrorTypes.APPROVE_INFINITE_FAILED]: 'trade.errors.approveInfiniteFailed',
  [SwapErrorTypes.BUILD_TRADE_FAILED]: 'trade.errors.buildTradeFailed',
  [SwapErrorTypes.EXECUTE_TRADE_FAILED]: 'trade.errors.executeTradeFailed',
  [SwapErrorTypes.GRANT_ALLOWANCE_FAILED]: 'trade.errors.grantAllowanceFailed',
  [SwapErrorTypes.MANAGER_ERROR]: 'trade.errors.generalError',
  [SwapErrorTypes.MIN_MAX_FAILED]: 'trade.errors.minMaxError',
  [SwapErrorTypes.SIGN_AND_BROADCAST_FAILED]: 'trade.errors.broadcastFailed',
  [SwapErrorTypes.TRADE_QUOTE_FAILED]: 'trade.errors.quoteFailed',
  [SwapErrorTypes.TRADE_QUOTE_AMOUNT_TOO_SMALL]: 'trade.errors.amountTooSmall',
  [SwapErrorTypes.TRADE_QUOTE_INPUT_LOWER_THAN_FEES]: 'trade.errors.sellAmountDoesNotCoverFee',
  [SwapErrorTypes.UNSUPPORTED_PAIR]: 'trade.errors.unsupportedPair',
  [SwapErrorTypes.USD_RATE_FAILED]: 'trade.errors.rateError',
  [SwapErrorTypes.UNSUPPORTED_CHAIN]: 'trade.errors.unsupportedChain',
  [SwapErrorTypes.VALIDATION_FAILED]: 'trade.errors.generalError',
  [SwapErrorTypes.RESPONSE_ERROR]: 'trade.errors.generalError',
  [SwapErrorTypes.TRADE_FAILED]: 'trade.errors.tradeFailed',
}

const getTranslationFromError = (error: unknown) => {
  if (isError(error)) {
    return ErrorTranslationMap[get(error, 'code')] ?? 'common.generalError'
  }
  return 'common.generalError'
}

const moduleLogger = logger.child({ namespace: ['Error'] })

export const useErrorHandler = () => {
  const toast = useToast()
  const translate = useTranslate()

  const showErrorToast = (error: unknown) => {
    const description = translate(getTranslationFromError(error))

    moduleLogger.error(error, description)

    toast({
      title: translate('trade.errors.title'),
      description,
      status: 'error',
      duration: 9000,
      isClosable: true,
      position: 'top-right',
    })
  }

  return {
    showErrorToast,
  }
}
