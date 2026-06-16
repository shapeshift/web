import { useEffect } from 'react'

import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { computeSellFiatSyncAction } from '../utils/fiatConversion'

// Keeps the crypto sell amount in sync with the entered fiat amount when the USD price
// arrives asynchronously or the sell asset changes while in fiat mode. The machine can't
// do this itself because it has no access to market price.
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
