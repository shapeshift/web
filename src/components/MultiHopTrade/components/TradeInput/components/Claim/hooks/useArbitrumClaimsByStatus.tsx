import type { ChildToParentMessageReader, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import { ChildToParentMessageStatus, ChildTransactionReceipt } from '@arbitrum/sdk'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { arbitrumChainId, ethAssetId, ethChainId, toAccountId } from '@shapeshiftoss/caip'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Query } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ClaimStatus } from '@/components/ClaimRow/types'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertUnreachable } from '@/lib/utils'
import {
  selectArbitrumWithdrawTxs,
  selectAssetById,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import type { Tx } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from '@/state/store'

// Arbitrum's challenge period; the claim can open up to an hour later while an assertion posts
const ARBITRUM_CHALLENGE_PERIOD_MS = 6.4 * 24 * 60 * 60 * 1000

export const getArbitrumClaimableAt = (withdrawTimeMs: number): number =>
  withdrawTimeMs + ARBITRUM_CHALLENGE_PERIOD_MS

type ClaimStatusResult = {
  event: ChildToParentTransactionEvent
  message: ChildToParentMessageReader
  status: ChildToParentMessageStatus
}

export type ClaimDetails = Omit<ClaimStatusResult, 'status'> & {
  accountId: AccountId
  amountCryptoBaseUnit: string
  assetId: string
  description: string
  destinationAddress: string
  destinationAssetId: AssetId
  destinationChainId: ChainId
  destinationExplorerTxLink: string
  tx: Tx
}

type ClaimsByStatus = Record<ClaimStatus, ClaimDetails[]>

export const useArbitrumClaimsByStatus = (props?: { skip?: boolean }) => {
  const translate = useTranslate()

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const arbitrumWithdrawTxs = useAppSelector(selectArbitrumWithdrawTxs)
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)

  const {
    state: { isLoadingLocalWallet, modal, isConnected },
  } = useWallet()

  const skip = useMemo(() => {
    // consumer says we should skip so we skip
    if (props?.skip) return true

    return !isConnected || portfolioLoadingStatus === 'loading' || modal || isLoadingLocalWallet
  }, [isConnected, portfolioLoadingStatus, modal, isLoadingLocalWallet, props?.skip])

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const claimStatuses = useQueries({
    queries: arbitrumWithdrawTxs.map(tx => {
      return {
        queryKey: ['claimStatus', { txid: tx.txid }],
        queryFn: async (): Promise<ClaimStatusResult> => {
          const receipt = await l2Provider.getTransactionReceipt(tx.txid)
          const l2Receipt = new ChildTransactionReceipt(receipt)
          const events = l2Receipt.getChildToParentEvents()
          const messages = await l2Receipt.getChildToParentMessages(l1Provider)
          const event = events[0]
          const message = messages[0]
          const status = await message.status(l2Provider)
          return {
            event,
            message,
            status,
          }
        },
        select: ({ event, message, status }: ClaimStatusResult) => {
          const claimStatus = (() => {
            switch (status) {
              case ChildToParentMessageStatus.CONFIRMED:
                return ClaimStatus.Available
              case ChildToParentMessageStatus.EXECUTED:
                return ClaimStatus.Complete
              case ChildToParentMessageStatus.UNCONFIRMED:
                return ClaimStatus.Pending
              default:
                assertUnreachable(status)
            }
          })()
          return {
            tx,
            event,
            message,
            claimStatus,
          }
        },
        // Periodically refetch until the status is known to be ChildToParentMessageStatus.EXECUTED
        refetchInterval: (latestData: Query<ClaimStatusResult>) =>
          latestData?.state?.data?.status === ChildToParentMessageStatus.EXECUTED ? false : 60_000,
        enabled: !skip,
        staleTime: Infinity,
        gcTime: Infinity,
      }
    }),
  })

  const claimsByStatus = useMemo(() => {
    return claimStatuses.reduce<ClaimsByStatus>(
      (prev, { data }) => {
        if (!data) return prev
        if (!ethAsset) return prev
        if (!data.tx.transfers.length) return prev
        if (data.tx.data?.parser === 'arbitrumBridge') {
          if (!data.tx.data.value) return prev
          if (!data.tx.data.destinationAddress) return prev
          if (!data.tx.data.destinationAssetId) return prev
          prev[data.claimStatus].push({
            tx: data.tx,
            accountId: toAccountId({
              chainId: arbitrumChainId,
              account: data.tx.pubkey,
            }),
            amountCryptoBaseUnit: data.tx.data.value,
            destinationAddress: data.tx.data.destinationAddress,
            destinationAssetId: data.tx.data.destinationAssetId,
            destinationChainId: ethChainId,
            destinationExplorerTxLink: ethAsset.explorerTxLink,
            assetId: data.tx.transfers[0].assetId,
            event: data.event,
            message: data.message,
            description: translate('bridge.arbitrum.description'),
          })
        }
        return prev
      },
      {
        [ClaimStatus.Pending]: [],
        [ClaimStatus.Available]: [],
        [ClaimStatus.Complete]: [],
      },
    )
  }, [ethAsset, claimStatuses, translate])

  return {
    claimsByStatus,
    isLoading: claimStatuses.some(claimStatus => claimStatus.isLoading),
  }
}
