import type { ChildToParentMessageReader, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import {
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
  getArbitrumNetwork,
} from '@arbitrum/sdk'
import { Outbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Outbox__factory'
import { BoldRollupUserLogic__factory } from '@arbitrum/sdk/dist/lib/abi-bold/factories/BoldRollupUserLogic__factory'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ethAssetId,
  ethChainId,
  fromChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Query } from '@tanstack/react-query'
import { useQueries, useQueryClient } from '@tanstack/react-query'
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

// Confirmations running past the challenge period extend the estimate by the observed lag
export const getArbitrumClaimableAt = (withdrawTimeMs: number, confirmationLagMs = 0): number =>
  withdrawTimeMs + Math.max(ARBITRUM_CHALLENGE_PERIOD_MS, confirmationLagMs)

type ConfirmedChildBlock = {
  number: number
  confirmationLagMs: number
}

type EthersV5Provider = ReturnType<typeof getEthersV5Provider>

export const arbitrumNetwork = getArbitrumNetwork(
  Number(fromChainId(arbitrumChainId).chainReference),
)

const CONFIRMED_CHILD_BLOCK_QUERY_KEY = ['arbitrumConfirmedChildBlock']

// Withdraws at or below this block are claimable; the sdk's own status scan exceeds our rpc's log range
const getConfirmedChildBlock = async (
  l1Provider: EthersV5Provider,
  l2Provider: EthersV5Provider,
  previous: ConfirmedChildBlock | undefined,
): Promise<ConfirmedChildBlock> => {
  const rollup = BoldRollupUserLogic__factory.connect(arbitrumNetwork.ethBridge.rollup, l1Provider)
  const latestConfirmed = await rollup.latestConfirmed()
  const createdAtBlock = (await rollup.getAssertion(latestConfirmed)).createdAtBlock.toNumber()

  const [assertionCreated] = await rollup.queryFilter(
    rollup.filters.AssertionCreated(latestConfirmed),
    createdAtBlock,
    createdAtBlock,
  )
  if (!assertionCreated) throw new Error(`AssertionCreated not found for ${latestConfirmed}`)

  const [blockHash] = assertionCreated.args.assertion.afterState.globalState.bytes32Vals
  const block = await l2Provider.getBlock(blockHash)
  if (!block) throw new Error(`Confirmed child block ${blockHash} not found`)

  // Lag is measured when a confirmation is first seen so the estimate holds until the next one
  if (previous?.number === block.number) return previous

  return { number: block.number, confirmationLagMs: Date.now() - block.timestamp * 1000 }
}

type ClaimMessage = {
  blockNumber: number
  event: Extract<ChildToParentTransactionEvent, { position: unknown }>
  message: ChildToParentMessageReader
}

const getClaimMessage = async (
  txid: string,
  l1Provider: EthersV5Provider,
  l2Provider: EthersV5Provider,
): Promise<ClaimMessage> => {
  const receipt = await l2Provider.getTransactionReceipt(txid)
  const l2Receipt = new ChildTransactionReceipt(receipt)
  const [event] = l2Receipt.getChildToParentEvents()
  const [message] = await l2Receipt.getChildToParentMessages(l1Provider)
  if (!event || !message) throw new Error(`No withdraw message found for ${txid}`)
  if (!('position' in event)) throw new Error(`Unsupported classic withdraw ${txid}`)

  return { blockNumber: receipt.blockNumber, event, message }
}

type ClaimStatusResult = {
  event: ChildToParentTransactionEvent
  message: ChildToParentMessageReader
  status: ChildToParentMessageStatus
  confirmationLagMs: number
}

export type ClaimDetails = Omit<ClaimStatusResult, 'status' | 'confirmationLagMs'> & {
  accountId: AccountId
  amountCryptoBaseUnit: string
  assetId: string
  claimableAt: number
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
  const queryClient = useQueryClient()

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

  // Shared by every withdraw in the same poll, falling back to the last good block on a failed refresh
  const fetchConfirmedChildBlock = async (): Promise<ConfirmedChildBlock> => {
    const previous = queryClient.getQueryData<ConfirmedChildBlock>(CONFIRMED_CHILD_BLOCK_QUERY_KEY)

    try {
      return await queryClient.fetchQuery({
        queryKey: CONFIRMED_CHILD_BLOCK_QUERY_KEY,
        queryFn: () => getConfirmedChildBlock(l1Provider, l2Provider, previous),
        staleTime: 30_000,
        gcTime: Infinity,
      })
    } catch (error) {
      if (previous) return previous
      throw error
    }
  }

  const claimStatuses = useQueries({
    queries: arbitrumWithdrawTxs.map(tx => {
      return {
        queryKey: ['claimStatus', { txid: tx.txid }],
        queryFn: async (): Promise<ClaimStatusResult> => {
          // Fetched once, a withdraw's message never changes
          const { blockNumber, event, message } = await queryClient.fetchQuery({
            queryKey: ['arbitrumClaimMessage', { txid: tx.txid }],
            queryFn: () => getClaimMessage(tx.txid, l1Provider, l2Provider),
            staleTime: Infinity,
            gcTime: Infinity,
          })

          const confirmedChildBlock = await fetchConfirmedChildBlock()

          const status = await (async () => {
            if (blockNumber > confirmedChildBlock.number) {
              return ChildToParentMessageStatus.UNCONFIRMED
            }

            const outbox = Outbox__factory.connect(arbitrumNetwork.ethBridge.outbox, l1Provider)
            const isSpent = await outbox.isSpent(event.position)

            return isSpent
              ? ChildToParentMessageStatus.EXECUTED
              : ChildToParentMessageStatus.CONFIRMED
          })()

          return {
            event,
            message,
            status,
            confirmationLagMs: confirmedChildBlock.confirmationLagMs,
          }
        },
        select: ({ event, message, status, confirmationLagMs }: ClaimStatusResult) => {
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
            confirmationLagMs,
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
            claimableAt: getArbitrumClaimableAt(data.tx.blockTime * 1000, data.confirmationLagMs),
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
  }
}
