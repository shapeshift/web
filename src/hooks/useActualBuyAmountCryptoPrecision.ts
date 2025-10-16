import { thorchainChainId } from '@shapeshiftoss/caip'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'

import { fromBaseUnit } from '@/lib/math'
import { selectTxByFilter } from '@/state/slices/selectors'
import { selectSwapById } from '@/state/slices/swapSlice/selectors'
import { useAppSelector } from '@/state/store'

export const useActualBuyAmountCryptoPrecision = (
  swapId: string | undefined,
): string | undefined => {
  const swap = useAppSelector(state => selectSwapById(state, { swapId: swapId ?? '' }))

  const tx = useAppSelector(state =>
    selectTxByFilter(state, {
      accountId: swap?.buyAccountId ?? '',
      txHash: swap?.buyTxHash ?? '',
      // For THOR chain buys (i.e RUNE, RUJI, TCY and other potential non-fee native AssetIds we add in the future)
      // accountId and txHash won't be enough of discriminators to narrow to one Tx, since
      // both the inbound and outbound Tx will share the same tx Hash *and* the same AccountId
      // So we use the OUT: memo discriminator to ensure we select the outbound Tx, not the inbound
      memo: swap?.buyAsset?.chainId === thorchainChainId ? 'OUT:' : undefined,
    }),
  )

  const actualBuyAmountCryptoPrecision = useMemo(() => {
    if (tx?.transfers?.length === undefined || tx.transfers.length === 0 || !swap?.buyAsset)
      return undefined

    const receiveTransfer = tx.transfers.find(
      transfer =>
        transfer.type === TransferType.Receive && transfer.assetId === swap.buyAsset.assetId,
    )

    return receiveTransfer?.value
      ? fromBaseUnit(receiveTransfer.value, swap.buyAsset.precision)
      : undefined
  }, [tx, swap])

  return actualBuyAmountCryptoPrecision
}
