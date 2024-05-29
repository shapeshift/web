import React, { useCallback } from 'react'
import { useHistory } from 'react-router'

import { ShareMultiStepStatus } from '../Shared/SharedMultiStepStatus'
import type { RfoxBridgeQuote } from './types'
import { BridgeRoutePaths, type BridgeRouteProps } from './types'

type BridgeStatusProps = {
  confirmedQuote: RfoxBridgeQuote
}
export const BridgeStatus: React.FC<BridgeRouteProps & BridgeStatusProps> = ({
  confirmedQuote,
}) => {
  const history = useHistory()

  const handleGoBack = useCallback(() => {
    // TODO(gomes): route back to stake
    history.push(BridgeRoutePaths.Confirm)
  }, [history])

  return <ShareMultiStepStatus onBack={handleGoBack} confirmedQuote={confirmedQuote} />
}
