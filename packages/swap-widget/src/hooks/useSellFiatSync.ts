import { useEffect } from 'react'

import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { computeSellFiatSyncAction } from '../utils/fiatConversion'

// Fills in the crypto sell amount from the entered fiat when it's missing — e.g. after a
// sell-asset change clears it — and reverts to crypto entry when the asset has no price. In a
// hook, not the machine, because the conversion needs the market price.
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
