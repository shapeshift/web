import { SwapErrorTypes, SwapError } from '@shapeshiftoss/swapper'
import { useToast } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { logger } from 'lib/logger'

// TODO(ryankk): We probably need to remove some of the messages in 'translations/en/main.json' under 'trade.errors',
// there are a lot that are unused.
const SwapErrorMap = {
  [SwapErrorTypes.ALLOWANCE_REQUIRED_FAILED]: 'trade.errors.allowanceRequiredFailed',
  [SwapErrorTypes.CHECK_APPROVAL_FAILED]: 'trade.errors.checkApprovalNeededFailed',
  [SwapErrorTypes.APPROVE_INFINITE_FAILED]: 'trade.errors.approveInfiniteFailed',
  [SwapErrorTypes.BUILD_TRADE_FAILED]: 'trade.errors.buildTradeFailed',
  [SwapErrorTypes.EXECUTE_TRADE_FAILED]: 'trade.errors.executeTradeFailed',
  [SwapErrorTypes.GRANT_ALLOWANCE_FAILED]: 'trade.errors.buildTradeFailed',
  [SwapErrorTypes.MANAGER_ERROR]: 'trade.errors.buildTradeFailed',
  [SwapErrorTypes.MIN_MAX_FAILED]: 'trade.errors.buildTradeFailed',
  [SwapErrorTypes.SIGN_AND_BROADCAST_FAILED]: 'trade.errors.broadcastFailed',
  [SwapErrorTypes.TRADE_QUOTE_FAILED]: 'trade.errors.quoteFailed',
  [SwapErrorTypes.UNSUPPORTED_PAIR]: 'trade.errors.unsupportedPair',
  [SwapErrorTypes.USD_RATE_FAILED]: 'trade.errors.buildTradeFailed',
  [SwapErrorTypes.UNSUPPORTED_CHAIN]: 'trade.errors.unsupportedPair',
  [SwapErrorTypes.VALIDATION_FAILED]: 'trade.errors.buildTradeFailed',
  [SwapErrorTypes.RESPONSE_ERROR]: 'trade.errors.buildTradeFailed'
}

const moduleLogger = logger.child({ namespace: ['Swapper'] })

export const useSwapperErrors = () => {
  const toast = useToast()
  const translate = useTranslate()

  const handleSwapErrors = (error: SwapError | Error) => {
    const translation =
      error instanceof SwapError ? SwapErrorMap[error.code] : 'trade.errors.quoteFailed' // is this a good default?

    moduleLogger.error(error)

    toast({
      title: translate('trade.errors.title'),
      description: translate(translation),
      status: 'error',
      duration: 9000,
      isClosable: true,
      position: 'top-right'
    })
  }

  return {
    handleSwapErrors
  }
}
