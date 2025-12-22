import { fromAccountId, thorchainChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { SECOND_CLASS_CHAINS } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
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

  const { data: secondClassChainActualBuyAmount } = useQuery({
    queryKey: ['secondClassChainExecutionPrice', swap?.buyTxHash, swap?.buyAsset?.chainId],
    queryFn: async () => {
      if (!swap?.buyTxHash || !swap?.buyAsset || !swap?.buyAccountId) return undefined

      try {
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(swap.buyAsset.chainId)

        if (!adapter) return undefined

        const { account: address } = fromAccountId(swap.buyAccountId)
        const parsedTx = await adapter.parseTx(swap.buyTxHash, address)

        const receiveTransfer = parsedTx.transfers.find(
          transfer =>
            transfer.type === TransferType.Receive && transfer.assetId === swap.buyAsset.assetId,
        )

        return receiveTransfer?.value
      } catch (error) {
        return undefined
      }
    },
    enabled: Boolean(
      swap?.buyTxHash &&
        swap?.buyAsset?.chainId &&
        swap?.buyAccountId &&
        SECOND_CLASS_CHAINS.includes(swap.buyAsset.chainId as KnownChainIds),
    ),
    staleTime: Infinity, // Transaction data never changes
    gcTime: Infinity,
  })

  const actualBuyAmountCryptoPrecision = useMemo(() => {
    console.log(
      '[🎯 Amount Resolution] Starting:',
      JSON.stringify(
        {
          swapId,
          fromSwap: swap?.actualBuyAmountCryptoBaseUnit,
          fromSecondClass: secondClassChainActualBuyAmount,
          fromTxHistory: tx?.transfers?.find(
            t => t.type === TransferType.Receive && t.assetId === swap?.buyAsset.assetId,
          )?.value,
          hasTx: !!tx,
          hasSwap: !!swap,
        },
        null,
        2,
      ),
    )

    let actualBuyAmountCryptoPrecision: string | undefined = undefined
    let source = 'undefined'

    if (swap?.actualBuyAmountCryptoBaseUnit && swap?.buyAsset) {
      actualBuyAmountCryptoPrecision = fromBaseUnit(
        swap.actualBuyAmountCryptoBaseUnit,
        swap.buyAsset.precision,
      )
      source = 'swap.actualBuyAmountCryptoBaseUnit'
    } else if (secondClassChainActualBuyAmount && swap?.buyAsset) {
      actualBuyAmountCryptoPrecision = fromBaseUnit(
        secondClassChainActualBuyAmount,
        swap.buyAsset.precision,
      )
      source = 'secondClassChainActualBuyAmount'
    } else if (tx?.transfers?.length && swap?.buyAsset) {
      const receiveTransfer = tx.transfers.find(
        transfer =>
          transfer.type === TransferType.Receive && transfer.assetId === swap.buyAsset.assetId,
      )

      if (receiveTransfer?.value) {
        actualBuyAmountCryptoPrecision = fromBaseUnit(
          receiveTransfer.value,
          swap.buyAsset.precision,
        )
        source = 'txHistory'
      }
    }

    console.log(
      '[🎯 Amount Resolution] Resolved:',
      JSON.stringify(
        {
          swapId,
          resolved: actualBuyAmountCryptoPrecision,
          source,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    return actualBuyAmountCryptoPrecision
  }, [tx, swap, secondClassChainActualBuyAmount, swapId])

  return actualBuyAmountCryptoPrecision
}
