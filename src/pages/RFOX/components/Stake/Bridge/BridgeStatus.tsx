import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'

import type { MultiStepStatusStep } from '../../Shared/SharedMultiStepStatus'
import { SharedMultiStepStatus } from '../../Shared/SharedMultiStepStatus'
import { StakeRoutePaths } from '../types'
import { useRfoxBridge } from './hooks/useRfoxBridge'
import type { RfoxBridgeQuote } from './types'
import { BridgeRoutePaths, type BridgeRouteProps } from './types'

type BridgeStatusProps = {
  confirmedQuote: RfoxBridgeQuote
}
export const BridgeStatus: React.FC<BridgeRouteProps & BridgeStatusProps> = ({
  confirmedQuote,
}) => {
  const translate = useTranslate()
  const history = useHistory()

  const {
    sellAsset,
    buyAsset,
    bridgeAmountCryptoPrecision,
    handleBridge,
    serializedL1TxIndex,
    serializedL2TxIndex,
  } = useRfoxBridge({ confirmedQuote })

  const handleContinue = useCallback(() => {
    history.push(StakeRoutePaths.Confirm)
  }, [history])

  const handleGoBack = useCallback(() => {
    history.push({ pathname: BridgeRoutePaths.Confirm, state: confirmedQuote })
  }, [confirmedQuote, history])

  const steps: MultiStepStatusStep[] = useMemo(() => {
    if (!(sellAsset && buyAsset)) return []

    return [
      {
        asset: sellAsset,
        headerCopy: (
          <Amount.Crypto
            prefix={translate('common.send')}
            value={bridgeAmountCryptoPrecision}
            symbol={sellAsset.symbol}
          />
        ),
        isActionable: true,
        onSignAndBroadcast: handleBridge,
        serializedTxIndex: serializedL1TxIndex,
      },
      {
        asset: buyAsset,
        headerCopy: translate('RFOX.bridgeFunds'),
        isActionable: false,
        serializedTxIndex: serializedL2TxIndex,
      },
    ]
  }, [
    sellAsset,
    buyAsset,
    translate,
    bridgeAmountCryptoPrecision,
    handleBridge,
    serializedL1TxIndex,
    serializedL2TxIndex,
  ])

  return (
    <SharedMultiStepStatus
      onBack={handleGoBack}
      confirmedQuote={confirmedQuote}
      onContinue={handleContinue}
      steps={steps}
    />
  )
}
