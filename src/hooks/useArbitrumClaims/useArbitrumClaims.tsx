import type { ChildToParentMessageReader, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import {
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
  getArbitrumNetwork,
} from '@arbitrum/sdk'
import { Outbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Outbox__factory'
import { BoldRollupUserLogic__factory } from '@arbitrum/sdk/dist/lib/abi-bold/factories/BoldRollupUserLogic__factory'
import { ARB1_NITRO_GENESIS_L2_BLOCK } from '@arbitrum/sdk/dist/lib/dataEntities/constants'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { arbitrumChainId, ethChainId, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Query } from '@tanstack/react-query'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertUnreachable } from '@/lib/utils'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectArbitrumWithdrawTxs, selectPortfolioLoadingStatus } from '@/state/slices/selectors'
import type { Tx } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from '@/state/store'

// Arbitrum's challenge period; the claim can open up to an hour later while an assertion posts
const ARBITRUM_CHALLENGE_PERIOD_MS = 6.4 * 24 * 60 * 60 * 1000

// Confirmations running past the challenge period extend the estimate by the observed lag
export const getArbitrumClaimableAt = (withdrawTimeMs: number, confirmationLagMs = 0): number =>
  withdrawTimeMs + Math.max(ARBITRUM_CHALLENGE_PERIOD_MS, confirmationLagMs)

// Assertions post roughly every 300 parent blocks, so the covering one lands well inside this window
const ASSERTION_SCAN_BLOCKS = 1_200
const LOG_RANGE_BLOCKS = 100
const ASSERTION_RETRY_MS = 10 * 60 * 1000
const FALLBACK_BLOCK_TIME_MS = 12_000

type ConfirmedChildBlock = {
  number: number
  confirmationLagMs: number
}

type CoveringAssertion = {
  blockNumber: number
  timestampMs: number
}

// Final once the assertion is found or the whole window has been scanned without it
type AssertionSearch = {
  assertion: CoveringAssertion | undefined
  isFinal: boolean
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

// The first assertion after the withdraw that covers its child block
const findCoveringAssertion = async (
  parentBlockNumber: number,
  childBlockNumber: number,
  l1Provider: EthersV5Provider,
  l2Provider: EthersV5Provider,
): Promise<AssertionSearch> => {
  const rollup = BoldRollupUserLogic__factory.connect(arbitrumNetwork.ethBridge.rollup, l1Provider)
  const windowEndBlock = parentBlockNumber + ASSERTION_SCAN_BLOCKS
  const latestBlock = await l1Provider.getBlockNumber()
  const toBlock = Math.min(windowEndBlock, latestBlock)

  for (let fromBlock = parentBlockNumber; fromBlock <= toBlock; fromBlock += LOG_RANGE_BLOCKS) {
    const logs = await rollup.queryFilter(
      rollup.filters.AssertionCreated(),
      fromBlock,
      Math.min(fromBlock + LOG_RANGE_BLOCKS - 1, toBlock),
    )

    for (const log of logs) {
      const [blockHash] = log.args.assertion.afterState.globalState.bytes32Vals
      const childBlock = await l2Provider.getBlock(blockHash)
      if (!childBlock || childBlock.number < childBlockNumber) continue

      const { timestamp } = await l1Provider.getBlock(log.blockNumber)
      return {
        assertion: { blockNumber: log.blockNumber, timestampMs: timestamp * 1000 },
        isFinal: true,
      }
    }
  }

  // Past the window the lag estimate stands in rather than rescanning
  return { assertion: undefined, isFinal: latestBlock >= windowEndBlock }
}

// The claim opens once the covering assertion's confirm period passes, timed by the observed block rate
const getAssertionClaimableAt = async (
  assertion: CoveringAssertion,
  l1Provider: EthersV5Provider,
): Promise<number> => {
  const latest = await l1Provider.getBlock('latest')
  const elapsedBlocks = latest.number - assertion.blockNumber
  const blockTimeMs =
    elapsedBlocks > 0
      ? (latest.timestamp * 1000 - assertion.timestampMs) / elapsedBlocks
      : FALLBACK_BLOCK_TIME_MS
  const claimableAt = assertion.timestampMs + arbitrumNetwork.confirmPeriodBlocks * blockTimeMs

  // Minute precision keeps the stored estimate from rewriting on every poll
  return Math.round(claimableAt / 60_000) * 60_000
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
  assertionClaimableAt: number | undefined
}

// A withdraw's status in action terms: waiting on its challenge period, claimable, or claimed
export type ClaimDetails = Pick<ClaimStatusResult, 'event' | 'message'> & {
  status: ActionStatus.Initiated | ActionStatus.ClaimAvailable | ActionStatus.Claimed
  accountId: AccountId
  amountCryptoBaseUnit: string
  assetId: string
  claimableAt: number
  destinationAddress: string
  destinationAssetId: AssetId
  destinationChainId: ChainId
  tx: Tx
}

export const useArbitrumClaims = (props?: { skip?: boolean }) => {
  const queryClient = useQueryClient()

  const arbitrumWithdrawTxs = useAppSelector(selectArbitrumWithdrawTxs)
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)

  // Pre-nitro withdraws use the classic outbox, which we can neither track nor claim
  const nitroWithdrawTxs = useMemo(
    () => arbitrumWithdrawTxs.filter(tx => tx.blockHeight >= ARB1_NITRO_GENESIS_L2_BLOCK),
    [arbitrumWithdrawTxs],
  )

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
    queries: nitroWithdrawTxs.map(tx => {
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

          if (blockNumber > confirmedChildBlock.number) {
            // Kept once final, retried until the covering assertion posts
            const { assertion } = await queryClient.fetchQuery({
              queryKey: ['arbitrumClaimAssertion', { txid: tx.txid }],
              queryFn: () =>
                findCoveringAssertion(
                  event.ethBlockNum.toNumber(),
                  blockNumber,
                  l1Provider,
                  l2Provider,
                ),
              staleTime: query => (query.state.data?.isFinal ? Infinity : ASSERTION_RETRY_MS),
              gcTime: Infinity,
            })

            return {
              event,
              message,
              status: ChildToParentMessageStatus.UNCONFIRMED,
              confirmationLagMs: confirmedChildBlock.confirmationLagMs,
              assertionClaimableAt: assertion
                ? await getAssertionClaimableAt(assertion, l1Provider)
                : undefined,
            }
          }

          const outbox = Outbox__factory.connect(arbitrumNetwork.ethBridge.outbox, l1Provider)
          const isSpent = await outbox.isSpent(event.position)

          return {
            event,
            message,
            status: isSpent
              ? ChildToParentMessageStatus.EXECUTED
              : ChildToParentMessageStatus.CONFIRMED,
            confirmationLagMs: confirmedChildBlock.confirmationLagMs,
            assertionClaimableAt: undefined,
          }
        },
        select: (result: ClaimStatusResult) => {
          const status = (() => {
            switch (result.status) {
              case ChildToParentMessageStatus.UNCONFIRMED:
                return ActionStatus.Initiated as const
              case ChildToParentMessageStatus.CONFIRMED:
                return ActionStatus.ClaimAvailable as const
              case ChildToParentMessageStatus.EXECUTED:
                return ActionStatus.Claimed as const
              default:
                assertUnreachable(result.status)
            }
          })()
          return { ...result, tx, status }
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

  const claims = useMemo(
    () =>
      claimStatuses.reduce<ClaimDetails[]>((acc, { data }) => {
        if (!data) return acc
        if (!data.tx.transfers.length) return acc
        if (data.tx.data?.parser !== 'arbitrumBridge') return acc
        if (!data.tx.data.value) return acc
        if (!data.tx.data.destinationAddress) return acc
        if (!data.tx.data.destinationAssetId) return acc

        acc.push({
          status: data.status,
          tx: data.tx,
          accountId: toAccountId({
            chainId: arbitrumChainId,
            account: data.tx.pubkey,
          }),
          amountCryptoBaseUnit: data.tx.data.value,
          destinationAddress: data.tx.data.destinationAddress,
          destinationAssetId: data.tx.data.destinationAssetId,
          destinationChainId: ethChainId,
          assetId: data.tx.transfers[0].assetId,
          claimableAt:
            data.assertionClaimableAt ??
            getArbitrumClaimableAt(data.tx.blockTime * 1000, data.confirmationLagMs),
          event: data.event,
          message: data.message,
        })
        return acc
      }, []),
    [claimStatuses],
  )

  const claimsByTxid = useMemo(
    () =>
      claims.reduce<Record<string, ClaimDetails>>((acc, claim) => {
        acc[claim.tx.txid] = claim
        return acc
      }, {}),
    [claims],
  )

  // Changes only when a claim's status or estimate does, for effects keyed on the claims
  const claimsKey = claims
    .map(claim => `${claim.tx.txid}:${claim.status}:${claim.claimableAt}`)
    .join()

  return {
    claims,
    claimsByTxid,
    claimsKey,
  }
}
