import type { ChildToParentMessageReader, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import {
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
  getArbitrumNetwork,
} from '@arbitrum/sdk'
import { Outbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Outbox__factory'
import { BoldRollupUserLogic__factory } from '@arbitrum/sdk/dist/lib/abi-bold/factories/BoldRollupUserLogic__factory'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { arbitrumChainId, ethAssetId, ethChainId, toAccountId } from '@shapeshiftoss/caip'
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

// Confirmations can run behind the challenge period, so the observed lag extends the estimate
export const getArbitrumClaimableAt = (withdrawTimeMs: number, confirmationLagMs = 0): number =>
  withdrawTimeMs + Math.max(ARBITRUM_CHALLENGE_PERIOD_MS, confirmationLagMs)

type ConfirmedChildBlock = {
  number: number
  confirmationLagMs: number
}

type EthersV5Provider = ReturnType<typeof getEthersV5Provider>

// Every withdraw at or below the latest confirmed assertion's child block is claimable. Reading it
// directly avoids the sdk's status scan, which walks every assertion since the last confirmation
// and exceeds our rpc's eth_getLogs block range for unconfirmed withdraws.
const getConfirmedChildBlock = async (
  l1Provider: EthersV5Provider,
  l2Provider: EthersV5Provider,
): Promise<ConfirmedChildBlock> => {
  const network = await getArbitrumNetwork(l2Provider)
  const rollup = BoldRollupUserLogic__factory.connect(network.ethBridge.rollup, l1Provider)
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

  const claimStatuses = useQueries({
    queries: arbitrumWithdrawTxs.map(tx => {
      return {
        queryKey: ['claimStatus', { txid: tx.txid }],
        queryFn: async (): Promise<ClaimStatusResult> => {
          // A withdraw's message never changes, so it is fetched once
          const { blockNumber, event, message } = await queryClient.fetchQuery({
            queryKey: ['arbitrumClaimMessage', { txid: tx.txid }],
            queryFn: () => getClaimMessage(tx.txid, l1Provider, l2Provider),
            staleTime: Infinity,
            gcTime: Infinity,
          })

          // Shared by every withdraw in the same poll
          const confirmedChildBlock = await queryClient.fetchQuery({
            queryKey: ['arbitrumConfirmedChildBlock'],
            queryFn: () => getConfirmedChildBlock(l1Provider, l2Provider),
            staleTime: 30_000,
          })

          const status = await (async () => {
            if (blockNumber > confirmedChildBlock.number) {
              return ChildToParentMessageStatus.UNCONFIRMED
            }

            const network = await getArbitrumNetwork(l2Provider)
            const outbox = Outbox__factory.connect(network.ethBridge.outbox, l1Provider)
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
