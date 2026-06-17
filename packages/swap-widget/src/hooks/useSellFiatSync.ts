import { useEffect } from 'react'

import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { computeSellFiatSyncAction } from '../utils/fiatConversion'

// Recomputes crypto from the entered fiat once the async price loads — the machine
// can't, having no access to market price.
export const useSellFiatSync = (sellAssetUsdPrice: string | undefined): void => {
  const actorRef = SwapMachineCtx.useActorRef()
  const isSellAmountFiat = SwapMachineCtx.useSelector(s => s.context.isSellAmountFiat)
  const sellAmountFiat = SwapMachineCtx.useSelector(s => s.context.sellAmountFiat)
  const sellAmountBaseUnit = SwapMachineCtx.useSelector(s => s.context.sellAmountBaseUnit)
  const sellPrecision = SwapMachineCtx.useSelector(s => s.context.sellAsset.precision)

  useEffect(() => {
    const action = computeSellFiatSyncAction({
      isSellAmountFiat,
      sellAmountFiat,
      sellAmountBaseUnit,
      sellAssetUsdPrice,
      sellPrecision,
    })
    if (action) actorRef.send(action)
  }, [
    actorRef,
    isSellAmountFiat,
    sellAmountFiat,
    sellAmountBaseUnit,
    sellAssetUsdPrice,
    sellPrecision,
  ])
}
