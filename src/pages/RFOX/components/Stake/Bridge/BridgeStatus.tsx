import { Text } from '@chakra-ui/react'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { MultiStepStatusStep } from '../../Shared/SharedMultiStepStatus'
import { SharedMultiStepStatus } from '../../Shared/SharedMultiStepStatus'
import { StakeRoutePaths } from '../types'
import { useRfoxBridge } from './hooks/useRfoxBridge'
import type { BridgeRouteProps, RfoxBridgeQuote } from './types'
import { BridgeRoutePaths } from './types'

import { Amount } from '@/components/Amount/Amount'

type BridgeStatusProps = {
  confirmedQuote: RfoxBridgeQuote
}
export const BridgeStatus: React.FC<BridgeRouteProps & BridgeStatusProps> = ({
  confirmedQuote,
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const {
    sellAsset,
    buyAsset,
    bridgeAmountCryptoPrecision,
    handleBridge,
    serializedL1TxIndex,
    serializedL2TxIndex,
  } = useRfoxBridge({ confirmedQuote })

  const handleContinue = useCallback(() => {
    navigate(StakeRoutePaths.Confirm)
  }, [navigate])

  const handleGoBack = useCallback(() => {
    navigate(BridgeRoutePaths.Confirm, { state: { state: confirmedQuote } })
  }, [confirmedQuote, navigate])

  const handleSignAndBroadcast = useCallback(async () => {
    if (!sellAsset) return

    return await handleBridge()
  }, [handleBridge, sellAsset])

  const steps: MultiStepStatusStep[] = useMemo(() => {
    if (!(sellAsset && buyAsset)) return []

    return [
      {
        asset: sellAsset,
        header: (
          <Amount.Crypto
            prefix={translate('common.send')}
            value={bridgeAmountCryptoPrecision}
            maximumFractionDigits={2}
            symbol={sellAsset.symbol}
          />
        ),
        isActionable: true,
        onSignAndBroadcast: handleSignAndBroadcast,
        serializedTxIndex: serializedL1TxIndex,
      },
      {
        asset: buyAsset,
        header: <Text>{translate('RFOX.bridgeFunds')}</Text>,
        isActionable: false,
        serializedTxIndex: serializedL2TxIndex,
      },
    ]
  }, [
    sellAsset,
    buyAsset,
    translate,
    bridgeAmountCryptoPrecision,
    serializedL1TxIndex,
    serializedL2TxIndex,
    handleSignAndBroadcast,
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
