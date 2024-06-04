import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { SharedMultiStepStatus } from '../Shared/SharedMultiStepStatus'
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

  const handleGoBack = useCallback(() => {
    // TODO(gomes): route back to stake
    history.push(BridgeRoutePaths.Confirm)
  }, [history])

  const sellAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.sellAssetId))
  const buyAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.buyAssetId))

  const bridgeAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const steps = useMemo(() => {
    if (!(sellAsset && buyAsset)) return []

    const handleSignAndBroadcast = () => {
      return Promise.resolve('0xfoobar')
    }

    return [
      {
        asset: sellAsset,
        headerCopy: translate('common.sendAmountAsset', {
          amount: bridgeAmountCryptoPrecision,
          asset: sellAsset.symbol,
        }),
        isActionable: true,
        onSignAndBroadcast: handleSignAndBroadcast,
        serializedTxIndex: undefined,
      },
      {
        asset: buyAsset,
        headerCopy: 'Bridge Funds',
        isActionable: false,
        serializedTxIndex: undefined,
      },
    ]
  }, [bridgeAmountCryptoPrecision, buyAsset, sellAsset, translate])

  return (
    <SharedMultiStepStatus onBack={handleGoBack} confirmedQuote={confirmedQuote} steps={steps} />
  )
}
