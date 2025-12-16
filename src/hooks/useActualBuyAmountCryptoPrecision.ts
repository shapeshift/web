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
      console.log('[SecondClassExecution] Query starting:', {
        buyTxHash: swap?.buyTxHash,
        sellTxHash: swap?.sellTxHash,
        buyAssetChainId: swap?.buyAsset?.chainId,
        sellAssetChainId: swap?.sellAsset?.chainId,
        buyAssetId: swap?.buyAsset?.assetId,
        buyAccountId: swap?.buyAccountId,
        sellAccountId: swap?.sellAccountId,
      })

      if (!swap?.buyTxHash || !swap?.buyAsset || !swap?.buyAccountId) {
        console.log('[SecondClassExecution] Missing required data, returning undefined')
        return undefined
      }

      try {
        const chainAdapterManager = getChainAdapterManager()
        const adapter = chainAdapterManager.get(swap.buyAsset.chainId)

        console.log('[SecondClassExecution] Adapter retrieved:', {
          chainId: swap.buyAsset.chainId,
          adapterType: adapter?.constructor.name,
          hasAdapter: !!adapter,
        })

        if (!adapter) {
          console.log('[SecondClassExecution] No adapter found for chain')
          return undefined
        }

        const { account: address } = fromAccountId(swap.buyAccountId)
        console.log('[SecondClassExecution] Parsing transaction:', {
          txHash: swap.buyTxHash,
          address,
          accountId: swap.buyAccountId,
        })

        const parsedTx = await adapter.parseTx(swap.buyTxHash, address)

        console.log('[SecondClassExecution] Transaction parsed:', {
          txid: parsedTx.txid,
          transfersCount: parsedTx.transfers.length,
          transfers: parsedTx.transfers.map(t => ({
            type: t.type,
            assetId: t.assetId,
            value: t.value,
            token: t.token?.symbol,
          })),
        })

        const receiveTransfer = parsedTx.transfers.find(
          transfer =>
            transfer.type === TransferType.Receive && transfer.assetId === swap.buyAsset.assetId,
        )

        console.log('[SecondClassExecution] Transfer search result:', {
          found: !!receiveTransfer,
          receiveTransfer: receiveTransfer
            ? {
                type: receiveTransfer.type,
                assetId: receiveTransfer.assetId,
                value: receiveTransfer.value,
                token: receiveTransfer.token?.symbol,
              }
            : null,
          searchCriteria: {
            expectedType: TransferType.Receive,
            expectedAssetId: swap.buyAsset.assetId,
          },
          allAssetIds: parsedTx.transfers.map(t => t.assetId),
        })

        return receiveTransfer?.value
      } catch (error) {
        console.error('[SecondClassExecution] Error during query:', {
          error,
          buyTxHash: swap?.buyTxHash,
          buyAssetChainId: swap?.buyAsset?.chainId,
        })
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
    if (swap?.actualBuyAmountCryptoBaseUnit && swap?.buyAsset) {
      return fromBaseUnit(swap.actualBuyAmountCryptoBaseUnit, swap.buyAsset.precision)
    }

    if (secondClassChainActualBuyAmount && swap?.buyAsset) {
      return fromBaseUnit(secondClassChainActualBuyAmount, swap.buyAsset.precision)
    }

    if (!tx?.transfers?.length || !swap?.buyAsset) return undefined

    const receiveTransfer = tx.transfers.find(
      transfer =>
        transfer.type === TransferType.Receive && transfer.assetId === swap.buyAsset.assetId,
    )

    return receiveTransfer?.value
      ? fromBaseUnit(receiveTransfer.value, swap.buyAsset.precision)
      : undefined
  }, [tx, swap, secondClassChainActualBuyAmount])

  return actualBuyAmountCryptoPrecision
}
